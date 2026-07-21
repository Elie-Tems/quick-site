-- Security fix: add authorization checks to two SECURITY DEFINER functions
-- that were callable by any authenticated user without ownership verification.

-- 1. add_ai_credits: verify caller owns the business before adding credits.
CREATE OR REPLACE FUNCTION public.add_ai_credits(p_business_id uuid, p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_total INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses b
    JOIN public.profiles p ON b.owner_id = p.id
    WHERE b.id = p_business_id AND p.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO ai_credits (business_id, credits_remaining, total_credits_purchased)
  VALUES (p_business_id, p_amount, p_amount)
  ON CONFLICT (business_id) DO UPDATE
  SET credits_remaining = ai_credits.credits_remaining + p_amount,
      total_credits_purchased = ai_credits.total_credits_purchased + p_amount,
      updated_at = now()
  RETURNING credits_remaining INTO new_total;

  RETURN new_total;
END;
$$;

-- 2. admin_grant_referral_reward: restrict to platform admins only.
CREATE OR REPLACE FUNCTION public.admin_grant_referral_reward(referred_user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referred_uuid UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND email IN ('moti4384@gmail.com', 'furmand713@gmail.com')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
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
