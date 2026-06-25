-- Tracks when a merchant opens a payment/billing partner account through us
-- (the "open account" buttons in the dashboard). Feeds the admin partner-
-- earnings panel so we can see how many merchants we referred to each partner.
-- Applied live via the management API on 2026-06-25.

create table if not exists public.partner_referrals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  provider text not null,
  created_at timestamptz not null default now()
);
alter table public.partner_referrals enable row level security;

create policy "owner inserts own referral" on public.partner_referrals
for insert with check (
  business_id in (
    select b.id from public.businesses b
    join public.profiles p on p.id = b.owner_id
    where p.user_id = (select auth.uid())
  )
);

create policy "admin reads referrals" on public.partner_referrals
for select using (has_role((select auth.uid()), 'admin'::app_role));

create index if not exists idx_partner_referrals_provider on public.partner_referrals(provider);
