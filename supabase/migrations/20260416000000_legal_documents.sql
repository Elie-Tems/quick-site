-- Per-store legal documents (terms of service + privacy policy).
-- Stored as editable JSON section arrays directly on the business row, so the
-- existing businesses RLS (owner can update own; published rows are publicly
-- readable) covers them with no extra policies.

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS terms_sections jsonb,
  ADD COLUMN IF NOT EXISTS privacy_sections jsonb,
  ADD COLUMN IF NOT EXISTS legal_acknowledged_at timestamptz;

COMMENT ON COLUMN public.businesses.terms_sections IS 'Editable terms-of-service sections: [{id, heading, body, locked?}]';
COMMENT ON COLUMN public.businesses.privacy_sections IS 'Editable privacy-policy sections: [{id, heading, body, locked?}]';
COMMENT ON COLUMN public.businesses.legal_acknowledged_at IS 'When the owner acknowledged the legal disclaimer at publish time';
