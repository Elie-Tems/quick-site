-- admin_grant_referral_reward(referred_user_email) was created as a SECURITY
-- DEFINER function meant to be called from the admin dashboard
-- (AdminReferrals.tsx), but had no has_role() check inside it - any
-- authenticated user could call it directly via supabase.rpc() and grant
-- themselves (or any throwaway account referred by them) free subscription
-- time via grant_referral_reward(), completely bypassing the real trigger
-- (process_referral_on_payment, which only fires on a confirmed successful
-- payment). Adds the same admin gate already used by the sibling
-- admin_signups_by_utm (20260626120000_siango_marketing.sql).
CREATE OR REPLACE FUNCTION public.admin_grant_referral_reward(referred_user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referred_uuid UUID;
BEGIN
  IF NOT has_role((select auth.uid()), 'admin'::app_role) THEN
    RETURN false;
  END IF;

  SELECT user_id INTO referred_uuid
  FROM profiles
  WHERE email = referred_user_email;

  IF referred_uuid IS NULL THEN
    RETURN false;
  END IF;

  RETURN grant_referral_reward(referred_uuid);
END;
$$;
