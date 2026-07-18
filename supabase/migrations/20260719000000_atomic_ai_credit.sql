-- Atomically deducts 1 AI credit for the given business.
-- Returns the new credits_remaining, or -1 if insufficient.
-- Using UPDATE ... RETURNING eliminates the read-check-write race condition.
create or replace function public.consume_ai_credit(p_business_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer;
begin
  update ai_credits
  set credits_remaining = credits_remaining - 1,
      updated_at = now()
  where business_id = p_business_id
    and credits_remaining >= 1
  returning credits_remaining into v_remaining;

  if not found then
    return -1;
  end if;

  return v_remaining;
end;
$$;
