-- Merchant "marketing tags" add-on (one-time ₪149): lets a store owner embed
-- their own tracking tags (Google Tag Manager, GA4, Meta/Facebook Pixel, Google
-- Ads, TikTok Pixel, and free-form custom head code) into their published store.
-- Gated behind tracking_paid. The owner edits these (existing owner-update RLS);
-- the public storefront reads them (existing published-store read RLS).

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS tracking_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tracking_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS tracking_gtm_id text,        -- GTM-XXXXXXX
  ADD COLUMN IF NOT EXISTS tracking_ga4_id text,        -- G-XXXXXXXXXX
  ADD COLUMN IF NOT EXISTS tracking_meta_pixel text,    -- 15-16 digit Pixel ID
  ADD COLUMN IF NOT EXISTS tracking_google_ads text,    -- AW-XXXXXXXXX
  ADD COLUMN IF NOT EXISTS tracking_tiktok_pixel text,  -- TikTok pixel id
  ADD COLUMN IF NOT EXISTS tracking_custom_head text;   -- free-form <head> snippet
