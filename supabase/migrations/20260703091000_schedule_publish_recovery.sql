-- Schedule the publish-payment-recovery edge function hourly.
--
-- WHY: merchants who start the publish payment but never finish leave a pending
-- checkout + an unpublished store. This job sweeps those, emails a recovery
-- nudge after ~3h and a second reminder ~a day later. It's idempotent (gated by
-- recovery_email_count / recovery_email_sent_at), so running hourly is safe.
--
-- Runs at minute 0 every hour. Mirrors the existing siango-* crons: anon Bearer
-- + verify_jwt=false on the function. CRON_SECRET is not set, so the function's
-- optional x-cron-secret guard is skipped.

select cron.schedule(
  'siango-publish-payment-recovery',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://ytqgeoviokgxxwalieev.supabase.co/functions/v1/publish-payment-recovery',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cWdlb3Zpb2tneHh3YWxpZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMTA0NjYsImV4cCI6MjA4Njg4NjQ2Nn0.jeSSSbTP3CbKVjlzqlYavwoGqooLW7bLV9JQTY9RhD8'
    )
  );
  $$
);
