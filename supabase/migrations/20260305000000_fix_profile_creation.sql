-- Fix profile creation for OAuth users
-- Allow service role and authenticated users to create their own profile as fallback

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create new policy that allows users to insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Make handle_new_user more robust - don't fail if referral/subscription fails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_uuid UUID;
BEGIN
  -- Insert profile (main operation - must succeed)
  INSERT INTO public.profiles (user_id, email, full_name, referral_code, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    generate_referral_code(),
    NEW.raw_user_meta_data->>'referred_by'
  )
  ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicate if already created
  
  -- Try to create subscription (non-critical)
  BEGIN
    INSERT INTO public.subscriptions (user_id, status, paid_until)
    VALUES (NEW.id, 'trial', now() + INTERVAL '14 days')
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Log but don't fail
    RAISE WARNING 'Failed to create subscription for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Try to create referral log (non-critical)
  IF NEW.raw_user_meta_data->>'referred_by' IS NOT NULL THEN
    BEGIN
      SELECT user_id INTO referrer_uuid
      FROM profiles
      WHERE referral_code = NEW.raw_user_meta_data->>'referred_by';
      
      IF referrer_uuid IS NOT NULL AND referrer_uuid != NEW.id THEN
        INSERT INTO referral_logs (referrer_user_id, referred_user_id, reward_given)
        VALUES (referrer_uuid, NEW.id, false)
        ON CONFLICT (referred_user_id) DO NOTHING;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log but don't fail
      RAISE WARNING 'Failed to create referral log for user %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;
