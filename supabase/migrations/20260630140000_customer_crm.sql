-- Per-customer CRM data (manual tags + free-text notes) keyed by the merchant's
-- derived customer key (email/phone/name lowercased). The customer list itself is
-- still derived from orders; this only stores the merchant's own annotations.
create table if not exists public.customer_crm (
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_key text not null,
  tags text[] not null default '{}',
  notes text,
  updated_at timestamptz not null default now(),
  primary key (business_id, customer_key)
);

alter table public.customer_crm enable row level security;

create policy "owner manages own customer_crm"
  on public.customer_crm for all
  using (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()))
  with check (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()));
