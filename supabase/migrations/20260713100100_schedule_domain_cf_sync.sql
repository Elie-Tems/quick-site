-- Schedule domain-cf-sync daily: connects/polls Cloudflare custom hostnames for
-- purchased domains so it never needs a manual step, and alerts admins as the
-- free-hostname quota (100) is approached. Safe to run even before Cloudflare
-- secrets are set - it no-ops (configured:false) until then.
--
-- Runs 05:00 UTC (08:00 Israel, after billing-charge-run at 07:00). Anon
-- Bearer + verify_jwt=false, like the other siango-* crons. CRON_SECRET optional.

select cron.schedule(
  'siango-domain-cf-sync',
  '0 5 * * *',
  $$
  select net.http_post(
    url := 'https://ytqgeoviokgxxwalieev.supabase.co/functions/v1/domain-cf-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cWdlb3Zpb2tneHh3YWxpZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMTA0NjYsImV4cCI6MjA4Njg4NjQ2Nn0.jeSSSbTP3CbKVjlzqlYavwoGqooLW7bLV9JQTY9RhD8'
    )
  );
  $$
);
