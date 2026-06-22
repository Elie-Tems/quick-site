-- Capture an optional cancellation reason for retention insight.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_reason text;

COMMENT ON COLUMN public.subscriptions.cancel_reason IS 'Optional reason the owner gave when cancelling (retention analytics)';
