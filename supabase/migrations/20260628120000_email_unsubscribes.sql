-- Unified email suppression list (Chok HaSpam / Amendment 40).
-- One row per unsubscribed recipient, scoped to a store (business_id) OR the
-- Siango platform itself (business_id IS NULL). Captures an OPTIONAL reason for
-- the merchant/admin's insight - the reason is never required from the user, so
-- one-click unsubscribe keeps working without it.

CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE, -- NULL = Siango platform
  email text NOT NULL,
  reason text,                 -- coded reason key (too_many / not_relevant / ...)
  reason_detail text,          -- free text for "אחר"
  source text NOT NULL DEFAULT 'email_link', -- email_link | manual | import
  unsubscribed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- One suppression per (scope, email). COALESCE so platform rows (NULL business)
-- still dedupe by email. Sentinel UUID stands in for "no business".
CREATE UNIQUE INDEX IF NOT EXISTS email_unsubscribes_scope_email_idx
  ON public.email_unsubscribes (
    COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(email)
  );

CREATE INDEX IF NOT EXISTS email_unsubscribes_business_idx
  ON public.email_unsubscribes (business_id, unsubscribed_at DESC);

-- Store owner reads their own suppression list; platform rows (NULL) are admin-only.
DROP POLICY IF EXISTS "Read unsubscribes (owner or admin)" ON public.email_unsubscribes;
CREATE POLICY "Read unsubscribes (owner or admin)"
ON public.email_unsubscribes FOR SELECT TO authenticated
USING (
  (business_id IS NOT NULL AND public.is_business_owner(business_id))
  OR public.has_role(auth.uid(), 'admin')
);

-- Owner/admin can manually add suppressions (manual add / list import).
DROP POLICY IF EXISTS "Insert unsubscribes (owner or admin)" ON public.email_unsubscribes;
CREATE POLICY "Insert unsubscribes (owner or admin)"
ON public.email_unsubscribes FOR INSERT TO authenticated
WITH CHECK (
  (business_id IS NOT NULL AND public.is_business_owner(business_id))
  OR public.has_role(auth.uid(), 'admin')
);

-- ---------------------------------------------------------------------------
-- Store-scoped one-click unsubscribe (anon-callable). Records suppression AND
-- marks any matching consent row. Replaces the old 2-arg version with a
-- backward-compatible 4-arg one (extra args default to NULL, so existing
-- callers that pass only business_id + email still resolve to this function).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.unsubscribe_email(uuid, text);

CREATE OR REPLACE FUNCTION public.unsubscribe_email(
  p_business_id uuid,
  p_email text,
  p_reason text DEFAULT NULL,
  p_reason_detail text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_email IS NULL OR btrim(p_email) = '' OR p_business_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.email_unsubscribes (business_id, email, reason, reason_detail, source)
  VALUES (p_business_id, lower(btrim(p_email)), p_reason, p_reason_detail, 'email_link')
  ON CONFLICT (COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(email))
  DO UPDATE SET
    reason = COALESCE(EXCLUDED.reason, public.email_unsubscribes.reason),
    reason_detail = COALESCE(EXCLUDED.reason_detail, public.email_unsubscribes.reason_detail),
    unsubscribed_at = now();

  UPDATE public.email_consents
     SET unsubscribed_at = COALESCE(unsubscribed_at, now()),
         unsubscribe_reason = COALESCE(p_reason, unsubscribe_reason),
         unsubscribe_reason_detail = COALESCE(p_reason_detail, unsubscribe_reason_detail)
   WHERE business_id = p_business_id
     AND lower(email) = lower(btrim(p_email));
END;
$$;

GRANT EXECUTE ON FUNCTION public.unsubscribe_email(uuid, text, text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Platform (Siango) one-click unsubscribe (anon-callable).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.platform_unsubscribe_email(
  p_email text,
  p_reason text DEFAULT NULL,
  p_reason_detail text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_email IS NULL OR btrim(p_email) = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.email_unsubscribes (business_id, email, reason, reason_detail, source)
  VALUES (NULL, lower(btrim(p_email)), p_reason, p_reason_detail, 'email_link')
  ON CONFLICT (COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(email))
  DO UPDATE SET
    reason = COALESCE(EXCLUDED.reason, public.email_unsubscribes.reason),
    reason_detail = COALESCE(EXCLUDED.reason_detail, public.email_unsubscribes.reason_detail),
    unsubscribed_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.platform_unsubscribe_email(text, text, text) TO anon, authenticated;

-- Is a recipient suppressed for the Siango platform? (used by the sender to skip).
CREATE OR REPLACE FUNCTION public.is_platform_unsubscribed(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.email_unsubscribes
     WHERE business_id IS NULL AND lower(email) = lower(btrim(p_email))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_unsubscribed(text) TO anon, authenticated;

-- Reason columns on the existing consent table (merchant's evidence trail).
ALTER TABLE public.email_consents
  ADD COLUMN IF NOT EXISTS unsubscribe_reason text,
  ADD COLUMN IF NOT EXISTS unsubscribe_reason_detail text;
