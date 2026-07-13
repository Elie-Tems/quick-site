-- Product variants: color x size combinations with per-combination stock.
-- For clothing/shoe stores. A product with zero variant rows behaves exactly as
-- today (the products table is unchanged) - full backward compatibility.

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  color text,               -- e.g. "שחור" (null if the product has no color axis)
  color_hex text,           -- swatch color, e.g. "#000000"
  size text,                -- e.g. "M" / "42" (null if no size axis)
  sku text,
  stock integer not null default 0,
  price_override numeric,   -- null = use the product's price
  image_url text,           -- optional per-color image
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_variants_product_idx on public.product_variants (product_id);
create index if not exists product_variants_business_idx on public.product_variants (business_id);

alter table public.product_variants enable row level security;

-- Storefront (anon + logged-in) reads variants to show colors/sizes/stock.
drop policy if exists "public reads product variants" on public.product_variants;
create policy "public reads product variants"
  on public.product_variants for select using (true);

-- Owner manages their own variants. owner_id references profiles.id (NOT
-- auth.uid()), so join through profiles - the correct pattern.
drop policy if exists "owner manages product variants" on public.product_variants;
create policy "owner manages product variants"
  on public.product_variants for all
  using (
    business_id in (
      select b.id from public.businesses b
      join public.profiles p on p.id = b.owner_id
      where p.user_id = auth.uid()
    )
  )
  with check (
    business_id in (
      select b.id from public.businesses b
      join public.profiles p on p.id = b.owner_id
      where p.user_id = auth.uid()
    )
  );

-- Atomic stock decrement for a purchased variant (used by orders-create via
-- service role). Never goes below 0; returns the resulting stock.
create or replace function public.decrement_variant_stock(p_variant_id uuid, p_qty integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new integer;
begin
  update public.product_variants
    set stock = greatest(0, stock - greatest(0, p_qty)), updated_at = now()
    where id = p_variant_id
    returning stock into v_new;
  return v_new;
end;
$$;
