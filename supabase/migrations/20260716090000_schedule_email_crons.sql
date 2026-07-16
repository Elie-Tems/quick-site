-- Ensure the two email-marketing background jobs are scheduled (audit #21 flagged
-- them as missing). IMPORTANT: on production they were ALREADY scheduled under the
-- names siango-email-scheduled (*/15) and siango-email-abandoned (hourly), both
-- posting to email-scheduled-run / email-abandoned-run - so #21 was a false positive.
--
-- This migration is therefore GUARDED: it only creates a job if NO existing cron
-- already posts to that function, so it is a no-op on the current DB and correct on
-- a fresh one (never creating duplicates that would double-send). Both functions are
-- fail-closed on CRON_SECRET, so we extract the live secret from an existing job.

DO $$
DECLARE
  secret text;
  anon   text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cWdlb3Zpb2tneHh3YWxpZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMTA0NjYsImV4cCI6MjA4Njg4NjQ2Nn0.jeSSSbTP3CbKVjlzqlYavwoGqooLW7bLV9JQTY9RhD8';
BEGIN
  SELECT coalesce(
           (regexp_match(command, 'x-cron-secret''\s*,\s*''([^'']+)'''))[1],
           (regexp_match(command, 'secret=([^&'' ]+)'))[1]
         )
    INTO secret
    FROM cron.job
   WHERE command ~ 'x-cron-secret|secret='
   ORDER BY jobid
   LIMIT 1;

  IF secret IS NULL THEN
    RAISE NOTICE 'No existing cron carries CRON_SECRET; email crons NOT scheduled.';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE command LIKE '%email-scheduled-run%') THEN
    PERFORM cron.schedule('siango-email-scheduled', '*/15 * * * *',
      format($f$select net.http_post(url := 'https://ytqgeoviokgxxwalieev.supabase.co/functions/v1/email-scheduled-run', headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','%s','Authorization','Bearer %s'));$f$, secret, anon));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE command LIKE '%email-abandoned-run%') THEN
    PERFORM cron.schedule('siango-email-abandoned', '0 * * * *',
      format($f$select net.http_post(url := 'https://ytqgeoviokgxxwalieev.supabase.co/functions/v1/email-abandoned-run', headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','%s','Authorization','Bearer %s'));$f$, secret, anon));
  END IF;
END $$;
