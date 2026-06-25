-- Admin-managed domain pricing. The domain-search edge function reads these to
-- price domains: customer = cost x usd_to_ils x (1 + margin%) x (1 - coupon%).
-- Applied live via the management API on 2026-06-25.

create table if not exists public.domain_settings (
  id int primary key default 1,
  margin_percent numeric not null default 100,
  coupon_percent numeric not null default 15,
  usd_to_ils numeric not null default 3.7,
  updated_at timestamptz default now(),
  constraint domain_settings_single check (id = 1)
);
insert into public.domain_settings (id) values (1) on conflict (id) do nothing;
alter table public.domain_settings enable row level security;

create policy "admin manages domain settings" on public.domain_settings
for all using (has_role((select auth.uid()),'admin'::app_role))
with check (has_role((select auth.uid()),'admin'::app_role));
