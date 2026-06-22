-- =============================================
-- FIX SECURITY WARNINGS: Tighten INSERT policies for orders/order_items
-- =============================================

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;

-- Create tighter policies that still allow anonymous orders but with validation

-- Orders: Anyone can create orders but must provide valid business_id that exists
CREATE POLICY "Anyone can create orders with valid business"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Ensure the business exists
  EXISTS (SELECT 1 FROM public.businesses WHERE id = business_id)
);

-- Order items: Can only insert items for orders that exist and products that exist
CREATE POLICY "Anyone can create order items for valid orders"
ON public.order_items FOR INSERT
TO anon, authenticated
WITH CHECK (
  -- Ensure the order exists
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id)
  -- Product must exist (or be null for custom items)
  AND (product_id IS NULL OR EXISTS (SELECT 1 FROM public.products WHERE id = product_id))
);

-- Fix function search path warning by recreating the timestamp function
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers after function recreation
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