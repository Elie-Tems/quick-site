-- Google Business reviews add-on (₪14/mo recurring). The merchant connects
-- their Google Business Profile (we resolve the place_id for them by name) and
-- their rating + reviews are shown on their storefront. Reviews are cached on
-- the business row so the public storefront reads them directly (no API call per
-- visitor). Gated behind reviews_paid. Owner edits; public reads (published store).

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS reviews_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviews_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS google_place_id text,            -- resolved Google place id
  ADD COLUMN IF NOT EXISTS google_business_name text,       -- the picked business name (display)
  ADD COLUMN IF NOT EXISTS google_reviews_cache jsonb,      -- { rating, total, reviews:[...] }
  ADD COLUMN IF NOT EXISTS google_reviews_cached_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviews_show_on_store boolean NOT NULL DEFAULT true;
