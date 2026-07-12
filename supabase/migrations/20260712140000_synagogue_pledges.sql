-- Synagogue vertical, part 1: aliyot & nedarim as pledges.
--
-- In a real shul nobody buys an aliyah in advance - the gabbai assigns it during
-- davening and the member COMMITS to a sum, then pays later. So we model it as a
-- pledge (התחייבות) that becomes an open debt and is marked paid when settled
-- (cash) or paid online. Kept as its own table (not transactions) so the gabbai
-- dashboard is simple and fast.

create table if not exists public.synagogue_pledges (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  member_name text not null,
  member_phone text,
  member_email text,
  contact_id uuid references public.contacts(id) on delete set null, -- link to CRM if known
  pledge_type text not null default 'aliyah' check (pledge_type in ('aliyah','neder','other')),
  label text,                         -- e.g. "מפטיר · שבת ויצא" / "נדר לרפואת..."
  amount numeric not null check (amount >= 0),
  status text not null default 'open' check (status in ('open','paid','cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists idx_pledges_business_status on public.synagogue_pledges(business_id, status);

alter table public.synagogue_pledges enable row level security;

drop policy if exists "owner manages own synagogue_pledges" on public.synagogue_pledges;
create policy "owner manages own synagogue_pledges" on public.synagogue_pledges for all
  using (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()))
  with check (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()));

drop trigger if exists trg_synagogue_pledges_updated on public.synagogue_pledges;
create trigger trg_synagogue_pledges_updated before update on public.synagogue_pledges
  for each row execute function public.update_updated_at_column();
