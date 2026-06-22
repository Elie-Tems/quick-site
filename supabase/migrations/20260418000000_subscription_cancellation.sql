-- Subscription cancellation: track when and how a cancellation takes effect.
--   cancel_type = 'immediate'      → store taken down now (is_published=false on cancel)
--   cancel_type = 'end_of_period'  → store stays live until cancel_at (= paid_until), then down
-- No refunds: the already-paid period is never refunded (policy).

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_type text CHECK (cancel_type IN ('immediate', 'end_of_period'));

COMMENT ON COLUMN public.subscriptions.cancel_at IS 'When the cancellation takes effect (now for immediate, paid_until for end_of_period)';
COMMENT ON COLUMN public.subscriptions.cancel_type IS 'immediate | end_of_period';
