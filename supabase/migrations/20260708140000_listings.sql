-- Phase 4: Listings (real estate / vehicles / generic catalog-of-inquiry). An
-- "offering" whose transaction is a LEAD (via contacts-capture -> pipeline), not
-- a cart order. Rich attrs live in jsonb so a new listing type needs no schema
-- change. Media (photos/video/360) also jsonb. See docs/design-crm-model.md.

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null default 'property' check (kind in ('property','vehicle','generic')),
  title text not null,
  description text,
  price numeric,
  currency text not null default 'ILS',
  price_period text,                       -- null (sale) | 'month' (rent)
  category text,                            -- 'sale'|'rent'|'commercial' | vehicle segment
  status text not null default 'available' check (status in ('available','under_offer','sold','rented','archived')),
  is_hot boolean not null default false,    -- "מציאה"
  city text,
  address text,
  lat numeric,
  lng numeric,
  -- type-specific attributes: {rooms,size_sqm,floor,...} or {make,model,year,km,hand,gear,fuel}
  attrs jsonb not null default '{}',
  -- media: {images:[url], video:url, tour360:url, floor_plan:url}
  media jsonb not null default '{}',
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_listings_biz on public.listings(business_id, active, sort_order);
create index if not exists idx_listings_biz_cat on public.listings(business_id, category, status);
create index if not exists idx_listings_hot on public.listings(business_id, is_hot) where is_hot = true;

drop trigger if exists trg_listings_updated on public.listings;
create trigger trg_listings_updated before update on public.listings for each row execute function public.update_updated_at_column();

alter table public.listings enable row level security;

drop policy if exists "owner manages own listings" on public.listings;
create policy "owner manages own listings" on public.listings for all
  using (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()))
  with check (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()));

-- Public read: active listings of a published business (like the product catalog).
drop policy if exists "public reads active listings" on public.listings;
create policy "public reads active listings" on public.listings for select
  using (active = true and business_id in (select id from public.businesses where is_published = true));
