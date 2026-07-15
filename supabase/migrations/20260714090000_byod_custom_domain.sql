-- Support "bring your own domain" (BYOD): a merchant who already owns a domain
-- elsewhere connects it to their Siango store as a paid recurring add-on
-- (see addon-subscribe's 'custom_domain' entry), instead of buying a NEW
-- domain through us (registered via Openprovider - see register.ts).
--
-- `source` distinguishes the two so the dashboard/admin can tell them apart;
-- purchased domains default to 'purchased' for backward compatibility.
alter table public.domains add column if not exists source text not null default 'purchased';

-- One domain can only ever point at one store. Case-insensitive: registrars
-- return whatever case the customer typed, we always compare lowercased.
create unique index if not exists idx_domains_domain_lower on public.domains (lower(domain));
