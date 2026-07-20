-- consume_ai_credit(business_id) and decrement_variant_stock(variant_id, qty) are
-- SECURITY DEFINER functions with no ownership/auth check inside them - they trust
-- whatever id the caller passes. Both are only ever called server-side (edge
-- functions using the service role key): consume_ai_credit from
-- generate-hero-image, decrement_variant_stock from orders-create. Neither is
-- called from browser/client code, so revoking anon/authenticated execute rights
-- closes the exposure (any logged-in user draining another business's AI credits,
-- or any anonymous visitor zeroing out any merchant's variant stock via a direct
-- PostgREST RPC call) with no functional change for legitimate callers.

revoke execute on function public.consume_ai_credit(uuid) from public, anon, authenticated;
revoke execute on function public.decrement_variant_stock(uuid, integer) from public, anon, authenticated;

grant execute on function public.consume_ai_credit(uuid) to service_role;
grant execute on function public.decrement_variant_stock(uuid, integer) to service_role;
