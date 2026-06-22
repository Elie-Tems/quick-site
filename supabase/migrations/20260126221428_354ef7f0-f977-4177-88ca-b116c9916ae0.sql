-- Add SKU column to products table
ALTER TABLE public.products ADD COLUMN sku TEXT;

-- Create index for SKU lookups
CREATE INDEX idx_products_sku ON public.products(business_id, sku);

-- Create custom fields table for products
CREATE TABLE public.product_custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_product_custom_fields_product ON public.product_custom_fields(product_id);

-- Enable RLS
ALTER TABLE public.product_custom_fields ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user owns product
CREATE OR REPLACE FUNCTION public.is_product_owner(product_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.products p
    INNER JOIN public.businesses b ON p.business_id = b.id
    INNER JOIN public.profiles pr ON b.owner_id = pr.id
    WHERE p.id = product_uuid AND pr.user_id = auth.uid()
  )
$$;

-- Anyone can view custom fields (for storefront)
CREATE POLICY "Anyone can view product custom fields"
ON public.product_custom_fields
FOR SELECT
USING (true);

-- Only product owners can manage custom fields
CREATE POLICY "Owners can insert custom fields"
ON public.product_custom_fields
FOR INSERT
WITH CHECK (public.is_product_owner(product_id));

CREATE POLICY "Owners can update custom fields"
ON public.product_custom_fields
FOR UPDATE
USING (public.is_product_owner(product_id));

CREATE POLICY "Owners can delete custom fields"
ON public.product_custom_fields
FOR DELETE
USING (public.is_product_owner(product_id));