-- Email-marketing backbone (shared with CRM, decoupled from store so it can be
-- sold standalone). All tables are owner-scoped by auth user id; business_id is
-- optional for Siango-merchant linkage. RLS: an owner only sees their own rows.

-- ── Contacts ────────────────────────────────────────────────────────────────
create table if not exists public.mkt_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  email text,
  phone text,
  name text,
  status text not null default 'active' check (status in ('active','unsubscribed','bounced')),
  source text,                              -- import / form / order / api
  consent_at timestamptz,                   -- proof of opt-in (spam law)
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  unique (owner_id, email)
);
create index if not exists idx_mkt_contacts_owner on public.mkt_contacts(owner_id);

-- ── Segments ────────────────────────────────────────────────────────────────
create table if not exists public.mkt_segments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_dynamic boolean not null default false,
  rule jsonb,                               -- dynamic rule (engagement/purchase/tags)
  created_at timestamptz not null default now()
);
create index if not exists idx_mkt_segments_owner on public.mkt_segments(owner_id);

-- ── Templates ───────────────────────────────────────────────────────────────
create table if not exists public.mkt_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  blocks jsonb not null default '[]',       -- editor block model
  created_at timestamptz not null default now()
);
create index if not exists idx_mkt_templates_owner on public.mkt_templates(owner_id);

-- ── Campaigns ───────────────────────────────────────────────────────────────
create table if not exists public.mkt_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  name text not null default 'דיוור חדש',
  subject text,
  preview_text text,
  from_name text,
  reply_to text,
  blocks jsonb not null default '[]',
  include_segments uuid[] default '{}',
  exclude_segments uuid[] default '{}',
  conditions jsonb default '[]',            -- engagement conditions
  status text not null default 'draft' check (status in ('draft','scheduled','sending','sent','failed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_mkt_campaigns_owner on public.mkt_campaigns(owner_id);

-- ── Campaign events (sent / opened / clicked) ───────────────────────────────
create table if not exists public.mkt_campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.mkt_campaigns(id) on delete cascade,
  contact_id uuid references public.mkt_contacts(id) on delete set null,
  type text not null check (type in ('sent','delivered','opened','clicked','bounced')),
  url text,
  at timestamptz not null default now()
);
create index if not exists idx_mkt_events_campaign on public.mkt_campaign_events(campaign_id);

-- ── Automations (welcome / drip / abandoned cart / birthday / review) ───────
create table if not exists public.mkt_automations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null,                       -- welcome | drip | abandoned_cart | birthday | review
  enabled boolean not null default false,   -- opt-in only (merchant controls)
  config jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_mkt_automations_owner on public.mkt_automations(owner_id);

-- ── RLS: owner-scoped ────────────────────────────────────────────────────────
alter table public.mkt_contacts        enable row level security;
alter table public.mkt_segments        enable row level security;
alter table public.mkt_templates       enable row level security;
alter table public.mkt_campaigns       enable row level security;
alter table public.mkt_campaign_events enable row level security;
alter table public.mkt_automations     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['mkt_contacts','mkt_segments','mkt_templates','mkt_campaigns','mkt_automations']
  loop
    execute format($f$
      create policy "owner_all_%1$s" on public.%1$I
        for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
    $f$, t);
  end loop;
  -- events: visible/insertable via the owning campaign
  execute $f$
    create policy "owner_events" on public.mkt_campaign_events
      for all using (exists (select 1 from public.mkt_campaigns c where c.id = campaign_id and c.owner_id = auth.uid()))
      with check (exists (select 1 from public.mkt_campaigns c where c.id = campaign_id and c.owner_id = auth.uid()));
  $f$;
end $$;
