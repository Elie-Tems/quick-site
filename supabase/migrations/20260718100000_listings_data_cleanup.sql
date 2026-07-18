-- Real-estate audit fix: existing listings rows were seeded with category=null
-- (breaks the storefront's מכירה/השכרה/מסחרי filter chips, which do a strict
-- equality match) and with whitespace-only placeholder image strings (renders
-- as a broken <img> instead of the Building2 fallback). Backfill only - no
-- schema change, category stays nullable by design (vehicle listings may not
-- use sale/rent/commercial).

-- Category: infer sale vs rent from the title for property listings that were
-- saved before the dashboard category picker existed; default the rest to sale.
update public.listings
set category = 'rent', price_period = 'month'
where kind = 'property' and category is null and title ilike '%להשכרה%';

update public.listings
set category = 'sale'
where kind = 'property' and category is null;

-- Images: strip whitespace-only strings out of media->images so the storefront
-- falls back to the placeholder icon instead of a broken <img> tag.
update public.listings
set media = jsonb_set(
  media,
  '{images}',
  coalesce(
    (select jsonb_agg(img) from jsonb_array_elements_text(coalesce(media->'images', '[]'::jsonb)) img where btrim(img) <> ''),
    '[]'::jsonb
  )
)
where media ? 'images';
