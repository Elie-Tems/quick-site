-- Add custom_category_name column to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS custom_category_name TEXT;