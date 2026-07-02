-- Analytics standalone add-on. CRM buyers already get analytics (crm_addon_enabled).
-- This column allows merchants to buy analytics alone without the full CRM.
alter table public.subscriptions
  add column if not exists analytics_addon_enabled boolean not null default false,
  add column if not exists analytics_addon_price numeric not null default 29;
