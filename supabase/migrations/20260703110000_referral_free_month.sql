-- Referral reward: when a merchant who was referred (profiles.referred_by) becomes
-- a PAYING subscriber, the referrer earns a free month on their own subscription.
-- Wired into the self-managed billing engine: the free month is consumed by the
-- billing cron (skip the charge, extend the period) instead of calling cc/bill.

-- Credit balance of free months on a subscription. The billing cron consumes one
-- per due cycle before it would otherwise charge.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS free_months_credit integer NOT NULL DEFAULT 0;

-- Audit + idempotency: one reward per referred merchant (so a re-fired IPN can't
-- grant the referrer multiple free months for the same referral).
CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  referred_user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reward_type text NOT NULL DEFAULT 'free_month',
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_user_id, reward_type)
);

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referrer reads own rewards" ON public.referral_rewards;
CREATE POLICY "referrer reads own rewards" ON public.referral_rewards
FOR SELECT USING (auth.uid() = referrer_user_id OR has_role((select auth.uid()), 'admin'::app_role));
