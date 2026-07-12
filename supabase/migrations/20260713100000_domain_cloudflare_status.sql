-- Tracks the Cloudflare "custom hostname" connection state for each purchased
-- domain, so the automatic connect (register.ts) and the sync cron
-- (domain-cf-sync) can record + poll SSL provisioning without touching the
-- `status` column (which already gates storefront resolution - see
-- get_store_slug_for_domain in 20260625200000_custom_domain_resolve.sql).

alter table public.domains add column if not exists cf_hostname_id text;
alter table public.domains add column if not exists cf_ssl_status text; -- 'pending_validation' | 'active' | 'error' | null (never attempted)
alter table public.domains add column if not exists cf_checked_at timestamptz;

create index if not exists idx_domains_cf_pending on public.domains(id)
  where cf_ssl_status is distinct from 'active';

-- Tiny alert-dedup table so the "approaching free Cloudflare hostname limit"
-- admin email fires once per threshold, not every cron run.
create table if not exists public.system_alerts_sent (
  key text primary key,
  sent_at timestamptz not null default now()
);
alter table public.system_alerts_sent enable row level security;
create policy "service role only" on public.system_alerts_sent for all using (false);
