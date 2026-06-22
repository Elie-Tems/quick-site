-- Fix RLS policies to work properly with Supabase auth
-- The issue was that auth.uid() wasn't working correctly with the client

-- =============================================
-- PROFILES TABLE
-- =============================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "update own profile" ON public.profiles;

-- Allow users to read their own profile
CREATE POLICY "Enable read access for users based on user_id"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own profile (for manual creation if trigger fails)
CREATE POLICY "Enable insert for users based on user_id"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Enable update for users based on user_id"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- BUSINESSES TABLE
-- =============================================

-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Drop old policies if exist
DROP POLICY IF EXISTS "Users can view own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can insert own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can update own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can delete own businesses" ON public.businesses;

-- Allow users to read their own businesses
CREATE POLICY "Enable read access for business owners"
ON public.businesses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = businesses.owner_id
    AND profiles.user_id = auth.uid()
  )
);

-- Allow users to create businesses
CREATE POLICY "Enable insert for authenticated users"
ON public.businesses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = businesses.owner_id
    AND profiles.user_id = auth.uid()
  )
);

-- Allow users to update their own businesses
CREATE POLICY "Enable update for business owners"
ON public.businesses FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = businesses.owner_id
    AND profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = businesses.owner_id
    AND profiles.user_id = auth.uid()
  )
);

-- Allow users to delete their own businesses
CREATE POLICY "Enable delete for business owners"
ON public.businesses FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = businesses.owner_id
    AND profiles.user_id = auth.uid()
  )
);

-- =============================================
-- PRODUCTS TABLE
-- =============================================

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read products (public store)
CREATE POLICY "Enable read access for all users"
ON public.products FOR SELECT
USING (true);

-- Allow business owners to manage their products
CREATE POLICY "Enable insert for business owners"
ON public.products FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    INNER JOIN public.profiles p ON b.owner_id = p.id
    WHERE b.id = products.business_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update for business owners"
ON public.products FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    INNER JOIN public.profiles p ON b.owner_id = p.id
    WHERE b.id = products.business_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Enable delete for business owners"
ON public.products FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    INNER JOIN public.profiles p ON b.owner_id = p.id
    WHERE b.id = products.business_id
    AND p.user_id = auth.uid()
  )
);

-- =============================================
-- PRODUCT CATEGORIES TABLE
-- =============================================

-- Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read categories
CREATE POLICY "Enable read access for all users"
ON public.product_categories FOR SELECT
USING (true);

-- Allow business owners to manage their categories
CREATE POLICY "Enable insert for business owners"
ON public.product_categories FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    INNER JOIN public.profiles p ON b.owner_id = p.id
    WHERE b.id = product_categories.business_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update for business owners"
ON public.product_categories FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    INNER JOIN public.profiles p ON b.owner_id = p.id
    WHERE b.id = product_categories.business_id
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Enable delete for business owners"
ON public.product_categories FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    INNER JOIN public.profiles p ON b.owner_id = p.id
    WHERE b.id = product_categories.business_id
    AND p.user_id = auth.uid()
  )
);

-- =============================================
-- ORDERS TABLE
-- =============================================

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create orders (public can order)
CREATE POLICY "Enable insert for all users"
ON public.orders FOR INSERT
WITH CHECK (true);

-- Allow business owners to read their orders
CREATE POLICY "Enable read for business owners"
ON public.orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    INNER JOIN public.profiles p ON b.owner_id = p.id
    WHERE b.id = orders.business_id
    AND p.user_id = auth.uid()
  )
);

-- Allow business owners to update their orders
CREATE POLICY "Enable update for business owners"
ON public.orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    INNER JOIN public.profiles p ON b.owner_id = p.id
    WHERE b.id = orders.business_id
    AND p.user_id = auth.uid()
  )
);

-- =============================================
-- ORDER ITEMS TABLE
-- =============================================

-- Enable RLS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create order items
CREATE POLICY "Enable insert for all users"
ON public.order_items FOR INSERT
WITH CHECK (true);

-- Allow business owners to read order items
CREATE POLICY "Enable read for business owners"
ON public.order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    INNER JOIN public.businesses b ON o.business_id = b.id
    INNER JOIN public.profiles p ON b.owner_id = p.id
    WHERE o.id = order_items.order_id
    AND p.user_id = auth.uid()
  )
);
