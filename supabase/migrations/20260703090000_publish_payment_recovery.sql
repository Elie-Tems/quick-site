-- Failed / abandoned publish-checkout recovery.
--
-- WHY: a merchant who starts the publish payment but never completes it (payment
-- failed, closed the tab, got interrupted) leaves a `pending` publish_checkout_
-- sessions row and an unpublished store. We want to treat that like an abandoned
-- cart: after a few hours with no success, email a gentle recovery nudge (and a
-- second reminder a day later). These columns track that follow-up so the cron
-- job (publish-payment-recovery) is idempotent and never double-sends.

ALTER TABLE public.publish_checkout_sessions
  ADD COLUMN IF NOT EXISTS abandoned_at timestamptz,
  ADD COLUMN IF NOT EXISTS recovery_email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS recovery_email_count integer NOT NULL DEFAULT 0,
  -- Payer email captured at checkout creation. Lets the iCount IPN
  -- (icount-webhook) match a payment back to its session by the payer's email
  -- when iCount does not echo our session_token/business_id in the callback -
  -- the robust fallback that de-risks the whole publish-payment flow.
  ADD COLUMN IF NOT EXISTS email text;

CREATE INDEX IF NOT EXISTS idx_publish_sessions_email
  ON public.publish_checkout_sessions (lower(email));

-- The recovery job scans by (status, created_at); index it so the hourly sweep
-- stays cheap as the table grows.
CREATE INDEX IF NOT EXISTS idx_publish_sessions_status_created
  ON public.publish_checkout_sessions (status, created_at);
