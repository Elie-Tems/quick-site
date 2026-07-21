-- Columns that were added directly via Supabase dashboard without a migration.
-- Adding here so the schema stays reproducible and PostgREST schema cache stays in sync.
alter table public.orders
  add column if not exists delivery_method  text,           -- 'pickup' | 'delivery'
  add column if not exists delivery_fee     numeric,
  add column if not exists delivery_address text,
  add column if not exists coupon_id        uuid references public.coupons(id) on delete set null,
  add column if not exists discount_amount  numeric;
