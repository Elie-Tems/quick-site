-- Rate limiting log table.
-- Edge functions insert a row on each request; rows older than 1 hour are
-- pruned automatically by the cleanup function below so the table stays small.

create table if not exists public.rate_limit_log (
  id          bigserial primary key,
  ip          text        not null,
  endpoint    text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists rate_limit_log_lookup_idx
  on public.rate_limit_log (ip, endpoint, created_at desc);

-- No RLS needed — only the service role (edge functions) writes to this table.
-- Anon/authenticated roles have no access.
alter table public.rate_limit_log enable row level security;

-- Cleanup function: call periodically (or at request time) to prune old rows.
create or replace function public.prune_rate_limit_log()
returns void language sql security definer as $$
  delete from public.rate_limit_log where created_at < now() - interval '1 hour';
$$;
