-- Calendar-month billing anchor. billing_anchor_day = the day-of-month of the first
-- charge (1-31). Each cycle the monthly charge lands on this day, clamped to the
-- month's last day when it doesn't exist (e.g. anchor 30 -> Feb 28), then snaps back
-- to the anchor the following month. Avoids the drift of a fixed 30-day cycle.
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS billing_anchor_day integer;

-- Backfill existing active subscriptions from the day-of-month of their next charge
-- (fallback: creation day) so they keep a stable monthly date going forward.
UPDATE public.subscriptions
SET billing_anchor_day = EXTRACT(DAY FROM COALESCE(next_charge_at, created_at))::int
WHERE billing_anchor_day IS NULL;
