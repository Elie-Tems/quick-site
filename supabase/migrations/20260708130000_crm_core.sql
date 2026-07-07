-- Phase 3: multi-vertical CRM. ADDITIVE + backward-compatible - the current
-- order-derived customer list (DashboardCustomers.tsx) keeps working untouched.
-- New: a standalone `contacts` entity, one typed `transactions` table (orders
-- stays the source of truth and flows into it via trigger), and a data-driven
-- pipeline. See docs/design-crm-model.md.

-- Same dedup formula as the frontend (DashboardCustomers.tsx:160):
--   lower(trim( coalesce(email, phone, name) ))  -> so a contact and its
-- order-derived twin collapse to one row.
create or replace function public.crm_dedup_key(p_email text, p_phone text, p_name text)
returns text language sql immutable as $$
  select lower(trim(coalesce(nullif(trim(p_email),''), nullif(trim(p_phone),''), nullif(trim(p_name),''), '')));
$$;

-- ---------- contacts ----------
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text,
  phone text,
  email text,
  source text not null default 'manual' check (source in ('manual','order','import','form','api','lead_form')),
  dedup_key text not null,
  tags text[] not null default '{}',
  notes text,
  ltv_cached numeric,
  last_txn_at timestamptz,
  txn_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, dedup_key),
  constraint contacts_has_identity check (coalesce(nullif(trim(name),''), phone, email) is not null)
);
create index if not exists idx_contacts_business on public.contacts(business_id);
create index if not exists idx_contacts_phone on public.contacts(business_id, phone);
create index if not exists idx_contacts_email on public.contacts(business_id, email);

-- ---------- transactions (typed; orders stays source of truth) ----------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  kind text not null check (kind in ('order','appointment','lead','donation')),
  amount numeric,
  currency text not null default 'ILS',
  status text,
  occurred_at timestamptz not null default now(),
  source_table text,
  source_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (source_table, source_id)
);
create index if not exists idx_txn_business_contact on public.transactions(business_id, contact_id);
create index if not exists idx_txn_kind on public.transactions(business_id, kind, occurred_at);

-- ---------- pipelines (data-driven stages) ----------
create table if not exists public.pipelines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  vertical text not null,
  name text not null,
  stages jsonb not null default '[]',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.pipeline_cards (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  stage_key text not null,
  title text,
  value numeric,
  follow_up_at timestamptz,
  details jsonb not null default '{}',
  status text not null default 'open' check (status in ('open','won','lost')),
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_cards_business_stage on public.pipeline_cards(business_id, stage_key);
create index if not exists idx_cards_followup on public.pipeline_cards(business_id, follow_up_at) where status = 'open';

create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  card_id uuid references public.pipeline_cards(id) on delete cascade,
  kind text not null,
  body text,
  meta jsonb not null default '{}',
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_interactions_contact on public.interactions(business_id, contact_id, occurred_at desc);

-- Section 46 toggle - OFF by default, never assumed (not every nonprofit has it).
alter table public.businesses add column if not exists section46_enabled boolean not null default false;

-- ---------- updated_at triggers ----------
drop trigger if exists trg_contacts_updated on public.contacts;
create trigger trg_contacts_updated before update on public.contacts for each row execute function public.update_updated_at_column();
drop trigger if exists trg_pipeline_cards_updated on public.pipeline_cards;
create trigger trg_pipeline_cards_updated before update on public.pipeline_cards for each row execute function public.update_updated_at_column();

-- ---------- keep contacts+transactions in sync with orders (forward) ----------
create or replace function public.sync_order_to_crm()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_key text; v_contact uuid;
begin
  v_key := public.crm_dedup_key(new.customer_email, new.customer_phone, new.customer_name);
  if v_key = '' then return new; end if;
  insert into public.contacts (business_id, name, phone, email, source, dedup_key, txn_count, last_txn_at)
    values (new.business_id, new.customer_name, new.customer_phone, new.customer_email, 'order', v_key, 1, new.created_at)
  on conflict (business_id, dedup_key) do update
    set phone = coalesce(public.contacts.phone, excluded.phone),
        email = coalesce(public.contacts.email, excluded.email),
        name  = coalesce(public.contacts.name, excluded.name),
        txn_count = public.contacts.txn_count + 1,
        last_txn_at = greatest(coalesce(public.contacts.last_txn_at, new.created_at), new.created_at),
        updated_at = now()
  returning id into v_contact;
  insert into public.transactions (business_id, contact_id, kind, amount, status, occurred_at, source_table, source_id)
    values (new.business_id, v_contact, 'order', new.total_price, new.status, new.created_at, 'orders', new.id)
  on conflict (source_table, source_id) do nothing;
  return new;
end $$;
drop trigger if exists trg_order_to_crm on public.orders;
create trigger trg_order_to_crm after insert on public.orders for each row execute function public.sync_order_to_crm();

-- ---------- backfill existing orders (idempotent) ----------
insert into public.contacts (business_id, name, phone, email, source, dedup_key, txn_count, last_txn_at)
select o.business_id, min(o.customer_name), min(o.customer_phone), min(o.customer_email), 'order',
       public.crm_dedup_key(o.customer_email, o.customer_phone, o.customer_name),
       count(*), max(o.created_at)
from public.orders o
where public.crm_dedup_key(o.customer_email, o.customer_phone, o.customer_name) <> ''
group by o.business_id, public.crm_dedup_key(o.customer_email, o.customer_phone, o.customer_name)
on conflict (business_id, dedup_key) do nothing;

insert into public.transactions (business_id, contact_id, kind, amount, status, occurred_at, source_table, source_id)
select o.business_id, c.id, 'order', o.total_price, o.status, o.created_at, 'orders', o.id
from public.orders o
join public.contacts c on c.business_id = o.business_id
  and c.dedup_key = public.crm_dedup_key(o.customer_email, o.customer_phone, o.customer_name)
on conflict (source_table, source_id) do nothing;

-- ---------- backward-compat view (legacy customer_crm tags/notes by same key) ----------
create or replace view public.customer_contacts as
  select c.*, cr.tags as legacy_tags, cr.notes as legacy_notes
  from public.contacts c
  left join public.customer_crm cr on cr.business_id = c.business_id and cr.customer_key = c.dedup_key;

-- ---------- RLS ----------
alter table public.contacts enable row level security;
alter table public.transactions enable row level security;
alter table public.pipelines enable row level security;
alter table public.pipeline_cards enable row level security;
alter table public.interactions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['contacts','transactions','pipelines','pipeline_cards','interactions'] loop
    execute format('drop policy if exists "owner manages own %1$s" on public.%1$s;', t);
    execute format($p$
      create policy "owner manages own %1$s" on public.%1$s for all
      using (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()))
      with check (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()));
    $p$, t);
  end loop;
end $$;
