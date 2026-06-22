-- Add new fields to subscriptions table for add-ons and limits
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS image_storage_package TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS image_storage_price INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_limit INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS product_addon_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS product_addon_price INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_total INTEGER DEFAULT 59;

-- Create usage tracking table for businesses
CREATE TABLE IF NOT EXISTS public.business_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  stored_images_count INTEGER DEFAULT 0,
  products_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on business_usage
ALTER TABLE public.business_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_usage
CREATE POLICY "Business owners can view their own usage" 
ON public.business_usage 
FOR SELECT 
USING (is_business_owner(business_id));

CREATE POLICY "Business owners can update their own usage" 
ON public.business_usage 
FOR UPDATE 
USING (is_business_owner(business_id));

CREATE POLICY "System can insert usage records" 
ON public.business_usage 
FOR INSERT 
WITH CHECK (is_business_owner(business_id));

-- Trigger to update updated_at
CREATE TRIGGER update_business_usage_updated_at
BEFORE UPDATE ON public.business_usage
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to recalculate usage for a business
CREATE OR REPLACE FUNCTION public.recalculate_business_usage(p_business_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_products_count INTEGER;
  v_images_count INTEGER;
BEGIN
  -- Count products
  SELECT COUNT(*) INTO v_products_count
  FROM products
  WHERE business_id = p_business_id AND active = true;
  
  -- Count stored images (products with image_url + ai_generated_images)
  SELECT 
    (SELECT COUNT(*) FROM products WHERE business_id = p_business_id AND image_url IS NOT NULL) +
    (SELECT COUNT(*) FROM ai_generated_images agi 
     INNER JOIN ai_image_jobs aij ON agi.job_id = aij.id 
     WHERE aij.business_id = p_business_id)
  INTO v_images_count;
  
  -- Upsert usage record
  INSERT INTO business_usage (business_id, products_count, stored_images_count)
  VALUES (p_business_id, v_products_count, v_images_count)
  ON CONFLICT (business_id) DO UPDATE
  SET products_count = v_products_count,
      stored_images_count = v_images_count,
      updated_at = now();
END;
$$;

-- Function to check if image upload is allowed
CREATE OR REPLACE FUNCTION public.can_upload_image(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_images INTEGER;
  v_image_limit INTEGER;
  v_owner_id UUID;
BEGIN
  -- Get owner from business
  SELECT owner_id INTO v_owner_id FROM businesses WHERE id = p_business_id;
  
  -- Get current limit from subscription
  SELECT COALESCE(image_limit, 50) INTO v_image_limit
  FROM subscriptions s
  INNER JOIN profiles p ON s.user_id = p.user_id
  WHERE p.id = v_owner_id;
  
  -- Get current usage
  SELECT COALESCE(stored_images_count, 0) INTO v_current_images
  FROM business_usage
  WHERE business_id = p_business_id;
  
  RETURN v_current_images < v_image_limit;
END;
$$;

-- Function to get image usage percentage
CREATE OR REPLACE FUNCTION public.get_image_usage_percentage(p_business_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_images INTEGER;
  v_image_limit INTEGER;
  v_owner_id UUID;
BEGIN
  -- Get owner from business
  SELECT owner_id INTO v_owner_id FROM businesses WHERE id = p_business_id;
  
  -- Get current limit from subscription
  SELECT COALESCE(image_limit, 50) INTO v_image_limit
  FROM subscriptions s
  INNER JOIN profiles p ON s.user_id = p.user_id
  WHERE p.id = v_owner_id;
  
  IF v_image_limit = 0 THEN RETURN 0; END IF;
  
  -- Get current usage
  SELECT COALESCE(stored_images_count, 0) INTO v_current_images
  FROM business_usage
  WHERE business_id = p_business_id;
  
  RETURN LEAST(100, ROUND((v_current_images::NUMERIC / v_image_limit::NUMERIC) * 100));
END;
$$;