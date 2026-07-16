-- Add expiry_warning_sent_month to billing_tokens so we don't send duplicate
-- "card expiring soon" emails within the same calendar month.
-- Format: 'YYYY-MM' string.
alter table public.billing_tokens
  add column if not exists expiry_warning_sent_month text;
