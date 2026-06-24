-- Per-customer help-bot memory: one persisted conversation per logged-in user.
-- The /help chat loads this on mount and upserts it after each exchange so the
-- assistant "remembers" the customer across visits. RLS restricts each row to
-- its owner.
create table if not exists public.help_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

alter table public.help_conversations enable row level security;

drop policy if exists "own help conversation" on public.help_conversations;
create policy "own help conversation" on public.help_conversations
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
