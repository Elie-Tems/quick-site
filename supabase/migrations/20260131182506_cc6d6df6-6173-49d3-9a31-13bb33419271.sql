-- Add user status tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'registered';

-- Add optional: when they completed onboarding
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp with time zone;

-- Add optional: registration source (google, email)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auth_provider text DEFAULT 'email';

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- Update RLS to allow admins to view all profiles (already exists but ensure it's there)
-- Admins can view all profiles is already created