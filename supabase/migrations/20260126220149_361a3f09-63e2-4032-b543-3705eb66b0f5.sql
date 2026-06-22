-- Create page_views table to track store visits
CREATE TABLE public.page_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  visitor_id TEXT, -- anonymous visitor identifier (from localStorage or session)
  page_path TEXT NOT NULL DEFAULT '/',
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries by business and date
CREATE INDEX idx_page_views_business_date ON public.page_views(business_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert page views (visitors are anonymous)
CREATE POLICY "Anyone can insert page views"
ON public.page_views
FOR INSERT
WITH CHECK (true);

-- Only business owners can view their own analytics
CREATE POLICY "Business owners can view their page views"
ON public.page_views
FOR SELECT
USING (public.is_business_owner(business_id));