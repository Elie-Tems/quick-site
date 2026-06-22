-- Publish gate: businesses stay draft until payment verified (Edge Function with service role).
-- Public storefront only sees published businesses and related rows.

-- 1) Column on businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.is_published IS 'When true, storefront is visible to the public. Set only via service role after payment.';

-- Existing stores: keep visible
UPDATE public.businesses SET is_published = true WHERE is_published = false;

-- 2) Checkout sessions (iCount / webhook flow)
CREATE TABLE IF NOT EXISTS public.publish_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  session_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'completed', 'cancelled')),
  amount_ils numeric,
  payment_verified_at timestamptz,
  provider text NOT NULL DEFAULT 'icount',
  external_transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publish_sessions_token ON public.publish_checkout_sessions (session_token);
CREATE INDEX IF NOT EXISTS idx_publish_sessions_business ON public.publish_checkout_sessions (business_id);

ALTER TABLE public.publish_checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own publish sessions"
ON public.publish_checkout_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own publish sessions"
ON public.publish_checkout_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 3) Helper: storefront visibility (published OR owner preview)
CREATE OR REPLACE FUNCTION public.business_is_public_or_owned(business_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = business_uuid
      AND (
        b.is_published = true
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = b.owner_id AND p.user_id = auth.uid()
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.business_is_public_or_owned(uuid) TO anon, authenticated;

-- 4) RLS: public can read published businesses (anon + authenticated)
DROP POLICY IF EXISTS "Anyone can view published businesses" ON public.businesses;
CREATE POLICY "Anyone can view published businesses"
ON public.businesses FOR SELECT
TO anon, authenticated
USING (is_published = true);

-- 5) Products & categories: replace open SELECT policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
CREATE POLICY "Products visible when business published or owned"
ON public.products FOR SELECT
USING (public.business_is_public_or_owned(business_id));

DROP POLICY IF EXISTS "Enable read access for all users" ON public.product_categories;
CREATE POLICY "Categories visible when business published or owned"
ON public.product_categories FOR SELECT
USING (public.business_is_public_or_owned(business_id));

-- 6) Banners
DROP POLICY IF EXISTS "Anyone can view banners" ON public.banners;
CREATE POLICY "Banners visible when business published or owned"
ON public.banners FOR SELECT
USING (public.business_is_public_or_owned(business_id));

-- 7) Product custom fields (via product -> business)
DROP POLICY IF EXISTS "Anyone can view product custom fields" ON public.product_custom_fields;
CREATE POLICY "Custom fields visible when business published or owned"
ON public.product_custom_fields FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_custom_fields.product_id
      AND public.business_is_public_or_owned(p.business_id)
  )
);

-- 8) Campaigns & related
DROP POLICY IF EXISTS "Anyone can view active campaigns" ON public.campaigns;
CREATE POLICY "Campaigns visible when business published or owned"
ON public.campaigns FOR SELECT
USING (public.business_is_public_or_owned(business_id));

DROP POLICY IF EXISTS "Anyone can view campaign banners" ON public.campaign_banners;
CREATE POLICY "Campaign banners visible when campaign business published or owned"
ON public.campaign_banners FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_banners.campaign_id
      AND public.business_is_public_or_owned(c.business_id)
  )
);

DROP POLICY IF EXISTS "Anyone can view campaign products" ON public.campaign_products;
CREATE POLICY "Campaign products visible when campaign business published or owned"
ON public.campaign_products FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_products.campaign_id
      AND public.business_is_public_or_owned(c.business_id)
  )
);

-- 9) Coupons
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;
CREATE POLICY "Coupons visible when business published or owned"
ON public.coupons FOR SELECT
USING (
  active = true
  AND public.business_is_public_or_owned(business_id)
);

-- 10) Orders: only for published storefronts
DROP POLICY IF EXISTS "Enable insert for all users" ON public.orders;
CREATE POLICY "Orders insert only for published businesses"
ON public.orders FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = orders.business_id AND b.is_published = true
  )
);

DROP POLICY IF EXISTS "Enable insert for all users" ON public.order_items;
CREATE POLICY "Order items insert only for published business orders"
ON public.order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    INNER JOIN public.businesses b ON b.id = o.business_id
    WHERE o.id = order_items.order_id AND b.is_published = true
  )
);

-- 11) Block clients from flipping is_published without service role (Edge Functions)
CREATE OR REPLACE FUNCTION public.enforce_business_publish_gate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  jwt_role := COALESCE((SELECT auth.jwt()->>'role'), '');
  IF TG_OP = 'INSERT' AND COALESCE(NEW.is_published, false) = true THEN
    IF jwt_role IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'Publishing requires server verification';
    END IF;
  END IF;
  IF TG_OP = 'UPDATE'
     AND COALESCE(NEW.is_published, false) = true
     AND COALESCE(OLD.is_published, false) = false
  THEN
    IF jwt_role IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'Publishing requires server verification';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_businesses_publish_gate ON public.businesses;
CREATE TRIGGER trg_businesses_publish_gate
  BEFORE INSERT OR UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_business_publish_gate();
