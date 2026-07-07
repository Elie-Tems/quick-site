-- Persist the onboarding business type (products/services/realestate/nonprofit).
-- Until now it was collected in the UI (StepBusinessType) but never saved, so
-- nothing downstream could branch on it. This column is the keystone that lets
-- per-vertical modules (booking, listings, donations) turn on per business.
-- Module logic lives in src/lib/businessModules.ts.

alter table public.businesses
  add column if not exists business_type text;

comment on column public.businesses.business_type is
  'Vertical/engine chosen at onboarding: products | services | realestate | nonprofit. Drives which modules a business gets (see src/lib/businessModules.ts). Nullable for legacy rows; app defaults null -> products.';

-- Backfill: every business created until now is a product store (the only
-- vertical that existed), so default existing rows to products. New rows write
-- their real type from onboarding.
update public.businesses
  set business_type = 'products'
  where business_type is null;
