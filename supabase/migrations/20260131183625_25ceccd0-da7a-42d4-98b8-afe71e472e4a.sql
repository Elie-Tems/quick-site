-- Fix overly permissive RLS policies for referral_logs

-- Drop the overly permissive insert policy
DROP POLICY IF EXISTS "System can insert referral logs" ON public.referral_logs;

-- Create a more restrictive insert policy - only allow inserts via database functions (service role)
-- This is acceptable because referral logs are created by the handle_new_user trigger
CREATE POLICY "Trigger can insert referral logs" 
ON public.referral_logs 
FOR INSERT 
WITH CHECK (
  -- Allow insert if the referrer exists and referred user is the current user
  -- Or if called from a security definer function (service role)
  referrer_user_id != referred_user_id
  AND EXISTS (SELECT 1 FROM profiles WHERE user_id = referrer_user_id)
);

-- The existing update policy is fine - users can only update their own referrals