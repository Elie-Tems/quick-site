-- Security: close the subscription self-service escalation.
--
-- protect_subscription_billing() (20260628190000_security_phase1) blocked non
-- service-role edits of paid_until/status/plan_name/monthly_total, but it was
-- written BEFORE the add-on entitlement flags and the self-managed-billing
-- columns were added. Those later columns were left UNPROTECTED, so a merchant
-- with the (legitimate) UPDATE-own-subscription policy could run e.g.
--   update subscriptions set crm_addon_enabled = true, analytics_addon_enabled = true
--     where user_id = auth.uid();
-- and unlock the paid CRM + Analytics add-ons for free (useCrmEntitled /
-- useAnalyticsEntitled read exactly these flags). Once self-managed billing is
-- live they could also zero their own charge (base_amount_ils = 0 /
-- coupon_discount_value = 100).
--
-- This redefines the guard to also lock every entitlement + billing column. The
-- cancellation fields (cancel_at/cancel_type/cancel_reason) stay user-writable,
-- exactly as before. Charges/entitlement are ALWAYS service-role driven.
CREATE OR REPLACE FUNCTION public.protect_subscription_billing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF NEW.paid_until             IS DISTINCT FROM OLD.paid_until
       OR NEW.status              IS DISTINCT FROM OLD.status
       OR NEW.plan_name           IS DISTINCT FROM OLD.plan_name
       OR NEW.monthly_total       IS DISTINCT FROM OLD.monthly_total
       -- entitlement flags (paid feature unlocks)
       OR NEW.crm_addon_enabled       IS DISTINCT FROM OLD.crm_addon_enabled
       OR NEW.crm_addon_price          IS DISTINCT FROM OLD.crm_addon_price
       OR NEW.analytics_addon_enabled  IS DISTINCT FROM OLD.analytics_addon_enabled
       OR NEW.analytics_addon_price    IS DISTINCT FROM OLD.analytics_addon_price
       -- self-managed billing amounts / coupon snapshot / token / schedule
       OR NEW.billing_provider         IS DISTINCT FROM OLD.billing_provider
       OR NEW.cc_token_id              IS DISTINCT FROM OLD.cc_token_id
       OR NEW.base_amount_ils          IS DISTINCT FROM OLD.base_amount_ils
       OR NEW.coupon_code              IS DISTINCT FROM OLD.coupon_code
       OR NEW.coupon_duration          IS DISTINCT FROM OLD.coupon_duration
       OR NEW.coupon_discount_type     IS DISTINCT FROM OLD.coupon_discount_type
       OR NEW.coupon_discount_value    IS DISTINCT FROM OLD.coupon_discount_value
       OR NEW.next_charge_at           IS DISTINCT FROM OLD.next_charge_at
       OR NEW.billing_cycle_count      IS DISTINCT FROM OLD.billing_cycle_count
       OR NEW.last_charge_status       IS DISTINCT FROM OLD.last_charge_status THEN
      RAISE EXCEPTION 'subscription billing/entitlement fields can only be changed by the billing system';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger already exists (trg_protect_subscription_billing); CREATE OR REPLACE
-- above swaps the function body in place, so no trigger change is needed.
