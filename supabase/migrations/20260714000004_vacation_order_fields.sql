-- Extra columns for vacation bookings
alter table orders
  add column if not exists checkin_date  date,
  add column if not exists checkout_date date,
  add column if not exists num_guests    integer,
  add column if not exists unit_name     text;
