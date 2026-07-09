-- Recurring add-ons as subscription LINE-ITEMS (Google Reviews, business email,
-- WhatsApp...). Enabling an add-on mid-cycle charges a PRORATED first amount (days
-- left until the next subscription charge) as its own invoice; from the next cycle
-- the add-on is billed together with the base subscription as one CONSOLIDATED
-- monthly invoice (one document, one line per item). This table is the source of
-- truth for which add-ons are active on a merchant's subscription.
--
-- price_ils is the monthly GROSS (VAT-inclusive) price of the add-on line.
CREATE TABLE IF NOT EXISTS public.subscription_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id uuid,
  addon_type text NOT NULL,               -- 'reviews' | 'email' | 'whatsapp' | ...
  description text NOT NULL,              -- invoice line label (Hebrew)
  price_ils numeric NOT NULL,             -- monthly gross (VAT-inclusive)
  active boolean NOT NULL DEFAULT true,
  started_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, addon_type)
);

ALTER TABLE public.subscription_addons ENABLE ROW LEVEL SECURITY;

-- The merchant can see their own add-ons; only the service role writes them (charges
-- are always server-initiated, never client-trusted).
DROP POLICY IF EXISTS "merchant reads own addons" ON public.subscription_addons;
CREATE POLICY "merchant reads own addons" ON public.subscription_addons
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS subscription_addons_user_active_idx
  ON public.subscription_addons (user_id) WHERE active;
