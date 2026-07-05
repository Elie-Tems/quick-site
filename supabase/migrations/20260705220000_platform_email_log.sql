-- Platform email audit trail: every transactional/lifecycle email Siango sends
-- (welcome, receipt, payment-failed, ...) is logged here on send, then updated by
-- the Resend webhook as it is delivered / opened / bounced. Gives the admin full
-- visibility: what was SENT, what was DELIVERED, and what was OPENED.

CREATE TABLE IF NOT EXISTS public.platform_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_type text NOT NULL,               -- siteReady | paymentReceipt | paymentFailed | ...
  to_email text NOT NULL,
  subject text,
  -- sent -> delivered -> opened  (or failed / skipped / bounced / complained)
  status text NOT NULL DEFAULT 'sent',
  provider text NOT NULL DEFAULT 'resend',
  provider_id text,                        -- Resend message id (correlates webhook events)
  error text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  opened_at timestamptz,
  bounced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_email_log_provider ON public.platform_email_log (provider_id);
CREATE INDEX IF NOT EXISTS idx_platform_email_log_to ON public.platform_email_log (to_email);
CREATE INDEX IF NOT EXISTS idx_platform_email_log_created ON public.platform_email_log (created_at DESC);

ALTER TABLE public.platform_email_log ENABLE ROW LEVEL SECURITY;

-- Admins read the audit. Writes are service-role only (send-platform-email +
-- resend-webhook); no INSERT/UPDATE policy => blocked for anon/authenticated.
DROP POLICY IF EXISTS "admin reads email log" ON public.platform_email_log;
CREATE POLICY "admin reads email log" ON public.platform_email_log
FOR SELECT USING (has_role((select auth.uid()), 'admin'::app_role));
