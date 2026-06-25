-- SECURITY FIX: these 4 tables had RLS disabled, so their (already-correct)
-- policies were dormant and the anon/public key could read/write every row -
-- exposing all user profiles and all order items, and letting anyone edit or
-- delete any store's products/categories. Enabling RLS activates the existing
-- policies. Verified after applying: storefront still reads products/categories
-- anonymously; profiles and order_items are no longer anon-readable.

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.order_items enable row level security;
alter table public.product_categories enable row level security;
