-- Email marketing consent records (Chok HaSpam evidence) + unsubscribe.
-- One row per opt-in: who, which store, when, source, the disclosure shown.

CREATE TABLE IF NOT EXISTS public.email_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  email text NOT NULL,
  source text,                          -- 'checkout' | 'newsletter_form' | ...
  consented_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  disclosure_text text,                 -- snapshot of the notice the user agreed to
  unsubscribed_at timestamptz,          -- set when the recipient unsubscribes
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_consents ENABLE ROW LEVEL SECURITY;

-- Anyone (anon storefront visitor) may record consent for a PUBLISHED store,
-- mirroring the orders insert policy.
DROP POLICY IF EXISTS "Insert consent for published store" ON public.email_consents;
CREATE POLICY "Insert consent for published store"
ON public.email_consents FOR INSERT
TO anon, authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.is_published = true));

-- Only the store owner (or an admin) can read the consent list.
DROP POLICY IF EXISTS "Owner or admin read consents" ON public.email_consents;
CREATE POLICY "Owner or admin read consents"
ON public.email_consents FOR SELECT
TO authenticated
USING (public.is_business_owner(business_id) OR public.has_role(auth.uid(), 'admin'));

-- Unsubscribe: anon-callable, scoped RPC (no broad UPDATE policy needed).
CREATE OR REPLACE FUNCTION public.unsubscribe_email(p_business_id uuid, p_email text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.email_consents
     SET unsubscribed_at = now()
   WHERE business_id = p_business_id
     AND lower(email) = lower(p_email)
     AND unsubscribed_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.unsubscribe_email(uuid, text) TO anon, authenticated;
