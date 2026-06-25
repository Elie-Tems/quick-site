-- Domain purchase orders. The buy flow is payment-first: we create a pending
-- order, send the customer to an iCount payment page, and only register the
-- domain at the provider (Openprovider) AFTER iCount confirms the charge via
-- webhook. This guarantees we never spend reseller balance before being paid.
--
-- Lifecycle of status:
--   pending     - order created, awaiting iCount payment
--   paid        - iCount confirmed the charge (webhook)
--   registered  - domain registered at the provider + row added to public.domains
--   failed_funds- paid by customer but provider rejected (e.g. empty balance) -> urgent admin alert
--   failed      - paid by customer but registration failed for another reason
--   refunded    - charge reversed
--
-- Registrant data is captured at purchase (the domain is registered on the
-- CUSTOMER's name, per product/legal decision) together with the consent the
-- customer gave (ownership, renewal cycle, leaving implications).

create table if not exists public.domain_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  user_id uuid,
  domain text not null,
  extension text,
  price_ils numeric not null,
  cost_usd numeric,
  status text not null default 'pending',
  provider text not null default 'openprovider',
  pay_provider text not null default 'icount',
  session_token text not null,
  external_transaction_id text,
  op_order_id text,
  op_owner_handle text,
  auto_renew boolean not null default true,
  -- registrant (WHOIS owner) captured at purchase
  reg_name text,
  reg_email text,
  reg_phone text,
  reg_address text,
  reg_city text,
  reg_zip text,
  reg_country text default 'IL',
  -- consent record (lawyerly): what the customer acknowledged + when + from where
  consent_at timestamptz,
  consent_ip text,
  consent_version text,
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists idx_domain_orders_token on public.domain_orders(session_token);
create index if not exists idx_domain_orders_business on public.domain_orders(business_id);
create index if not exists idx_domain_orders_status on public.domain_orders(status);

alter table public.domain_orders enable row level security;

-- Owners can read their own orders (to show purchase status in the dashboard).
create policy "owner reads own domain orders" on public.domain_orders
for select using (
  business_id in (
    select b.id from public.businesses b
    join public.profiles p on p.id = b.owner_id
    where p.user_id = (select auth.uid())
  )
);
create policy "admin reads all domain orders" on public.domain_orders
for select using (has_role((select auth.uid()),'admin'::app_role));
-- Inserts/updates happen only via edge functions (service role), never from the client.

-- Link the registered domain back to its order + remember the WHOIS owner handle.
alter table public.domains add column if not exists order_id uuid references public.domain_orders(id) on delete set null;
alter table public.domains add column if not exists op_owner_handle text;

-- Openprovider account balance snapshot (for the admin dashboard + low-balance alerts).
create table if not exists public.domain_provider_status (
  provider text primary key,
  balance numeric,
  currency text default 'USD',
  low_balance_alert_sent boolean not null default false,
  checked_at timestamptz default now()
);
insert into public.domain_provider_status (provider) values ('openprovider') on conflict (provider) do nothing;
alter table public.domain_provider_status enable row level security;
create policy "admin reads provider status" on public.domain_provider_status
for select using (has_role((select auth.uid()),'admin'::app_role));
