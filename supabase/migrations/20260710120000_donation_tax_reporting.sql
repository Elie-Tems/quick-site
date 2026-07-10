-- תרומות ישראל (Israel Donations) reporting - mandatory for Section-46 nonprofits
-- from 1.1.2026. A donation that grants a tax credit MUST be reported to the Tax
-- Authority via a connected receipt provider (iCount etc.), which returns a
-- one-time ALLOCATION NUMBER (מספר הקצאה) embedded on the receipt. The old
-- "download a PDF receipt to claim Section 46" model is obsolete - the credit now
-- appears automatically in the donor's personal area at the Tax Authority.
--
-- This migration adds the per-nonprofit reporting config. Actual receipt data
-- (allocation number, doc url, donor id) lives in transactions.details (jsonb).

alter table public.businesses
  add column if not exists nonprofit_46_number text,           -- מספר מוסד ציבורי (46)
  add column if not exists donation_receipt_provider text,      -- 'icount' | null
  add column if not exists donation_reporting_enabled boolean not null default false;

comment on column public.businesses.donation_reporting_enabled is
  'When true, each paid donation is issued a donation receipt via the nonprofit''s connected provider, which reports it to תרומות ישראל and returns an allocation number. OFF by default - enable only once the provider connection is verified. Requires nonprofit_46_number + a connected receipt provider + the donor''s ID.';

-- Donation reporting uses the merchant's own iCount account (a nonprofit account,
-- distinct from Siango's platform-billing iCount). Stored encrypted like the
-- payment credentials pattern.
create table if not exists public.donation_receipt_credentials (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  provider text not null default 'icount' check (provider in ('icount')),
  api_token_enc text,             -- the nonprofit's iCount API token (encrypted)
  company_id text,                -- iCount company id / cid
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.donation_receipt_credentials enable row level security;

drop policy if exists "owner manages own donation_receipt_credentials" on public.donation_receipt_credentials;
create policy "owner manages own donation_receipt_credentials" on public.donation_receipt_credentials for all
  using (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()))
  with check (business_id in (select b.id from public.businesses b join public.profiles p on p.id = b.owner_id where p.user_id = auth.uid()));

drop trigger if exists trg_donation_receipt_creds_updated on public.donation_receipt_credentials;
create trigger trg_donation_receipt_creds_updated before update on public.donation_receipt_credentials
  for each row execute function public.update_updated_at_column();
