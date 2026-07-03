-- Self-managed recurring billing (iCount token charging) + platform subscription
-- coupons. This is the foundation for charging monthly ourselves via iCount's
-- cc/bill (stored token) instead of an iCount-managed הוראת קבע (hk), so we can
-- apply flexible promo discounts (first month / forever) per campaign.
--
-- SECURITY MODEL: we NEVER store card data. We store only iCount's cc_token_id
-- (a reference; the card lives at iCount). Charging is initiated ONLY by the
-- server-side cron (service role). Amounts are computed server-side. Every
-- charge attempt is written to an immutable audit log. Not wired live until the
-- iCount Credit-Card Storage module is enabled + tested with is_test.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) Platform subscription coupons (the AdminSubscriptionCoupons UI targets this)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value numeric NOT NULL CHECK (discount_value >= 0),
  -- first_month = discount applies to the first charge only, then full price.
  -- forever     = discounted price every cycle for the life of the subscription.
  duration text NOT NULL DEFAULT 'first_month' CHECK (duration IN ('first_month', 'forever')),
  is_active boolean NOT NULL DEFAULT true,
  max_redemptions integer,
  redeemed_count integer NOT NULL DEFAULT 0,
  valid_until timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness on the code (users type WELCOME50 / welcome50).
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_coupons_code
  ON public.subscription_coupons (upper(code));

ALTER TABLE public.subscription_coupons ENABLE ROW LEVEL SECURITY;

-- Only admins manage coupons. The public NEVER reads the table directly
-- (prevents code enumeration / harvesting) - redemption validation goes through
-- the SECURITY DEFINER function below.
DROP POLICY IF EXISTS "admin manages subscription coupons" ON public.subscription_coupons;
CREATE POLICY "admin manages subscription coupons" ON public.subscription_coupons
FOR ALL USING (has_role((select auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Coupon redemptions (who used which coupon, once per user per coupon)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.subscription_coupons (id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  business_id uuid,
  code text NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);

ALTER TABLE public.subscription_coupon_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner reads own coupon redemptions" ON public.subscription_coupon_redemptions;
CREATE POLICY "owner reads own coupon redemptions" ON public.subscription_coupon_redemptions
FOR SELECT USING (auth.uid() = user_id OR has_role((select auth.uid()), 'admin'::app_role));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Coupon validation (anti-enumeration): validate a code WITHOUT exposing the
--    table. Returns the discount to apply, or valid=false. Callable by anyone.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_subscription_coupon(p_code text)
RETURNS TABLE (valid boolean, discount_type text, discount_value numeric, duration text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.subscription_coupons%ROWTYPE;
BEGIN
  SELECT * INTO c FROM public.subscription_coupons
   WHERE upper(code) = upper(trim(p_code)) AND is_active = true
   LIMIT 1;

  IF NOT FOUND
     OR (c.valid_until IS NOT NULL AND c.valid_until < now())
     OR (c.max_redemptions IS NOT NULL AND c.redeemed_count >= c.max_redemptions) THEN
    RETURN QUERY SELECT false, NULL::text, NULL::numeric, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, c.discount_type, c.discount_value, c.duration;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_subscription_coupon(text) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Billing tokens - a REFERENCE to iCount's stored card token. No card data.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'icount',
  cc_token_id text NOT NULL,          -- iCount token id; the card itself lives at iCount
  icount_client_id text,
  cc_last4 text,
  cc_type text,
  cc_exp_month integer,
  cc_exp_year integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_tokens_user ON public.billing_tokens (user_id);

ALTER TABLE public.billing_tokens ENABLE ROW LEVEL SECURITY;

-- Owner may read their own row (last4/type for display). Writes are service-role
-- only (no INSERT/UPDATE/DELETE policy => blocked for anon/authenticated; the
-- service role bypasses RLS). The token id is only usable with our secret API
-- key, which never leaves the server.
DROP POLICY IF EXISTS "owner reads own billing token" ON public.billing_tokens;
CREATE POLICY "owner reads own billing token" ON public.billing_tokens
FOR SELECT USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Billing charges - immutable audit log of every cc/bill attempt
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  subscription_id uuid,
  business_id uuid,
  amount_ils numeric NOT NULL,
  currency text NOT NULL DEFAULT 'ILS',
  status text NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  is_test boolean NOT NULL DEFAULT false,
  confirmation_code text,
  error_code text,
  -- (subscription, billing period) - guarantees a cycle is never double-charged.
  idempotency_key text UNIQUE,
  coupon_code text,
  payment_description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_charges_user ON public.billing_charges (user_id);
CREATE INDEX IF NOT EXISTS idx_billing_charges_sub ON public.billing_charges (subscription_id);

ALTER TABLE public.billing_charges ENABLE ROW LEVEL SECURITY;

-- Owner reads own charge history (the "monthly charges" account page). Only the
-- service role writes. No UPDATE/DELETE policy => the log is append-only for
-- everyone but the service role.
DROP POLICY IF EXISTS "owner reads own billing charges" ON public.billing_charges;
CREATE POLICY "owner reads own billing charges" ON public.billing_charges
FOR SELECT USING (auth.uid() = user_id OR has_role((select auth.uid()), 'admin'::app_role));

-- ─────────────────────────────────────────────────────────────────────────────
-- 6) Extend subscriptions for self-managed token billing
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.subscriptions
  -- 'icount_hk' = legacy iCount-managed standing order; 'icount_token' = we charge
  ADD COLUMN IF NOT EXISTS billing_provider text NOT NULL DEFAULT 'icount_hk',
  ADD COLUMN IF NOT EXISTS cc_token_id text,
  ADD COLUMN IF NOT EXISTS base_amount_ils numeric,      -- full monthly price (pre-discount, pre-VAT)
  ADD COLUMN IF NOT EXISTS coupon_code text,
  ADD COLUMN IF NOT EXISTS coupon_duration text,          -- 'first_month' | 'forever' | null
  -- snapshot of the coupon at signup so a 'forever' discount persists even if the
  -- coupon is later deactivated/expired (the customer keeps their promo price).
  ADD COLUMN IF NOT EXISTS coupon_discount_type text,     -- 'percent' | 'fixed' | null
  ADD COLUMN IF NOT EXISTS coupon_discount_value numeric,
  ADD COLUMN IF NOT EXISTS next_charge_at timestamptz,    -- when the cron next charges
  ADD COLUMN IF NOT EXISTS billing_cycle_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_charge_status text;

CREATE INDEX IF NOT EXISTS idx_subscriptions_next_charge
  ON public.subscriptions (billing_provider, status, next_charge_at);
