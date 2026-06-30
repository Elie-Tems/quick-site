-- Resolve a recipient's preferred email language (stored in auth.users metadata)
-- by email, so send-platform-email can localize every platform template to the
-- recipient automatically. SECURITY DEFINER + service-role-only.
create or replace function public.email_preferred_lang(p_email text)
returns text
language sql
security definer
set search_path = public, auth
as $$
  select coalesce(nullif(u.raw_user_meta_data->>'preferred_language', ''), 'he')
  from auth.users u
  where lower(u.email) = lower(p_email)
  limit 1;
$$;

revoke all on function public.email_preferred_lang(text) from public, anon, authenticated;
