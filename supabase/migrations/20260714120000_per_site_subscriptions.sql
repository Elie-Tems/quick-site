-- Per-site subscriptions. Each PUBLISHED site (business) is its own subscription, so an
-- account with N published sites is billed N x the monthly fee. Previously subscriptions
-- were unique per user (one row per account), which under-billed accounts with several
-- published sites (they renewed once, not per site). Add-ons follow the same rule.
--
-- Safe/idempotent: adds a nullable column, backfills, then swaps the uniqueness from
-- (user_id) to (business_id). Constraint names are resolved dynamically so this doesn't
-- depend on the auto-generated names.

-- 0) Repair a pre-existing broken trigger. protect_subscription_billing references
-- NEW.analytics_addon_enabled / analytics_addon_price, but those columns were never
-- created - so ANY update to a subscriptions row raised
-- 'record "new" has no field "analytics_addon_enabled"' and failed. Add the columns
-- (default off/0) BEFORE the backfill below, which updates every row. Idempotent.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS analytics_addon_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS analytics_addon_price numeric NOT NULL DEFAULT 0;

-- 1) subscriptions.business_id ------------------------------------------------------
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Backfill: attach each existing subscription to the user's primary site (published
-- first, then most recent). A user with several sites had only ONE subscription under the
-- old model; it maps to that primary site.
UPDATE public.subscriptions s
SET business_id = (
  SELECT b.id FROM public.businesses b
  JOIN public.profiles p ON p.id = b.owner_id
  WHERE p.user_id = s.user_id
  ORDER BY b.is_published DESC, b.created_at DESC
  LIMIT 1
)
WHERE s.business_id IS NULL;

-- 2) Swap uniqueness: drop UNIQUE(user_id), add UNIQUE(business_id) --------------------
DO $$
DECLARE cn text;
BEGIN
  -- Drop any UNIQUE constraint that is exactly on (user_id).
  SELECT c.conname INTO cn
  FROM pg_constraint c
  WHERE c.conrelid = 'public.subscriptions'::regclass
    AND c.contype = 'u'
    AND c.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.subscriptions'::regclass AND attname = 'user_id')];
  IF cn IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.subscriptions DROP CONSTRAINT %I', cn);
  END IF;
END $$;

-- One subscription per site. A plain unique index (not partial) so ON CONFLICT
-- (business_id) works for upsert; Postgres treats NULLs as distinct, so any legacy
-- rows without a business_id don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_business_id_key
  ON public.subscriptions (business_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_business ON public.subscriptions (business_id);

-- 3) Add-ons become per-site too (a WhatsApp/reviews add-on belongs to one site) --------
-- subscription_addons already carries business_id; move the uniqueness onto it.
DO $$
DECLARE cn text;
BEGIN
  SELECT c.conname INTO cn
  FROM pg_constraint c
  WHERE c.conrelid = 'public.subscription_addons'::regclass
    AND c.contype = 'u'
    AND c.conkey = ARRAY[
      (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.subscription_addons'::regclass AND attname = 'user_id'),
      (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.subscription_addons'::regclass AND attname = 'addon_type')
    ];
  IF cn IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.subscription_addons DROP CONSTRAINT %I', cn);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_addons_business_addon_key
  ON public.subscription_addons (business_id, addon_type);
