-- Add referral fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- Create index for referral_code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles(referred_by);

-- Create subscriptions table for SaaS subscription tracking
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT 'standard',
  paid_until TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'trial',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscription
CREATE POLICY "Users can view own subscription" 
ON public.subscriptions 
FOR SELECT 
USING (user_id = auth.uid());

-- Users can update their own subscription
CREATE POLICY "Users can update own subscription" 
ON public.subscriptions 
FOR UPDATE 
USING (user_id = auth.uid());

-- System can insert subscriptions
CREATE POLICY "System can insert subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions" 
ON public.subscriptions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all subscriptions
CREATE POLICY "Admins can update all subscriptions" 
ON public.subscriptions 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create referral_logs table
CREATE TABLE public.referral_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_given BOOLEAN NOT NULL DEFAULT false,
  reward_days INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  rewarded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referred_user_id)
);

-- Enable RLS on referral_logs
ALTER TABLE public.referral_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own referral logs (as referrer)
CREATE POLICY "Users can view own referrals" 
ON public.referral_logs 
FOR SELECT 
USING (referrer_user_id = auth.uid());

-- System can insert referral logs
CREATE POLICY "System can insert referral logs" 
ON public.referral_logs 
FOR INSERT 
WITH CHECK (true);

-- System can update referral logs for reward granting
CREATE POLICY "System can update referral logs" 
ON public.referral_logs 
FOR UPDATE 
USING (referrer_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can view all referral logs
CREATE POLICY "Admins can view all referral logs" 
ON public.referral_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 6-character alphanumeric code
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Create function to grant referral reward
CREATE OR REPLACE FUNCTION public.grant_referral_reward(referred_user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer_uuid UUID;
  referrer_code TEXT;
  current_paid_until TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get the referred_by code from the referred user's profile
  SELECT referred_by INTO referrer_code
  FROM profiles
  WHERE user_id = referred_user_uuid;
  
  -- If no referrer, return false
  IF referrer_code IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get the referrer's user_id
  SELECT user_id INTO referrer_uuid
  FROM profiles
  WHERE referral_code = referrer_code;
  
  -- If referrer not found, return false
  IF referrer_uuid IS NULL THEN
    RETURN false;
  END IF;
  
  -- Prevent self-referral
  IF referrer_uuid = referred_user_uuid THEN
    RETURN false;
  END IF;
  
  -- Check if reward already given
  IF EXISTS(SELECT 1 FROM referral_logs WHERE referred_user_id = referred_user_uuid AND reward_given = true) THEN
    RETURN false;
  END IF;
  
  -- Get current paid_until for referrer
  SELECT paid_until INTO current_paid_until
  FROM subscriptions
  WHERE user_id = referrer_uuid;
  
  -- If no subscription exists, create one
  IF current_paid_until IS NULL THEN
    INSERT INTO subscriptions (user_id, paid_until, status)
    VALUES (referrer_uuid, now() + INTERVAL '30 days', 'active')
    ON CONFLICT (user_id) DO UPDATE 
    SET paid_until = COALESCE(subscriptions.paid_until, now()) + INTERVAL '30 days',
        status = 'active',
        updated_at = now();
  ELSE
    -- Extend existing subscription
    UPDATE subscriptions
    SET paid_until = GREATEST(paid_until, now()) + INTERVAL '30 days',
        status = 'active',
        updated_at = now()
    WHERE user_id = referrer_uuid;
  END IF;
  
  -- Log or update the referral
  INSERT INTO referral_logs (referrer_user_id, referred_user_id, reward_given, rewarded_at)
  VALUES (referrer_uuid, referred_user_uuid, true, now())
  ON CONFLICT (referred_user_id) DO UPDATE
  SET reward_given = true, rewarded_at = now();
  
  RETURN true;
END;
$$;

-- Update handle_new_user function to generate referral code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, referral_code, referred_by)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    generate_referral_code(),
    NEW.raw_user_meta_data->>'referred_by'
  );
  
  -- Create initial subscription (trial)
  INSERT INTO public.subscriptions (user_id, status, paid_until)
  VALUES (NEW.id, 'trial', now() + INTERVAL '14 days');
  
  -- If referred, create referral log entry (reward not yet given)
  IF NEW.raw_user_meta_data->>'referred_by' IS NOT NULL THEN
    DECLARE
      referrer_uuid UUID;
    BEGIN
      SELECT user_id INTO referrer_uuid
      FROM profiles
      WHERE referral_code = NEW.raw_user_meta_data->>'referred_by';
      
      IF referrer_uuid IS NOT NULL AND referrer_uuid != NEW.id THEN
        INSERT INTO referral_logs (referrer_user_id, referred_user_id, reward_given)
        VALUES (referrer_uuid, NEW.id, false)
        ON CONFLICT (referred_user_id) DO NOTHING;
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Generate referral codes for existing users who don't have one
UPDATE public.profiles
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;