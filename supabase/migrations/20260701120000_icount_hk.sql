-- iCount recurring-billing (הוראת קבע) support on subscriptions.
-- When a merchant pays on a "הוראת קבע" iCount page, the IPN returns an hk_id
-- (the recurring-billing profile id). We store it so a merchant cancellation can
-- call iCount's hk/cancel and actually STOP future charges - not just flag our DB.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS icount_hk_id text;

COMMENT ON COLUMN public.subscriptions.icount_hk_id IS
  'iCount hk_id (recurring billing profile). Cancel the standing order via POST https://api.icount.co.il/api/v3.php/hk/cancel {hk_id}.';
