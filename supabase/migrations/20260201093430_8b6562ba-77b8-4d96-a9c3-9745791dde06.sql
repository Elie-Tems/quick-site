-- Create product categories table
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add category_id to products table
ALTER TABLE public.products ADD COLUMN category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view product categories" 
ON public.product_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Owners can insert categories" 
ON public.product_categories 
FOR INSERT 
WITH CHECK (is_business_owner(business_id));

CREATE POLICY "Owners can update own categories" 
ON public.product_categories 
FOR UPDATE 
USING (is_business_owner(business_id));

CREATE POLICY "Owners can delete own categories" 
ON public.product_categories 
FOR DELETE 
USING (is_business_owner(business_id));

-- Create index for faster lookups
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_product_categories_business_id ON public.product_categories(business_id);