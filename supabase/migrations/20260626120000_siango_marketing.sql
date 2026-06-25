-- Siango's OWN marketing/acquisition tracking (NOT the merchants' store ads).
-- Measures the campaigns Siango runs (Facebook/Google/...) to acquire new
-- merchants: budget per channel, ad-click/landing views per UTM source, and how
-- many SIGNUPS each source produced -> cost per acquired merchant.

-- 1. Admin-managed ad channels + their budgets.
create table if not exists public.siango_ad_channels (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- "פייסבוק", "גוגל", "טאבולה"...
  icon text,
  budget_amount numeric not null default 0,
  budget_currency text not null default 'ILS',
  budget_period text not null default 'monthly',  -- monthly | weekly | custom
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.siango_ad_channels enable row level security;
create policy "admin manages siango ad channels" on public.siango_ad_channels
for all using (has_role((select auth.uid()),'admin'::app_role))
with check (has_role((select auth.uid()),'admin'::app_role));

-- 2. Ad-click / landing visits on the Siango site, tagged by UTM. Inserted
--    anonymously when a visitor lands with utm params (the "views/clicks").
create table if not exists public.siango_ad_visits (
  id uuid primary key default gen_random_uuid(),
  visitor_id text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  path text,
  created_at timestamptz default now()
);
alter table public.siango_ad_visits enable row level security;
-- Anyone (anon visitor) may record a visit; only admins may read the analytics.
create policy "anyone inserts siango ad visit" on public.siango_ad_visits
for insert with check (true);
create policy "admin reads siango ad visits" on public.siango_ad_visits
for select using (has_role((select auth.uid()),'admin'::app_role));
create index if not exists idx_siango_ad_visits_src on public.siango_ad_visits(utm_source);
create index if not exists idx_siango_ad_visits_created on public.siango_ad_visits(created_at);

-- 3. Signups grouped by the UTM source/campaign captured at registration
--    (stored in auth.users.raw_user_meta_data). SECURITY DEFINER so it can read
--    auth.users, but gated to admins. Returns the conversions per source.
create or replace function public.admin_signups_by_utm(p_since timestamptz)
returns table(source text, campaign text, signups bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not has_role((select auth.uid()),'admin'::app_role) then
    return;
  end if;
  return query
  select
    coalesce(nullif(u.raw_user_meta_data->>'utm_source', ''), 'direct') as source,
    coalesce(nullif(u.raw_user_meta_data->>'utm_campaign', ''), '-') as campaign,
    count(*)::bigint as signups
  from auth.users u
  where u.created_at >= p_since
  group by 1, 2
  order by 3 desc;
end;
$$;
grant execute on function public.admin_signups_by_utm(timestamptz) to authenticated;
