-- Security phase 1 - money integrity.
-- H1: a user could UPDATE their own subscription row (policy had no WITH CHECK)
-- and set paid_until far in the future = free forever. Block non-service-role
-- edits of the BILLING fields, while still allowing cancellation fields
-- (cancel_at/cancel_type/cancel_reason) which the user legitimately sets.
CREATE OR REPLACE FUNCTION public.protect_subscription_billing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF NEW.paid_until    IS DISTINCT FROM OLD.paid_until
       OR NEW.status     IS DISTINCT FROM OLD.status
       OR NEW.plan_name  IS DISTINCT FROM OLD.plan_name
       OR NEW.monthly_total IS DISTINCT FROM OLD.monthly_total THEN
      RAISE EXCEPTION 'subscription billing fields can only be changed by the billing system';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_subscription_billing ON public.subscriptions;
CREATE TRIGGER trg_protect_subscription_billing
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.protect_subscription_billing();
