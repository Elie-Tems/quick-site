-- Google Business Profile OAuth integration.
-- Metadata (non-secret) columns live on businesses — readable via existing RLS.
-- Refresh token lives in gbp_tokens (service_role only — no anon/authenticated grant).
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS gbp_location_name   text,
  ADD COLUMN IF NOT EXISTS gbp_location_id     text,
  ADD COLUMN IF NOT EXISTS gbp_website_pushed  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gbp_hours           jsonb,
  ADD COLUMN IF NOT EXISTS gbp_last_sync       timestamptz;

-- Separate table for the encrypted refresh token.
-- No GRANT to anon or authenticated — only service_role (used by edge functions) can read it.
CREATE TABLE IF NOT EXISTS gbp_tokens (
  business_id   uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  refresh_token text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE gbp_tokens ENABLE ROW LEVEL SECURITY;
-- No RLS policies = no authenticated/anon access even through PostgREST.
-- Edge functions use service_role key which bypasses RLS entirely.

-- Belt-and-suspenders: revoke Supabase's default public grants.
-- RLS alone would block access, but removing the privilege adds a second layer.
REVOKE ALL ON gbp_tokens FROM anon, authenticated;
