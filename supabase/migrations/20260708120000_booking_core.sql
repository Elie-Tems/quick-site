-- Phase 2: Booking / appointments engine (v1 - internal availability, no external
-- calendar sync yet; the calendar_* tables are created here but wired in a later
-- migration/functions). Matches existing conventions: owner RLS via the
-- businesses->profiles->auth.uid() chain (like customer_crm), public read gated on
-- is_published, gen_random_uuid + timestamptz, shared update_updated_at_column().
-- See docs/design-calendar-sync.md.

create extension if not exists btree_gist;

-- ---------- helper: owner-scoped predicate is inlined per policy (matches repo) ----------

-- =========================================================================
-- 1. Services (what a customer can book)
-- =========================================================================
create table if not exists public.booking_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes int not null default 30,
  buffer_before_minutes int not null default 0,
  buffer_after_minutes int not null default 0,
  price numeric(10,2) not null default 0,
  deposit_type text not null default 'none' check (deposit_type in ('none','fixed','percent')),
  deposit_value numeric(10,2) not null default 0,
  color text,
  active boolean not null default true,
  sort_order int not null default 0,
  min_notice_minutes int not null default 0,
  max_advance_days int not null default 60,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_booking_services_biz on public.booking_services(business_id, active, sort_order);

-- =========================================================================
-- 2. Staff / bookable resource
-- =========================================================================
create table if not exists public.booking_staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text,
  timezone text not null default 'Asia/Jerusalem',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_booking_staff_biz on public.booking_staff(business_id, active);

-- 3. Which staff perform which service
create table if not exists public.booking_service_staff (
  service_id uuid not null references public.booking_services(id) on delete cascade,
  staff_id uuid not null references public.booking_staff(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  primary key (service_id, staff_id)
);
create index if not exists idx_booking_service_staff_biz on public.booking_service_staff(business_id);

-- =========================================================================
-- 4. Weekly working hours per staff (local minutes from midnight, tz-resolved)
-- =========================================================================
create table if not exists public.booking_working_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid not null references public.booking_staff(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0=Sunday
  start_minute smallint not null check (start_minute between 0 and 1440),
  end_minute smallint not null check (end_minute between 0 and 1440),
  created_at timestamptz not null default now(),
  check (end_minute > start_minute)
);
create index if not exists idx_booking_hours_staff on public.booking_working_hours(staff_id, weekday);

-- 5. One-off closures / manual blocks
create table if not exists public.booking_blackouts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid references public.booking_staff(id) on delete cascade, -- null = whole business
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists idx_booking_blackouts_biz on public.booking_blackouts(business_id, starts_at);

-- =========================================================================
-- 6. Appointments (the core record)
-- =========================================================================
create table if not exists public.booking_appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid not null references public.booking_services(id) on delete restrict,
  staff_id uuid not null references public.booking_staff(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending','confirmed','cancelled','completed','no_show')),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  notes text,
  internal_notes text,
  price_at_booking numeric(10,2) not null default 0,
  deposit_amount numeric(10,2) not null default 0,
  deposit_status text not null default 'none' check (deposit_status in ('none','pending','paid','refunded')),
  order_id uuid references public.orders(id) on delete set null,
  source text not null default 'storefront' check (source in ('storefront','dashboard','import')),
  hold_expires_at timestamptz,
  cancel_token text,
  google_event_id text,
  ms_event_id text,
  sync_state text not null default 'local_only' check (sync_state in ('pending','synced','error','local_only')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists idx_appt_staff_time on public.booking_appointments(staff_id, starts_at);
create index if not exists idx_appt_biz_time on public.booking_appointments(business_id, starts_at);
create index if not exists idx_appt_biz_status on public.booking_appointments(business_id, status, starts_at);

-- Hard DB guarantee against double-booking: no two active appointments for the
-- same staff may overlap. Concurrent bookings racing for a slot fail loudly.
alter table public.booking_appointments drop constraint if exists no_staff_overlap;
alter table public.booking_appointments
  add constraint no_staff_overlap
  exclude using gist (
    staff_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending','confirmed'));

-- =========================================================================
-- 7. Calendar connections (OAuth) - secrets table, service-role only. v1: unused.
-- =========================================================================
create table if not exists public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid not null references public.booking_staff(id) on delete cascade,
  provider text not null check (provider in ('google','microsoft')),
  provider_account_email text,
  access_token_enc text,
  refresh_token_enc text,
  token_expires_at timestamptz,
  scopes text,
  primary_calendar_id text,
  sync_token text,
  delta_link text,
  watch_channel_id text,
  watch_resource_id text,
  watch_expires_at timestamptz,
  subscription_id text,
  status text not null default 'active' check (status in ('active','needs_reauth','revoked','error')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, provider)
);
create index if not exists idx_cal_conn_watch on public.calendar_connections(watch_expires_at);

-- 8. Cached external busy intervals (subtracted from availability)
create table if not exists public.calendar_busy_blocks (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.calendar_connections(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  staff_id uuid not null references public.booking_staff(id) on delete cascade,
  external_event_id text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_all_day boolean not null default false,
  etag text,
  updated_at timestamptz not null default now(),
  unique (connection_id, external_event_id)
);
create index if not exists idx_busy_staff_time on public.calendar_busy_blocks(staff_id, starts_at, ends_at);

-- 9. Sync audit / idempotency log
create table if not exists public.calendar_sync_log (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid references public.calendar_connections(id) on delete cascade,
  direction text check (direction in ('inbound','outbound')),
  action text,
  external_event_id text,
  appointment_id uuid references public.booking_appointments(id) on delete set null,
  result text,
  detail text,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- updated_at touch triggers (shared repo function)
-- =========================================================================
drop trigger if exists trg_booking_services_updated on public.booking_services;
create trigger trg_booking_services_updated before update on public.booking_services
  for each row execute function public.update_updated_at_column();
drop trigger if exists trg_booking_staff_updated on public.booking_staff;
create trigger trg_booking_staff_updated before update on public.booking_staff
  for each row execute function public.update_updated_at_column();
drop trigger if exists trg_booking_appt_updated on public.booking_appointments;
create trigger trg_booking_appt_updated before update on public.booking_appointments
  for each row execute function public.update_updated_at_column();
drop trigger if exists trg_cal_conn_updated on public.calendar_connections;
create trigger trg_cal_conn_updated before update on public.calendar_connections
  for each row execute function public.update_updated_at_column();

-- =========================================================================
-- RLS
-- =========================================================================
alter table public.booking_services enable row level security;
alter table public.booking_staff enable row level security;
alter table public.booking_service_staff enable row level security;
alter table public.booking_working_hours enable row level security;
alter table public.booking_blackouts enable row level security;
alter table public.booking_appointments enable row level security;
alter table public.calendar_connections enable row level security;
alter table public.calendar_busy_blocks enable row level security;
alter table public.calendar_sync_log enable row level security;

-- Owner-manages-own on every table (subquery pattern, matches customer_crm).
do $$
declare t text;
begin
  foreach t in array array[
    'booking_services','booking_staff','booking_service_staff','booking_working_hours',
    'booking_blackouts','booking_appointments','calendar_connections','calendar_busy_blocks','calendar_sync_log'
  ] loop
    execute format('drop policy if exists "owner manages own %1$s" on public.%1$s;', t);
    execute format($p$
      create policy "owner manages own %1$s" on public.%1$s for all
      using (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()))
      with check (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()));
    $p$, t);
  end loop;
end $$;
-- calendar_sync_log has no business_id in its own right; scope via connection.
drop policy if exists "owner manages own calendar_sync_log" on public.calendar_sync_log;
create policy "owner reads own calendar_sync_log" on public.calendar_sync_log for select
  using (connection_id in (
    select c.id from public.calendar_connections c
    join public.businesses b on b.id = c.business_id
    join public.profiles p on p.id = b.owner_id
    where p.user_id = auth.uid()
  ));

-- Public storefront read: active services + active staff of a PUBLISHED business.
-- (Availability + appointment writes go through service-role edge functions, never
-- direct anon writes. calendar_* + appointments have NO anon policy.)
drop policy if exists "public reads active services" on public.booking_services;
create policy "public reads active services" on public.booking_services for select
  using (active = true and business_id in (select id from public.businesses where is_published = true));

drop policy if exists "public reads active staff" on public.booking_staff;
create policy "public reads active staff" on public.booking_staff for select
  using (active = true and business_id in (select id from public.businesses where is_published = true));
