-- Schedule the two booking background jobs.
--
-- ⚠️ APPLY IN THE SQL EDITOR, SUBSTITUTING THE REAL CRON_SECRET (do NOT commit the
-- secret value). Both endpoints are secret-gated:
--   - booking-holds-sweep expects ?secret=<CRON_SECRET> (releases expired unpaid
--     deposit holds so the slot returns to availability). Only relevant once a
--     merchant uses deposits; harmless/idempotent to run otherwise.
--   - calendar-sync expects the x-cron-secret header (full sync of every active
--     Google Calendar connection). Pointless until the GOOGLE_* / CALENDAR_TOKEN_KEY
--     secrets are set - schedule it together with enabling calendar sync.
--
-- Replace __CRON_SECRET__ below with the value of the CRON_SECRET edge secret.

-- Release expired deposit holds every 15 minutes.
select cron.schedule(
  'siango-booking-holds-sweep',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://ytqgeoviokgxxwalieev.supabase.co/functions/v1/booking-holds-sweep?secret=__CRON_SECRET__',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cWdlb3Zpb2tneHh3YWxpZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMTA0NjYsImV4cCI6MjA4Njg4NjQ2Nn0.jeSSSbTP3CbKVjlzqlYavwoGqooLW7bLV9JQTY9RhD8'
    )
  );
  $$
);

-- Full Google Calendar sync hourly (only useful once calendar secrets are set).
select cron.schedule(
  'siango-calendar-sync',
  '17 * * * *',
  $$
  select net.http_post(
    url := 'https://ytqgeoviokgxxwalieev.supabase.co/functions/v1/calendar-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '__CRON_SECRET__',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cWdlb3Zpb2tneHh3YWxpZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMTA0NjYsImV4cCI6MjA4Njg4NjQ2Nn0.jeSSSbTP3CbKVjlzqlYavwoGqooLW7bLV9JQTY9RhD8'
    )
  );
  $$
);
