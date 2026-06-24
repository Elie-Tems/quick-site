-- מדיניות RLS מצטברות ב-OR. המיגרציות הישנות יצרו "Anyone can view ..." עם USING (true)
-- ולא הוסרו כשהוספנו הגבלות לפי is_published - לכן טיוטות נשארו גלויות לציבור.
-- כאן מסירים את השאריות; המדיניות מהמיגרציה publish_payment_icount נשארות.

DROP POLICY IF EXISTS "Anyone can view businesses" ON public.businesses;
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view product categories" ON public.product_categories;
