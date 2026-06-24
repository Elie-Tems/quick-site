-- =============================================================
-- Admin security hardening
-- 1. Fill gaps: admin SELECT on all tables missing it
-- 2. Admin UPDATE/DELETE where needed for operations
-- 3. Tighten publish_checkout_sessions and email_consents
-- =============================================================

-- ---- BANNERS ----
DROP POLICY IF EXISTS "Admins can view all banners" ON public.banners;
CREATE POLICY "Admins can view all banners"
ON public.banners FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all banners" ON public.banners;
CREATE POLICY "Admins can update all banners"
ON public.banners FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete any banner" ON public.banners;
CREATE POLICY "Admins can delete any banner"
ON public.banners FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- COUPONS ----
DROP POLICY IF EXISTS "Admins can view all coupons" ON public.coupons;
CREATE POLICY "Admins can view all coupons"
ON public.coupons FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all coupons" ON public.coupons;
CREATE POLICY "Admins can update all coupons"
ON public.coupons FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete any coupon" ON public.coupons;
CREATE POLICY "Admins can delete any coupon"
ON public.coupons FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- CAMPAIGNS ----
DROP POLICY IF EXISTS "Admins can view all campaigns" ON public.campaigns;
CREATE POLICY "Admins can view all campaigns"
ON public.campaigns FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update all campaigns" ON public.campaigns;
CREATE POLICY "Admins can update all campaigns"
ON public.campaigns FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete any campaign" ON public.campaigns;
CREATE POLICY "Admins can delete any campaign"
ON public.campaigns FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- CAMPAIGN BANNERS ----
DROP POLICY IF EXISTS "Admins can view all campaign banners" ON public.campaign_banners;
CREATE POLICY "Admins can view all campaign banners"
ON public.campaign_banners FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- CAMPAIGN PRODUCTS ----
DROP POLICY IF EXISTS "Admins can view all campaign products" ON public.campaign_products;
CREATE POLICY "Admins can view all campaign products"
ON public.campaign_products FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- ORDER ITEMS ----
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items"
ON public.order_items FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- EMAIL CONSENTS ----
DROP POLICY IF EXISTS "Admins can view all email consents" ON public.email_consents;
CREATE POLICY "Admins can view all email consents"
ON public.email_consents FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- PUBLISH CHECKOUT SESSIONS ----
-- Only owner or admin - remove any accidental public read
DROP POLICY IF EXISTS "Admins can view all publish sessions" ON public.publish_checkout_sessions;
CREATE POLICY "Admins can view all publish sessions"
ON public.publish_checkout_sessions FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- BUSINESS USAGE ----
DROP POLICY IF EXISTS "Admins can view all business usage" ON public.business_usage;
CREATE POLICY "Admins can view all business usage"
ON public.business_usage FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- PRODUCT CUSTOM FIELDS ----
DROP POLICY IF EXISTS "Admins can view all product custom fields" ON public.product_custom_fields;
CREATE POLICY "Admins can view all product custom fields"
ON public.product_custom_fields FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- PRODUCT CATEGORY ASSIGNMENTS ----
DROP POLICY IF EXISTS "Admins can view all category assignments" ON public.product_category_assignments;
CREATE POLICY "Admins can view all category assignments"
ON public.product_category_assignments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- PRODUCT CATEGORIES ----
DROP POLICY IF EXISTS "Admins can view all product categories" ON public.product_categories;
CREATE POLICY "Admins can view all product categories"
ON public.product_categories FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- ORDERS: add admin delete ----
DROP POLICY IF EXISTS "Admins can delete any order" ON public.orders;
CREATE POLICY "Admins can delete any order"
ON public.orders FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- ORDERS: add admin update ----
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
CREATE POLICY "Admins can update all orders"
ON public.orders FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- ---- USER ROLES: only admins can insert/delete roles ----
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;
CREATE POLICY "Only admins can delete roles"
ON public.user_roles FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
