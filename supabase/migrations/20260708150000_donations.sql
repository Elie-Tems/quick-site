-- Phase 5: Donations + fundraising campaigns. A donation is a `transactions`
-- row of kind='donation' (details: {recurring, frequency, campaign_id,
-- section46_eligible}). Recurring donations reuse the existing self-managed
-- iCount billing engine (which already does monthly cc/bill). Section 46 is
-- gated by businesses.section46_enabled (added in the CRM migration, OFF by
-- default - never assumed). Campaigns add a fundraising goal + crowdfunding
-- (tiers / deadline / all-or-nothing), distinct from the e-commerce `campaigns`
-- table (which is promotional).

create table if not exists public.donation_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  description text,
  goal_amount numeric,
  raised_cached numeric not null default 0,   -- refreshed from transactions
  backers_cached int not null default 0,
  cover_url text,
  is_crowdfunding boolean not null default false,  -- true = tiers/deadline/all-or-nothing
  deadline timestamptz,
  all_or_nothing boolean not null default false,
  tiers jsonb not null default '[]',           -- [{amount,title,desc,limit}]
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_donation_campaigns_biz on public.donation_campaigns(business_id, active, sort_order);

drop trigger if exists trg_donation_campaigns_updated on public.donation_campaigns;
create trigger trg_donation_campaigns_updated before update on public.donation_campaigns for each row execute function public.update_updated_at_column();

-- Refresh a campaign's cached totals from its donation transactions.
create or replace function public.refresh_donation_campaign(p_campaign_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.donation_campaigns dc set
    raised_cached = coalesce((
      select sum(t.amount) from public.transactions t
      where t.kind = 'donation' and (t.details->>'campaign_id')::uuid = dc.id and t.status in ('paid','completed')
    ), 0),
    backers_cached = coalesce((
      select count(distinct t.contact_id) from public.transactions t
      where t.kind = 'donation' and (t.details->>'campaign_id')::uuid = dc.id and t.status in ('paid','completed')
    ), 0),
    updated_at = now()
  where dc.id = p_campaign_id;
end $$;

alter table public.donation_campaigns enable row level security;

drop policy if exists "owner manages own donation_campaigns" on public.donation_campaigns;
create policy "owner manages own donation_campaigns" on public.donation_campaigns for all
  using (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()))
  with check (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()));

drop policy if exists "public reads active campaigns" on public.donation_campaigns;
create policy "public reads active campaigns" on public.donation_campaigns for select
  using (active = true and business_id in (select id from public.businesses where is_published = true));
