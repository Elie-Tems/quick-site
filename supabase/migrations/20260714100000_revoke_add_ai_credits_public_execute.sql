-- add_ai_credits is a SECURITY DEFINER credit-granting function with no payment
-- verification inside it - it trusts whatever business_id + amount the caller
-- passes. It is meant to be called ONLY server-side (service role) after a
-- confirmed charge (see supabase/functions/charge-addon), but was never revoked
-- from anon/authenticated, and src/pages/AICreditPayment.tsx calls it directly
-- from the browser the moment its own client-side poll sees a "paid" status on
-- a self-inserted row - letting any authenticated user grant themselves
-- unlimited free AI credits via devtools, with no real payment.
--
-- add_ai_credits has no CREATE FUNCTION migration in this repo (created outside
-- the migration flow), so its exact parameter signature isn't known here - this
-- revokes ALL overloads named add_ai_credits in the public schema, matching the
-- pattern already used for consume_ai_credit/decrement_variant_stock in
-- 20260720000000_revoke_public_rpc_execute.sql.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'add_ai_credits'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;
