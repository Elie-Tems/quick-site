-- billing-update-card-webhook trusted a client/URL-supplied business_id and only
-- checked that a session_token was PRESENT, never that it actually belonged to
-- that business - the token was generated fresh each time and never persisted
-- anywhere, so there was nothing to validate against. Anyone who learns the
-- shared CARDCOM_WEBHOOK_SECRET (embedded in cleartext in every legitimate
-- card-update webhook URL, so visible to any merchant who ever runs this flow)
-- could call the webhook directly with their OWN LowProfileId but a DIFFERENT
-- business_id, attaching their card / reactivating an unrelated merchant's
-- subscription. This table lets the webhook look the session up by token and
-- take business_id/user_id from OUR OWN stored record, matching the pattern
-- already used by publish_checkout_sessions / billing-cardcom-webhook.

create table if not exists public.card_update_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  session_token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_card_update_sessions_token on public.card_update_sessions (session_token);

alter table public.card_update_sessions enable row level security;
-- No client policies: only ever read/written by edge functions using the
-- service role key (billing-update-card creates it, billing-update-card-webhook
-- reads/completes it). RLS with zero policies means "deny all" to anon/authenticated.
