-- A "forever" duration subscription coupon on a recurring add-on was only ever
-- applied to the one-time prorated first charge (addon-subscribe) - every
-- monthly consolidated charge afterwards (billing-charge-run) billed the addon
-- at full price_ils, silently breaking the "forever" promise the coupon made.
-- Persist the coupon on the add-on row so billing-charge-run can re-apply it
-- every cycle for as long as duration = 'forever'.

alter table public.subscription_addons
  add column if not exists coupon_code text,
  add column if not exists coupon_discount_type text check (coupon_discount_type in ('percent', 'fixed')),
  add column if not exists coupon_discount_value numeric,
  add column if not exists coupon_duration text check (coupon_duration in ('first_month', 'forever'));
