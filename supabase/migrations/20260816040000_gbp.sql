-- Google Business Profile OAuth integration.
-- Stores encrypted refresh token + location metadata on the business row.
-- Separate from google_reviews_cache (which uses Places API key, not OAuth).
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS gbp_location_name   text,
  ADD COLUMN IF NOT EXISTS gbp_location_id     text,
  ADD COLUMN IF NOT EXISTS gbp_refresh_token   text,
  ADD COLUMN IF NOT EXISTS gbp_website_pushed  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gbp_hours           jsonb,
  ADD COLUMN IF NOT EXISTS gbp_last_sync       timestamptz;
