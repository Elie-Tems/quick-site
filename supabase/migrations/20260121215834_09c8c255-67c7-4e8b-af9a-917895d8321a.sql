-- Add theme/branding columns to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#7c3aed',
ADD COLUMN IF NOT EXISTS hero_image_url text,
ADD COLUMN IF NOT EXISTS brand_style text DEFAULT 'modern';

-- Add comment for clarity
COMMENT ON COLUMN public.businesses.primary_color IS 'Primary brand color in hex format';
COMMENT ON COLUMN public.businesses.hero_image_url IS 'Hero banner image URL for storefront';
COMMENT ON COLUMN public.businesses.brand_style IS 'Brand style: modern, minimal, bold, elegant';