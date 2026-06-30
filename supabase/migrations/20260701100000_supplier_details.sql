-- Supplier cards. The supplier *list* is derived from products.supplier (the names
-- merchants type on products); this table holds the extra contact/notes per supplier
-- so suppliers become real, manageable entities - not just a text field per product.
create table if not exists public.supplier_details (
  business_id uuid not null references public.businesses(id) on delete cascade,
  supplier_name text not null,
  phone text,
  email text,
  contact_name text,
  notes text,
  updated_at timestamptz not null default now(),
  primary key (business_id, supplier_name)
);

alter table public.supplier_details enable row level security;

create policy "owner manages own supplier_details"
  on public.supplier_details for all
  using (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()))
  with check (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()));
