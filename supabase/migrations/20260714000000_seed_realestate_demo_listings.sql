-- Seed demo property listings for any existing real-estate business that has
-- no listings yet. These replace the generic "מוצר לדוגמה" products that were
-- previously shown via the products-table fallback.
-- Safe to run multiple times: the NOT EXISTS guard prevents duplicates.

INSERT INTO public.listings
  (business_id, kind, title, description, price, price_period, category, is_hot, city, attrs, media, sort_order, active)
SELECT
  b.id,
  'property',
  demo.title,
  demo.description,
  demo.price,
  demo.price_period,
  demo.category,
  demo.is_hot,
  demo.city,
  demo.attrs::jsonb,
  demo.media::jsonb,
  demo.sort_order,
  true
FROM public.businesses b
CROSS JOIN (VALUES
  (
    'דירת 4 חד'' משופצת',
    'דירה מרווחת ומוארת, שופצה לאחרונה, קרובה לתחבורה ציבורית ופארק. מתאימה למשפחה.',
    2450000::numeric, NULL::text, 'sale', true, 'רמת גן',
    '{"rooms":4,"size":98}', '{"images":["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=80"]}', 0
  ),
  (
    'פנטהאוז עם מרפסת',
    'פנטהאוז מעוצב עם נוף עירוני מרהיב, מרפסת גדולה ואחסון מרווח.',
    8900::numeric, 'month', 'rent', false, 'תל אביב',
    '{"rooms":3,"size":85}', '{"images":["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80"]}', 1
  ),
  (
    'חנות במרכז מסחרי',
    'חנות בעמדה מצוינת, חזית ראשית, מתאימה לעסקים שונים.',
    12000::numeric, 'month', 'commercial', false, 'פתח תקווה',
    '{"rooms":0,"size":60}', '{"images":["https://images.unsplash.com/photo-1497366216548-37526070297c?w=900&q=80"]}', 2
  ),
  (
    'דירת גן 5 חד''',
    'דירת גן מפנקת עם גינה פרטית גדולה, שקטה ומרווחת.',
    4200000::numeric, NULL::text, 'sale', true, 'הרצליה',
    '{"rooms":5,"size":130}', '{"images":["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=80"]}', 3
  ),
  (
    'סטודיו מעוצב',
    'סטודיו מודרני ומעוצב, מתאים לזוגות או סטודנטים, קרוב לים.',
    5400::numeric, 'month', 'rent', false, 'תל אביב',
    '{"rooms":1,"size":38}', '{"images":["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=900&q=80"]}', 4
  )
) AS demo(title, description, price, price_period, category, is_hot, city, attrs, media, sort_order)
WHERE
  -- Only realestate businesses
  (b.business_type = 'realestate' OR (b.business_type IS NULL AND b.template_id LIKE 'property-%'))
  -- Only if they have no listings yet
  AND NOT EXISTS (
    SELECT 1 FROM public.listings l WHERE l.business_id = b.id
  );
