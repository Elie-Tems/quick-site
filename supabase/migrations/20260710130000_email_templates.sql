-- Per-merchant transactional email customization. A merchant can turn any
-- lifecycle email on/off (e.g. a service provider that doesn't allow cancellations
-- disables the "appointment cancelled" mail) and override its wording. The
-- notification senders read this table: skip disabled keys, apply overrides over
-- the built-in defaults. A row absent = the default (enabled, default copy).

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  template_key text not null,          -- see src/lib/emailTemplates.ts (booking_confirm, lead_reply, donation_thanks, ...)
  enabled boolean not null default true,
  subject text,                        -- null = use the built-in default
  heading text,
  body text,
  button_text text,
  updated_at timestamptz not null default now(),
  unique (business_id, template_key)
);
create index if not exists idx_email_templates_biz on public.email_templates(business_id);

alter table public.email_templates enable row level security;

drop policy if exists "owner manages own email_templates" on public.email_templates;
create policy "owner manages own email_templates" on public.email_templates for all
  using (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()))
  with check (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()));

drop trigger if exists trg_email_templates_updated on public.email_templates;
create trigger trg_email_templates_updated before update on public.email_templates
  for each row execute function public.update_updated_at_column();
