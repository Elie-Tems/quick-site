-- Add business_category column to businesses table
ALTER TABLE public.businesses 
ADD COLUMN business_category TEXT DEFAULT 'other';

-- Add a comment for clarity
COMMENT ON COLUMN public.businesses.business_category IS 'Business category type: bakery, restaurant, cafe, clothing, jewelry, electronics, beauty, fitness, automotive, pets, flowers, books, home, grocery, other';