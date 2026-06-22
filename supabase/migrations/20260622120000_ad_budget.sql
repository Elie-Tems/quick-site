-- Ad channels (e.g. Facebook, Google, TikTok)
CREATE TABLE public.ad_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                     -- "פייסבוק", "גוגל", etc.
  icon TEXT,                              -- emoji or slug for icon
  budget_amount NUMERIC DEFAULT 0,
  budget_currency TEXT NOT NULL DEFAULT 'ILS',
  budget_period TEXT NOT NULL DEFAULT 'monthly', -- monthly | weekly | custom
  budget_start_date DATE,
  budget_end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- UTM links per channel
CREATE TABLE public.ad_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES public.ad_channels(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  label TEXT NOT NULL,                    -- "סרטון 1", "פוסט קיץ", etc.
  destination_url TEXT NOT NULL,          -- the real landing page URL
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  clicks INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.ad_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage ad channels"
ON public.ad_channels FOR ALL
USING (is_business_owner(business_id))
WITH CHECK (is_business_owner(business_id));

CREATE POLICY "Admins can view all ad channels"
ON public.ad_channels FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners can manage ad links"
ON public.ad_links FOR ALL
USING (is_business_owner(business_id))
WITH CHECK (is_business_owner(business_id));

CREATE POLICY "Admins can view all ad links"
ON public.ad_links FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can increment clicks (for the UTM redirect endpoint)
CREATE POLICY "Public can increment clicks"
ON public.ad_links FOR UPDATE
USING (true)
WITH CHECK (true);

-- Indexes
CREATE INDEX idx_ad_channels_business ON public.ad_channels(business_id);
CREATE INDEX idx_ad_links_channel ON public.ad_links(channel_id);
CREATE INDEX idx_ad_links_business ON public.ad_links(business_id);

-- Triggers
CREATE TRIGGER update_ad_channels_updated_at
BEFORE UPDATE ON public.ad_channels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ad_links_updated_at
BEFORE UPDATE ON public.ad_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
