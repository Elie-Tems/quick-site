-- In-house uptime monitor (replaces an external service since we can't create
-- third-party accounts). A pg_cron job hits the uptime-check edge function every
-- 5 minutes; that function probes https://siango.app and emails the admins on a
-- DOWN/RECOVERY state change (state kept in public.system_status). Applied live
-- via the management API on 2026-06-25; recorded here for the migration history.

create table if not exists public.system_status (
  id int primary key default 1,
  is_up boolean not null default true,
  last_checked timestamptz,
  last_changed timestamptz,
  constraint system_status_single_row check (id = 1)
);
insert into public.system_status (id, is_up) values (1, true) on conflict (id) do nothing;
alter table public.system_status enable row level security; -- no policies: only service_role (the function) touches it

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule: every 5 minutes call the uptime-check function (anon bearer is public).
-- select cron.schedule('siango-uptime','*/5 * * * *', $job$
--   select net.http_post(
--     url:='https://ytqgeoviokgxxwalieev.supabase.co/functions/v1/uptime-check',
--     headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer <ANON_KEY>')
--   );
-- $job$);
