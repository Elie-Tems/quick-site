-- Schedule the expire-subscriptions edge function as a daily cron.
--
-- WHY: expire-subscriptions exists and the dashboard relies on it to take a
-- store offline once an end-of-period cancellation reaches its paid-until date
-- (DashboardSubscription.tsx). It was never scheduled, so cancelled stores
-- stayed live indefinitely (free service after the paid period). This wires it
-- up. The job is idempotent - it only flips is_published true->false for
-- subscriptions that are cancelled + end_of_period + past cancel_at.
--
-- Runs daily at 03:00 UTC (06:00 Israel). Mirrors the existing siango-* crons:
-- anon Bearer + verify_jwt=false on the function. CRON_SECRET is not set, so
-- the function's optional x-cron-secret guard is skipped.

select cron.schedule(
  'siango-expire-subscriptions',
  '0 3 * * *',
  $$
  select net.http_post(
    url := 'https://ytqgeoviokgxxwalieev.supabase.co/functions/v1/expire-subscriptions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cWdlb3Zpb2tneHh3YWxpZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMTA0NjYsImV4cCI6MjA4Njg4NjQ2Nn0.jeSSSbTP3CbKVjlzqlYavwoGqooLW7bLV9JQTY9RhD8'
    )
  );
  $$
);
