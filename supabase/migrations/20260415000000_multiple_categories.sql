-- Create junction table for many-to-many relationship between products and categories
CREATE TABLE public.product_category_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, category_id)
);

-- Create indexes for faster lookups
CREATE INDEX idx_product_category_assignments_product ON public.product_category_assignments(product_id);
CREATE INDEX idx_product_category_assignments_category ON public.product_category_assignments(category_id);

-- Enable RLS
ALTER TABLE public.product_category_assignments ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user owns the product in assignment
CREATE OR REPLACE FUNCTION public.is_assignment_owner(assignment_product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT public.is_product_owner(assignment_product_id)
$$;

-- Anyone can view product category assignments (for storefront)
CREATE POLICY "Anyone can view product category assignments"
ON public.product_category_assignments
FOR SELECT
USING (true);

-- Only product owners can manage assignments
CREATE POLICY "Owners can insert category assignments"
ON public.product_category_assignments
FOR INSERT
WITH CHECK (public.is_assignment_owner(product_id));

CREATE POLICY "Owners can delete category assignments"
ON public.product_category_assignments
FOR DELETE
USING (public.is_assignment_owner(product_id));

-- Migrate existing single category_id to new junction table
INSERT INTO public.product_category_assignments (product_id, category_id)
SELECT id, category_id 
FROM public.products 
WHERE category_id IS NOT NULL;

-- Note: We keep the category_id column for backward compatibility
-- It can be removed in a future migration after ensuring all code uses the new system
