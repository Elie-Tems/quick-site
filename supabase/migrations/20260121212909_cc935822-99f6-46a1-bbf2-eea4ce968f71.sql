-- =============================================
-- MULTI-TENANT B2B SAAS PLATFORM SCHEMA
-- With proper RLS for tenant isolation
-- =============================================

-- 1. PROFILES TABLE (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. BUSINESSES TABLE (tenants)
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  tagline TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  whatsapp_enabled BOOLEAN DEFAULT false,
  payment_enabled BOOLEAN DEFAULT false,
  payment_provider TEXT,
  payment_api_key TEXT, -- Will be encrypted/handled securely
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. PRODUCTS TABLE
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. BANNERS TABLE
CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  image_url TEXT,
  text TEXT,
  cta_text TEXT,
  cta_url TEXT,
  active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. ORDER STATUS ENUM
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'paid', 'completed', 'cancelled');

-- 6. ORDERS TABLE
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  notes TEXT,
  status public.order_status NOT NULL DEFAULT 'pending',
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. ORDER ITEMS TABLE
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_order DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_businesses_owner_id ON public.businesses(owner_id);
CREATE INDEX idx_businesses_slug ON public.businesses(slug);
CREATE INDEX idx_products_business_id ON public.products(business_id);
CREATE INDEX idx_banners_business_id ON public.banners(business_id);
CREATE INDEX idx_orders_business_id ON public.orders(business_id);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- =============================================
-- HELPER FUNCTIONS FOR RLS (SECURITY DEFINER)
-- =============================================

-- Get the profile ID for the current authenticated user
CREATE OR REPLACE FUNCTION public.get_current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid()
$$;

-- Check if user owns a specific business
CREATE OR REPLACE FUNCTION public.is_business_owner(business_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b
    INNER JOIN public.profiles p ON b.owner_id = p.id
    WHERE b.id = business_uuid AND p.user_id = auth.uid()
  )
$$;

-- Get business ID for an order
CREATE OR REPLACE FUNCTION public.get_business_for_order(order_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM public.orders WHERE id = order_uuid
$$;

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES: PROFILES
-- =============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- =============================================
-- RLS POLICIES: BUSINESSES
-- =============================================

-- Anyone can view businesses (for storefront browsing)
CREATE POLICY "Anyone can view businesses"
ON public.businesses FOR SELECT
TO anon, authenticated
USING (true);

-- Authenticated users can create businesses
CREATE POLICY "Authenticated users can create businesses"
ON public.businesses FOR INSERT
TO authenticated
WITH CHECK (owner_id = public.get_current_profile_id());

-- Only owner can update their business
CREATE POLICY "Owners can update own business"
ON public.businesses FOR UPDATE
TO authenticated
USING (public.is_business_owner(id));

-- Only owner can delete their business
CREATE POLICY "Owners can delete own business"
ON public.businesses FOR DELETE
TO authenticated
USING (public.is_business_owner(id));

-- =============================================
-- RLS POLICIES: PRODUCTS
-- =============================================

-- Anyone can view active products (for storefront)
CREATE POLICY "Anyone can view products"
ON public.products FOR SELECT
TO anon, authenticated
USING (true);

-- Only business owner can insert products
CREATE POLICY "Owners can insert products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (public.is_business_owner(business_id));

-- Only business owner can update products
CREATE POLICY "Owners can update own products"
ON public.products FOR UPDATE
TO authenticated
USING (public.is_business_owner(business_id));

-- Only business owner can delete products
CREATE POLICY "Owners can delete own products"
ON public.products FOR DELETE
TO authenticated
USING (public.is_business_owner(business_id));

-- =============================================
-- RLS POLICIES: BANNERS
-- =============================================

-- Anyone can view active banners (for storefront)
CREATE POLICY "Anyone can view banners"
ON public.banners FOR SELECT
TO anon, authenticated
USING (true);

-- Only business owner can insert banners
CREATE POLICY "Owners can insert banners"
ON public.banners FOR INSERT
TO authenticated
WITH CHECK (public.is_business_owner(business_id));

-- Only business owner can update banners
CREATE POLICY "Owners can update own banners"
ON public.banners FOR UPDATE
TO authenticated
USING (public.is_business_owner(business_id));

-- Only business owner can delete banners
CREATE POLICY "Owners can delete own banners"
ON public.banners FOR DELETE
TO authenticated
USING (public.is_business_owner(business_id));

-- =============================================
-- RLS POLICIES: ORDERS
-- =============================================

-- Business owners can view orders for their business
CREATE POLICY "Owners can view own business orders"
ON public.orders FOR SELECT
TO authenticated
USING (public.is_business_owner(business_id));

-- Anyone (including anon) can create orders (customers placing orders)
CREATE POLICY "Anyone can create orders"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Business owners can update orders (change status)
CREATE POLICY "Owners can update own business orders"
ON public.orders FOR UPDATE
TO authenticated
USING (public.is_business_owner(business_id));

-- Business owners can delete orders
CREATE POLICY "Owners can delete own business orders"
ON public.orders FOR DELETE
TO authenticated
USING (public.is_business_owner(business_id));

-- =============================================
-- RLS POLICIES: ORDER ITEMS
-- =============================================

-- Business owners can view order items for their orders
CREATE POLICY "Owners can view order items"
ON public.order_items FOR SELECT
TO authenticated
USING (public.is_business_owner(public.get_business_for_order(order_id)));

-- Anyone can insert order items (when placing an order)
CREATE POLICY "Anyone can create order items"
ON public.order_items FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Business owners can update order items
CREATE POLICY "Owners can update order items"
ON public.order_items FOR UPDATE
TO authenticated
USING (public.is_business_owner(public.get_business_for_order(order_id)));

-- Business owners can delete order items
CREATE POLICY "Owners can delete order items"
ON public.order_items FOR DELETE
TO authenticated
USING (public.is_business_owner(public.get_business_for_order(order_id)));

-- =============================================
-- TRIGGER FOR AUTOMATIC PROFILE CREATION
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- TRIGGER FOR UPDATED_AT TIMESTAMPS
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON public.banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- STORAGE BUCKET FOR IMAGES
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('business-assets', 'business-assets', true);

-- Storage policy: Anyone can view public assets
CREATE POLICY "Public can view business assets"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'business-assets');

-- Storage policy: Business owners can upload assets
CREATE POLICY "Owners can upload business assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-assets'
);

-- Storage policy: Business owners can update their assets
CREATE POLICY "Owners can update business assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'business-assets');

-- Storage policy: Business owners can delete their assets
CREATE POLICY "Owners can delete business assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'business-assets');