-- PayPlus payment integration
-- Idempotent (safe to re-run / paste into the Supabase SQL editor).

-- 1. Secure, server-only store for each merchant's PayPlus credentials.
--    The public storefront reads businesses with SELECT *, so secrets must NOT
--    live on the businesses table. This table is readable only by the owner and
--    by the service role (edge functions). It is never exposed to anon.
create table if not exists public.payment_credentials (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  provider      text not null default 'payplus',
  api_key       text,
  secret_key    text,
  page_uid      text,
  mode          text not null default 'test',   -- 'test' | 'live'
  verified_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (business_id, provider)
);

alter table public.payment_credentials enable row level security;

-- Owner can manage only their own business credentials.
drop policy if exists "owner manages own payment credentials" on public.payment_credentials;
create policy "owner manages own payment credentials"
  on public.payment_credentials
  for all
  using (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  )
  with check (
    business_id in (select id from public.businesses where owner_id = auth.uid())
  );
-- NOTE: no policy for anon → the public storefront can never read these rows.
-- Edge functions use the service-role key, which bypasses RLS.

-- 2. Payment tracking on orders (the payments table already records each attempt;
--    these columns let the dashboard show paid/unpaid at a glance).
alter table public.orders
  add column if not exists payment_status text not null default 'unpaid', -- unpaid | pending | paid | failed
  add column if not exists paid_at timestamptz,
  add column if not exists payment_page_request_uid text,
  add column if not exists payment_transaction_uid text;

create index if not exists orders_payment_page_request_uid_idx
  on public.orders (payment_page_request_uid);

-- 3. keep updated_at fresh on payment_credentials
create or replace function public.touch_payment_credentials_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_payment_credentials on public.payment_credentials;
create trigger trg_touch_payment_credentials
  before update on public.payment_credentials
  for each row execute function public.touch_payment_credentials_updated_at();
