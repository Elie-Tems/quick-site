-- Create function to process referral reward after successful payment
CREATE OR REPLACE FUNCTION public.process_referral_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  paying_user_id UUID;
  referrer_code TEXT;
  referrer_user_id UUID;
  already_rewarded BOOLEAN;
BEGIN
  -- Only process successful payments
  IF NEW.status != 'success' THEN
    RETURN NEW;
  END IF;
  
  -- Get the user_id from the order if exists, otherwise try to match by email
  IF NEW.order_id IS NOT NULL THEN
    -- For now, we need to find the user by email from profiles
    SELECT p.user_id, p.referred_by INTO paying_user_id, referrer_code
    FROM profiles p
    WHERE p.email = NEW.customer_email;
  ELSE
    -- Direct payment - find user by email
    SELECT p.user_id, p.referred_by INTO paying_user_id, referrer_code
    FROM profiles p
    WHERE p.email = NEW.customer_email;
  END IF;
  
  -- If no user found or no referrer, exit
  IF paying_user_id IS NULL OR referrer_code IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Check if reward was already given for this referred user
  SELECT EXISTS(
    SELECT 1 FROM referral_logs 
    WHERE referred_user_id = paying_user_id AND reward_given = true
  ) INTO already_rewarded;
  
  IF already_rewarded THEN
    RETURN NEW;
  END IF;
  
  -- Grant the reward using existing function
  PERFORM grant_referral_reward(paying_user_id);
  
  RETURN NEW;
END;
$$;

-- Create trigger on payments table
DROP TRIGGER IF EXISTS trigger_referral_reward_on_payment ON public.payments;
CREATE TRIGGER trigger_referral_reward_on_payment
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION process_referral_on_payment();

-- Also create a manual function for granting rewards from admin dashboard
CREATE OR REPLACE FUNCTION public.admin_grant_referral_reward(referred_user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referred_uuid UUID;
BEGIN
  -- Get user_id from email
  SELECT user_id INTO referred_uuid
  FROM profiles
  WHERE email = referred_user_email;
  
  IF referred_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN grant_referral_reward(referred_uuid);
END;
$$;