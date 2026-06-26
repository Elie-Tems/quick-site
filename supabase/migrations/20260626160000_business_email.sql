-- Business email as a Siango product (reseller). Sell merchants a professional
-- mailbox on their own domain (info@theirbrand.co.il). Recurring + sticky, pairs
-- with the domain marketplace. Provider: OpenSRS (same reseller account as
-- domains; wholesale ~$0.50/mailbox/mo) - provider-agnostic by design.
-- BUILD-ONLY per the WhatsApp/email deploy rule: built, not surfaced, awaits approval.

-- Admin-managed email pricing (mirrors domain_settings).
create table if not exists public.email_settings (
  id int primary key default 1,
  price_ils numeric not null default 19,      -- monthly price per mailbox to the merchant
  cost_usd numeric not null default 0.5,      -- our wholesale cost per mailbox
  usd_to_ils numeric not null default 3.7,
  updated_at timestamptz default now(),
  constraint email_settings_single check (id = 1)
);
insert into public.email_settings (id) values (1) on conflict (id) do nothing;
alter table public.email_settings enable row level security;
create policy "admin manages email settings" on public.email_settings
for all using (has_role((select auth.uid()),'admin'::app_role))
with check (has_role((select auth.uid()),'admin'::app_role));

-- A mailbox provisioned for a merchant on their domain.
create table if not exists public.email_mailboxes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  domain text not null,                       -- theirbrand.co.il
  address text not null,                       -- info@theirbrand.co.il
  display_name text,
  plan text not null default 'standard',
  quota_mb int not null default 10240,
  status text not null default 'pending',     -- pending | active | suspended | error
  provider text not null default 'opensrs',
  provider_ref text,
  price_ils numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (address)
);
alter table public.email_mailboxes enable row level security;
create policy "owner manages own mailboxes" on public.email_mailboxes for all
using (business_id in (
  select b.id from public.businesses b join public.profiles p on p.id = b.owner_id
  where p.user_id = (select auth.uid())))
with check (business_id in (
  select b.id from public.businesses b join public.profiles p on p.id = b.owner_id
  where p.user_id = (select auth.uid())));
create policy "admin reads mailboxes" on public.email_mailboxes for select
using (has_role((select auth.uid()),'admin'::app_role));

create index if not exists idx_email_mailboxes_business on public.email_mailboxes(business_id);
