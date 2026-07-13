-- Admin refund of a Cardcom subscription charge (Siango -> shop owner), with a
-- two-gate flow: typed amount + a 6-digit OTP emailed to the acting admin.
--
-- 1) billing_charges gains the Cardcom TranzactionId (needed by RefundByTransactionId)
--    and a running refunded_amount so partial refunds can't exceed the charge.
-- 2) admin_refund_otps holds the short-lived OTP for gate #2. Only the service role
--    (edge function) ever reads/writes it - RLS on, no policies => denied to clients.

ALTER TABLE public.billing_charges
  ADD COLUMN IF NOT EXISTS provider_transaction_id text,
  ADD COLUMN IF NOT EXISTS refunded_amount numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.admin_refund_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  charge_id uuid NOT NULL,
  amount_ils numeric NOT NULL,
  transaction_id text,               -- resolved/entered Cardcom TranzactionId to refund
  code_hash text NOT NULL,           -- SHA-256 hex of the 6-digit code (never store plaintext)
  attempts int NOT NULL DEFAULT 0,   -- wrong-code attempts; locked after a few
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_refund_otps_lookup
  ON public.admin_refund_otps (admin_user_id, charge_id, created_at DESC);

ALTER TABLE public.admin_refund_otps ENABLE ROW LEVEL SECURITY;
-- No policies: only the edge function (service role) touches this table.
