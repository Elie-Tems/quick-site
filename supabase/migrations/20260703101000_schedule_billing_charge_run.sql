-- Schedule the self-managed billing cron (billing-charge-run) daily.
--
-- DO NOT APPLY until the self-managed billing engine is live: the iCount
-- Credit-Card Storage module must be enabled, ICOUNT_PUBLISH_PAYPAGE_ID +
-- secrets set, and the flow tested with BILLING_TEST_MODE=true first. The job
-- is idempotent (per-cycle idempotency_key), so daily is safe once armed.
--
-- Runs 04:00 UTC (07:00 Israel). Anon Bearer + verify_jwt=false, like the other
-- siango-* crons. CRON_SECRET optional.

select cron.schedule(
  'siango-billing-charge-run',
  '0 4 * * *',
  $$
  select net.http_post(
    url := 'https://ytqgeoviokgxxwalieev.supabase.co/functions/v1/billing-charge-run',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cWdlb3Zpb2tneHh3YWxpZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMTA0NjYsImV4cCI6MjA4Njg4NjQ2Nn0.jeSSSbTP3CbKVjlzqlYavwoGqooLW7bLV9JQTY9RhD8'
    )
  );
  $$
);
