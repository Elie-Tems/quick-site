alter table products
  add column if not exists additional_images jsonb default '[]'::jsonb;
