-- Security hardening (2026-06-28), safe subset that doesn't touch live merchant
-- flows. Bigger RLS changes (subscriptions/ad_links/orders/payment_credentials)
-- are documented in docs/security-fix-plan and need app-flow verification first.

-- C6: drop the anon-readable payment secret column on businesses. It is unused
-- in app code (PayPlus creds live in payment_credentials), but the public
-- storefront reads businesses with select('*'), so any value here leaked.
ALTER TABLE public.businesses DROP COLUMN IF EXISTS payment_api_key;

-- H7: the paid-add-on flags must be set ONLY by the payment webhook (service
-- role), never by the owner via the client (which could enable paid features for
-- free and, for tracking, inject custom head code). Block non-service-role edits
-- of these flags. Merchants still freely edit their tag IDs / place id / toggles.
CREATE OR REPLACE FUNCTION public.protect_paid_addon_flags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    IF NEW.tracking_paid IS DISTINCT FROM OLD.tracking_paid
       OR NEW.reviews_paid IS DISTINCT FROM OLD.reviews_paid THEN
      RAISE EXCEPTION 'paid add-on flags can only be changed by the billing system';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_paid_addon_flags ON public.businesses;
CREATE TRIGGER trg_protect_paid_addon_flags
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.protect_paid_addon_flags();
