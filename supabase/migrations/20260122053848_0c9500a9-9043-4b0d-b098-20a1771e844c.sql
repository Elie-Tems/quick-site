-- Add color_palette column to businesses table
ALTER TABLE public.businesses 
ADD COLUMN color_palette jsonb DEFAULT '[]'::jsonb;