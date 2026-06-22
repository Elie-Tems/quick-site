-- Add is_religious_audience field to businesses table
ALTER TABLE public.businesses 
ADD COLUMN is_religious_audience BOOLEAN DEFAULT false;

-- Add comment to explain the field
COMMENT ON COLUMN public.businesses.is_religious_audience IS 'Indicates if the business targets a religious/ultra-orthodox audience';
