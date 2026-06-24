-- Soft-suspend model: a suspended business is taken offline (storefront shows
-- "temporarily unavailable") but its data is fully retained. Only an admin can
-- restore (one click) or permanently delete. Nothing is ever auto-deleted.
alter table public.businesses
  add column if not exists is_suspended boolean not null default false,
  add column if not exists suspended_at timestamptz,
  add column if not exists suspend_reason text; -- 'non_payment' | 'cancelled' | manual
