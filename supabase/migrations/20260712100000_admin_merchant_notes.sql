-- Merchant 360: internal admin notes on a merchant (real CRM). Shown only in the
-- admin super-dashboard customer card. The UI degrades gracefully if this column
-- is missing (guarded read/write), so applying this is non-urgent.
alter table public.profiles
  add column if not exists admin_notes text;

comment on column public.profiles.admin_notes is
  'Free-text internal notes an admin keeps about this merchant (admin dashboard only). Not exposed to the merchant.';
