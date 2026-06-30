-- CRM / profitability premium add-on. Everyone can OPEN the CRM + profitability
-- screens (demo view); only merchants with this add-on enabled can actually use it
-- with their real data. Mirrors the existing product_addon_* pattern.
alter table public.subscriptions
  add column if not exists crm_addon_enabled boolean not null default false,
  add column if not exists crm_addon_price numeric not null default 49;
