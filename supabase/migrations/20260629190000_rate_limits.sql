-- Reusable server-side rate limiting for expensive endpoints (LLM/image calls,
-- public abuse vectors). Edge functions call consume_rate_limit() with the
-- service role; it atomically increments a per-bucket counter inside a sliding
-- window and returns false when the caller is over the limit.
create table if not exists public.rate_limits (
  bucket text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

-- Only the service role / SECURITY DEFINER function touches this table.
alter table public.rate_limits enable row level security;

create or replace function public.consume_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.rate_limits (bucket, count, window_start)
    values (p_key, 1, now())
  on conflict (bucket) do update
    set count = case
          when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          then 1 else public.rate_limits.count + 1 end,
        window_start = case
          when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          then now() else public.rate_limits.window_start end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

-- Callable only by the service role (edge functions). Revoke from anon/auth.
revoke all on function public.consume_rate_limit(text, int, int) from public, anon, authenticated;
