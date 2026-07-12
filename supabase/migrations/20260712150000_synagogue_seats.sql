-- Synagogue vertical, part 2: seats (מקומות קבועים + מכירת מקומות לימים נוראים).
--
-- The gabbai defines a simple layout (rows x seats, plus an optional עזרת נשים
-- section); we generate one row per physical seat. A seat is available / sold /
-- held, can carry a price (by location) and a "for the High Holidays" flag. A
-- member buys/picks a seat later (part 4) - this migration is the data + the
-- gabbai management side.

create table if not exists public.synagogue_seat_maps (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  rows int not null default 10 check (rows between 1 and 60),
  seats_per_row int not null default 4 check (seats_per_row between 1 and 20),
  women_rows int not null default 0 check (women_rows between 0 and 60),
  config jsonb not null default '{}',   -- bima/amud notes, per-section pricing, etc.
  updated_at timestamptz not null default now()
);

create table if not exists public.synagogue_seats (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  section text not null default 'main' check (section in ('main','women')),
  row_num int not null,
  seat_num int not null,
  status text not null default 'available' check (status in ('available','sold','held')),
  holder_name text,
  holder_phone text,
  price numeric not null default 0 check (price >= 0),
  yamim_noraim boolean not null default false,   -- a High-Holidays seat
  updated_at timestamptz not null default now(),
  unique (business_id, section, row_num, seat_num)
);
create index if not exists idx_seats_business on public.synagogue_seats(business_id, status);

alter table public.synagogue_seat_maps enable row level security;
alter table public.synagogue_seats enable row level security;

-- Owner manages both. Public (anon) can READ seats of a published business so the
-- storefront seat picker (part 4) can show availability without exposing holders...
-- for now keep it owner-only; the member picker will go through an edge function.
drop policy if exists "owner manages own seat map" on public.synagogue_seat_maps;
create policy "owner manages own seat map" on public.synagogue_seat_maps for all
  using (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()))
  with check (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()));

drop policy if exists "owner manages own seats" on public.synagogue_seats;
create policy "owner manages own seats" on public.synagogue_seats for all
  using (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()))
  with check (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()));

drop trigger if exists trg_seat_maps_updated on public.synagogue_seat_maps;
create trigger trg_seat_maps_updated before update on public.synagogue_seat_maps
  for each row execute function public.update_updated_at_column();
drop trigger if exists trg_seats_updated on public.synagogue_seats;
create trigger trg_seats_updated before update on public.synagogue_seats
  for each row execute function public.update_updated_at_column();
