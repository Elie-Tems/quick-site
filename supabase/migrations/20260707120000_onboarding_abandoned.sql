-- Abandoned-onboarding recovery: tracking columns + hourly cron.
--
-- WHY: users who sign up but never finish onboarding (onboarding_completed_at is
-- NULL) were the one lifecycle gap with no email at all - publish/payment
-- abandonment is handled by publish-payment-recovery and store-cart abandonment
-- by email-abandoned-run, but a sign-up that never reaches the builder's end got
-- nothing. This sweeps those profiles and sends onboardingAbandoned1 (~24h after
-- sign-up) then onboardingAbandoned2 (~72h). Idempotent, gated by the counters
-- below, so running hourly is safe.

-- 1. Per-profile nudge state (idempotent - safe to re-run).
alter table public.profiles
  add column if not exists onboarding_nudge_count integer not null default 0,
  add column if not exists onboarding_nudge_sent_at timestamptz;

-- 2. Schedule the sweep at minute 10 every hour (offset from the other siango-*
--    crons at minute 0). Mirrors them: anon Bearer + verify_jwt=false on the
--    function; CRON_SECRET unset so the optional x-cron-secret guard is skipped.
--    unschedule first so re-applying the migration doesn't error on a dup name.
select cron.unschedule('siango-onboarding-abandoned')
  where exists (select 1 from cron.job where jobname = 'siango-onboarding-abandoned');

select cron.schedule(
  'siango-onboarding-abandoned',
  '10 * * * *',
  $$
  select net.http_post(
    url := 'https://ytqgeoviokgxxwalieev.supabase.co/functions/v1/onboarding-abandoned',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cWdlb3Zpb2tneHh3YWxpZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMTA0NjYsImV4cCI6MjA4Njg4NjQ2Nn0.jeSSSbTP3CbKVjlzqlYavwoGqooLW7bLV9JQTY9RhD8'
    )
  );
  $$
);
