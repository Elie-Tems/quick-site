-- Extra columns for vacation room units (all nullable — only vacation businesses use them)
alter table products
  add column if not exists price_per_night numeric,
  add column if not exists price_weekend   numeric,
  add column if not exists max_guests      integer,
  add column if not exists min_nights      integer not null default 1,
  add column if not exists checkin_time    text,
  add column if not exists checkout_time   text;
