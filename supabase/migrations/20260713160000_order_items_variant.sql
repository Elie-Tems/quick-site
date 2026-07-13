-- Record the chosen variant (color/size) on each order line, so the merchant
-- knows exactly what to pack. Null for products without variants.
alter table public.order_items
  add column if not exists variant_id uuid,
  add column if not exists variant_color text,
  add column if not exists variant_size text;
