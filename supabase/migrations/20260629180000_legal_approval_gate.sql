-- Legal-approval gate: the merchant must explicitly approve the terms + privacy
-- policy before the store can be published (enforced in finalize-publish). This
-- does not block building/editing the site - only the final go-live step.
alter table public.businesses
  add column if not exists legal_approved_at timestamptz;

comment on column public.businesses.legal_approved_at is
  'When the merchant approved the legal docs (terms + privacy). NULL = not yet approved; finalize-publish blocks go-live until set.';
