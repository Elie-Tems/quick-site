-- Create campaigns table
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT false,
  display_mode TEXT NOT NULL DEFAULT 'replace' CHECK (display_mode IN ('replace', 'add', 'prioritize')),
  -- replace = only campaign content shows
  -- add = campaign content adds to regular content
  -- prioritize = campaign content shows first, then regular content
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_banners table (banners specific to a campaign)
CREATE TABLE public.campaign_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title TEXT,
  text TEXT,
  image_url TEXT,
  cta_text TEXT,
  cta_url TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign_products table (link existing products OR create campaign-specific products)
CREATE TABLE public.campaign_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  -- If product_id is null, this is a campaign-specific product
  is_campaign_only BOOLEAN NOT NULL DEFAULT false,
  -- Campaign-specific product fields (used when is_campaign_only = true)
  name TEXT,
  description TEXT,
  price NUMERIC DEFAULT 0,
  sale_price NUMERIC,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_products ENABLE ROW LEVEL SECURITY;

-- Helper function to check campaign ownership
CREATE OR REPLACE FUNCTION public.is_campaign_owner(campaign_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaigns c
    INNER JOIN public.businesses b ON c.business_id = b.id
    INNER JOIN public.profiles p ON b.owner_id = p.id
    WHERE c.id = campaign_uuid AND p.user_id = auth.uid()
  )
$$;

-- Campaigns RLS policies
CREATE POLICY "Anyone can view active campaigns" ON public.campaigns
  FOR SELECT USING (true);

CREATE POLICY "Owners can insert campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (is_business_owner(business_id));

CREATE POLICY "Owners can update own campaigns" ON public.campaigns
  FOR UPDATE USING (is_business_owner(business_id));

CREATE POLICY "Owners can delete own campaigns" ON public.campaigns
  FOR DELETE USING (is_business_owner(business_id));

-- Campaign banners RLS policies
CREATE POLICY "Anyone can view campaign banners" ON public.campaign_banners
  FOR SELECT USING (true);

CREATE POLICY "Owners can insert campaign banners" ON public.campaign_banners
  FOR INSERT WITH CHECK (is_campaign_owner(campaign_id));

CREATE POLICY "Owners can update own campaign banners" ON public.campaign_banners
  FOR UPDATE USING (is_campaign_owner(campaign_id));

CREATE POLICY "Owners can delete own campaign banners" ON public.campaign_banners
  FOR DELETE USING (is_campaign_owner(campaign_id));

-- Campaign products RLS policies
CREATE POLICY "Anyone can view campaign products" ON public.campaign_products
  FOR SELECT USING (true);

CREATE POLICY "Owners can insert campaign products" ON public.campaign_products
  FOR INSERT WITH CHECK (is_campaign_owner(campaign_id));

CREATE POLICY "Owners can update own campaign products" ON public.campaign_products
  FOR UPDATE USING (is_campaign_owner(campaign_id));

CREATE POLICY "Owners can delete own campaign products" ON public.campaign_products
  FOR DELETE USING (is_campaign_owner(campaign_id));

-- Function to ensure only one campaign is active per business
CREATE OR REPLACE FUNCTION public.ensure_single_active_campaign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If activating a campaign, deactivate all others for this business
  IF NEW.is_active = true THEN
    UPDATE public.campaigns
    SET is_active = false, updated_at = now()
    WHERE business_id = NEW.business_id
      AND id != NEW.id
      AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to ensure single active campaign
CREATE TRIGGER ensure_single_active_campaign_trigger
  BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_single_active_campaign();

-- Trigger for updated_at
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_banners_updated_at
  BEFORE UPDATE ON public.campaign_banners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaign_products_updated_at
  BEFORE UPDATE ON public.campaign_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();