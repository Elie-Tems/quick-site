-- Add template_id column to businesses table to store selected template
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS template_id TEXT;

-- Add comment
COMMENT ON COLUMN public.businesses.template_id IS 'Selected store template ID (minimal, elegant-dark, soft-blush, etc.)';
