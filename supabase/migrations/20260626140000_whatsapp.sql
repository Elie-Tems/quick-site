-- WhatsApp Business Platform for Siango (BSP: Twilio). The highest-value future
-- revenue layer. Per the deploy rule (Moti, 2026-06-25): this is BUILT but the
-- feature is not surfaced/active until he approves. Tables are additive + inert.
--
-- Helper for owner RLS: business_id belongs to the current user.
--   business_id in (select b.id from businesses b
--     join profiles p on p.id = b.owner_id where p.user_id = auth.uid())
-- Edge functions use the service role and bypass RLS.

-- 1. The merchant's connected WhatsApp account (one per business).
create table if not exists public.whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  provider text not null default 'twilio',
  waba_id text,                       -- Meta WhatsApp Business Account id
  phone_number_id text,               -- Meta phone number id
  phone_number text,                  -- E.164, e.g. +972501234567
  display_name text,
  status text not null default 'pending', -- pending | connected | disabled | error
  quota_tier text,                    -- Meta messaging tier (e.g. TIER_1K)
  messaging_limit int,
  business_verified boolean default false,
  provider_sid text,                  -- Twilio sender/service sid
  connected_at timestamptz,
  -- AI service bot: the merchant writes a prompt (we may refine it with AI) and
  -- the inbound webhook auto-replies to customers based on it.
  bot_enabled boolean not null default false,
  bot_prompt text,
  -- Which events auto-send a WhatsApp (merchant settings).
  notify_new_order boolean not null default true,
  notify_shipping boolean not null default true,
  notify_reminders boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (business_id)
);

-- 2. The mailing list - the core of the broadcast area.
create table if not exists public.whatsapp_contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  phone text not null,                -- E.164
  name text,
  opted_in boolean not null default false,   -- marketing consent (Chok HaSpam + Meta)
  opt_in_at timestamptz,
  opt_in_source text,                 -- checkout | manual | import | inbound
  tags text[] default '{}',
  source text,
  last_message_at timestamptz,
  created_at timestamptz default now(),
  unique (business_id, phone)
);

-- 3. Message templates (Meta must pre-approve marketing/utility templates).
create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade, -- null = Siango platform template
  name text not null,
  category text not null default 'utility',  -- utility | marketing | authentication
  language text not null default 'he',
  header_text text,                          -- optional template header (text)
  body text not null,
  footer_text text,                          -- optional template footer
  buttons jsonb default '[]',                -- [{type:'quick_reply'|'url'|'call', text, value}]
  variables text[] default '{}',
  status text not null default 'draft',      -- draft | pending | approved | rejected
  meta_template_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Message log (per-message status + cost for usage billing).
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  campaign_id uuid,
  contact_phone text not null,
  direction text not null default 'out',     -- out | in
  template_name text,
  body text,
  status text not null default 'queued',     -- queued | sent | delivered | read | failed
  category text,                             -- utility | marketing | service
  cost numeric,
  provider_sid text,
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Broadcast campaigns.
create table if not exists public.whatsapp_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  template_id uuid references public.whatsapp_templates(id) on delete set null,
  audience_tag text,                  -- send to contacts with this tag (null = all opted-in)
  scheduled_at timestamptz,
  status text not null default 'draft',      -- draft | scheduled | sending | sent | failed
  total_count int default 0,
  sent_count int default 0,
  delivered_count int default 0,
  read_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. The add-on subscription (revenue): who took WhatsApp + quota + number flag.
create table if not exists public.whatsapp_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan text not null default 'standard',
  status text not null default 'active',     -- active | paused | cancelled
  includes_number boolean not null default false,
  monthly_quota int default 1000,
  used_this_period int default 0,
  period_start date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (business_id)
);

-- RLS: owners manage their own rows; admins read all; edge functions (service role) bypass.
do $$
declare t text;
begin
  foreach t in array array[
    'whatsapp_accounts','whatsapp_contacts','whatsapp_templates',
    'whatsapp_messages','whatsapp_campaigns','whatsapp_subscriptions'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format($f$
      create policy "owner manages own %1$s" on public.%1$I for all
      using (business_id in (
        select b.id from public.businesses b
        join public.profiles p on p.id = b.owner_id
        where p.user_id = (select auth.uid())
      ))
      with check (business_id in (
        select b.id from public.businesses b
        join public.profiles p on p.id = b.owner_id
        where p.user_id = (select auth.uid())
      ));
    $f$, t);
    execute format($f$
      create policy "admin reads %1$s" on public.%1$I for select
      using (has_role((select auth.uid()),'admin'::app_role));
    $f$, t);
  end loop;
end $$;

-- Platform (Siango) templates are readable by everyone (no business_id).
create policy "anyone reads platform templates" on public.whatsapp_templates
for select using (business_id is null);

create index if not exists idx_wa_contacts_business on public.whatsapp_contacts(business_id);
create index if not exists idx_wa_contacts_optin on public.whatsapp_contacts(business_id, opted_in);
create index if not exists idx_wa_messages_business on public.whatsapp_messages(business_id, created_at);
create index if not exists idx_wa_campaigns_business on public.whatsapp_campaigns(business_id);
create index if not exists idx_wa_accounts_phone on public.whatsapp_accounts(phone_number);
