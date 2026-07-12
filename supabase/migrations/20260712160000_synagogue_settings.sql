-- Synagogue vertical, part 3: prayer-time config + the live display screen.
--
-- The gabbai sets fixed prayer times, a location (for computed zmanim via Hebcal),
-- a "parnas of the day" and rolling announcements. The public display screen and
-- the storefront read this. Zmanim themselves are computed live (not stored) by the
-- synagogue-zmanim edge function.

create table if not exists public.synagogue_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  city text,                          -- display + geoname
  latitude numeric,                   -- for zmanim (Hebcal)
  longitude numeric,
  nusach text,                        -- אשכנז / ספרד / עדות המזרח...
  prayer_times jsonb not null default '{}',  -- {shacharit, mincha, maariv, shabbat_in, daf_yomi, ...}
  parnas text,                        -- פרנס היום (sponsor)
  announcements text,                 -- rolling ticker text
  updated_at timestamptz not null default now()
);

alter table public.synagogue_settings enable row level security;

-- Owner writes; anyone can READ (the display screen + storefront are public and
-- show only non-sensitive info: times, sponsor, announcements).
drop policy if exists "owner manages own synagogue_settings" on public.synagogue_settings;
create policy "owner manages own synagogue_settings" on public.synagogue_settings for all
  using (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()))
  with check (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()));

drop policy if exists "public reads synagogue_settings" on public.synagogue_settings;
create policy "public reads synagogue_settings" on public.synagogue_settings for select
  using (true);

drop trigger if exists trg_synagogue_settings_updated on public.synagogue_settings;
create trigger trg_synagogue_settings_updated before update on public.synagogue_settings
  for each row execute function public.update_updated_at_column();
