-- Profitability + supplier management. All optional + internal-only (never shown to
-- shoppers). Lets merchants track real profit per product/order and per supplier.
alter table public.products
  add column if not exists cost_price numeric,
  add column if not exists supplier text;

-- Snapshot the cost at order time so historical profit stays accurate even if the
-- product's cost changes later (mirrors price_at_order).
alter table public.order_items
  add column if not exists cost_at_order numeric;
