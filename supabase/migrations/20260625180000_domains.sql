-- Tracks domains registered through Siango (for management + lifecycle emails).
-- Lifecycle emails (domainPurchased / domainExpiryReminder / domainExpiringUnpaid)
-- live in _shared/email/platformEmails.ts; the domain-renewal-check function runs
-- daily (pg_cron 'siango-domain-renewal') to send expiry reminders.
-- Applied live via the management API on 2026-06-25.

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  domain text not null,
  status text not null default 'active',
  registered_at timestamptz default now(),
  expires_at timestamptz,
  price_ils numeric,
  cost_usd numeric,
  auto_renew boolean default true,
  op_order_id text,
  reminder_30_sent boolean default false,
  reminder_7_sent boolean default false,
  expiry_unpaid_sent boolean default false,
  created_at timestamptz default now()
);
alter table public.domains enable row level security;

create policy "owner reads own domains" on public.domains
for select using (
  business_id in (
    select b.id from public.businesses b
    join public.profiles p on p.id = b.owner_id
    where p.user_id = (select auth.uid())
  )
);
create policy "admin reads all domains" on public.domains
for select using (has_role((select auth.uid()),'admin'::app_role));

create index if not exists idx_domains_business on public.domains(business_id);
create index if not exists idx_domains_expires on public.domains(expires_at);
