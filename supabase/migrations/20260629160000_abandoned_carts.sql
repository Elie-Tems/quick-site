-- Abandoned-cart tracking for the abandoned-cart email automation.
-- A row is upserted when a storefront visitor reaches checkout and enters an
-- email but hasn't completed the order. Owner-scoped RLS; the public capture +
-- the cron runner use the service role.

create table if not exists public.mkt_abandoned_carts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  email text not null,
  name text,
  items jsonb default '[]',
  total numeric,
  recovered boolean not null default false,   -- a matching order completed
  reminded_at timestamptz,                    -- reminder already sent
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, email)
);
create index if not exists idx_abandoned_owner on public.mkt_abandoned_carts(owner_id);
create index if not exists idx_abandoned_pending on public.mkt_abandoned_carts(created_at) where recovered = false and reminded_at is null;

alter table public.mkt_abandoned_carts enable row level security;
create policy "owner_all_abandoned" on public.mkt_abandoned_carts
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
