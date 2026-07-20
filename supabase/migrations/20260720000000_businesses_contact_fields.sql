-- Add contact/social fields collected during onboarding but previously missing from schema
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS business_hours   text,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS facebook_url     text,
  ADD COLUMN IF NOT EXISTS instagram_url    text;
