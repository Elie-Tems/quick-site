-- Auto-send a WhatsApp order notification to the customer when a new order is
-- created, IF the merchant has WhatsApp connected + notifications on. Calls the
-- whatsapp-send edge function via pg_net with the internal secret.
-- BUILD-ONLY: written for go-live; apply only when WhatsApp goes live (needs the
-- function deployed + WHATSAPP_INTERNAL_SECRET set). Safe no-op otherwise.

create or replace function public.notify_whatsapp_new_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acct record;
  fn_url text := current_setting('app.supabase_url', true);
  secret text := current_setting('app.whatsapp_internal_secret', true);
begin
  -- Only when the business has a connected WhatsApp account with order notifications on.
  select a.phone_number, a.status, a.notify_new_order
    into acct
  from public.whatsapp_accounts a
  where a.business_id = new.business_id and a.status = 'connected' and a.notify_new_order = true;

  if acct.phone_number is null then
    return new; -- WhatsApp not on for this business; do nothing.
  end if;

  if fn_url is null or secret is null then
    return new; -- not configured yet (pre go-live).
  end if;

  perform net.http_post(
    url := fn_url || '/functions/v1/whatsapp-send',
    headers := jsonb_build_object('Content-Type','application/json','x-internal-secret', secret),
    body := jsonb_build_object(
      'businessId', new.business_id,
      'to', new.customer_phone,
      'body', 'תודה על ההזמנה! קיבלנו אותה ונעדכן אותך בהמשך. 🙏',
      'category', 'utility'
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_whatsapp_new_order on public.orders;
create trigger trg_whatsapp_new_order
after insert on public.orders
for each row execute function public.notify_whatsapp_new_order();
