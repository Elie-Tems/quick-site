-- Schedule the two email-marketing background jobs that were documented as
-- "invoked by pg_cron" but never actually scheduled (audit finding #21):
--   - email-scheduled-run  : sends campaigns whose scheduled time has arrived.
--   - email-abandoned-run  : sends abandoned-cart reminder emails.
-- Both edge functions are FAIL-CLOSED on the CRON_SECRET (they 401 unless the
-- x-cron-secret header matches). We never store the secret in the repo, so this
-- migration extracts the live CRON_SECRET from an existing scheduled job that
-- already carries it, then (re)schedules both jobs with it. Idempotent:
-- cron.schedule upserts by job name.
--
-- If no existing job carries the secret (fresh project), it raises a NOTICE and
-- skips - set CRON_SECRET on a scheduled job first, then re-run.

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
    RAISE NOTICE 'No existing cron carries CRON_SECRET; email crons NOT scheduled. Set CRON_SECRET on a job and re-run.';
    RETURN;
  END IF;

  PERFORM cron.schedule(
    'siango-email-scheduled-run',
    '*/5 * * * *',
    format($f$select net.http_post(
      url := 'https://ytqgeoviokgxxwalieev.supabase.co/functions/v1/email-scheduled-run',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','%s','Authorization','Bearer %s')
    );$f$, secret, anon)
  );

  PERFORM cron.schedule(
    'siango-email-abandoned-run',
    '0 * * * *',
    format($f$select net.http_post(
      url := 'https://ytqgeoviokgxxwalieev.supabase.co/functions/v1/email-abandoned-run',
      headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','%s','Authorization','Bearer %s')
    );$f$, secret, anon)
  );

  RAISE NOTICE 'Scheduled siango-email-scheduled-run (*/5m) + siango-email-abandoned-run (hourly).';
END $$;
