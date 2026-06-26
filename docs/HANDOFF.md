# Siango - Developer Handoff (for Daniel)

Last updated: 2026-06-26. This is the practical "how to continue" doc. It covers
what was built recently, what's live vs preview vs not-yet-deployed, the
conventions to follow, and the open tasks.

## TL;DR of recent work
New recurring-revenue products + UX, all on `main`:
- **Domains marketplace** (Openprovider reseller) - search + buy flow, balance monitor. LIVE.
- **WhatsApp Business** (Twilio BSP) - full system. BUILT, **flag-gated OFF, NOT published** (Moti must approve before go-live).
- **Business email** (OpenSRS reseller) - mailbox product. BUILT, flag-gated OFF.
- **Command Center** + **Siango marketing/acquisition tracking** + **per-store font switcher** + **upgrades/upsell hub**. On prod or preview (see below).
- **Perf**: instant loader + vendor code-splitting + non-blocking fonts. LIVE.

## Deploy model (IMPORTANT)
- Hosting: **Cloudflare Pages**, project `siango`.
  - Production: `npx wrangler pages deploy dist --project-name=siango --branch=main --commit-dirty=true`
  - Preview (review without touching prod): same but `--branch=preview` -> serves at `https://preview.siango.pages.dev`.
- Backend: **Supabase** (ref `ytqgeoviokgxxwalieev`). Edge functions in `supabase/functions/*`; deploy with `SUPABASE_ACCESS_TOKEN=<PAT> npx supabase functions deploy <slug> --project-ref ytqgeoviokgxxwalieev`. Migrations in `supabase/migrations` (some applied via the Management API `/database/query`).
- **Build commands**: `npm run build` (Vite). Typecheck: `npx tsc --noEmit`.

## Feature flags & the "build, don't deploy" rule
Moti's rule for new paid products: **build it, show him on the preview link, get
approval, THEN publish.** Two flags in `src/lib/featureFlags.ts`:
- `whatsappEnabled()` (env `VITE_WHATSAPP_ENABLED`) - **WhatsApp is OFF**; do NOT publish until Moti says so explicitly.
- `emailEnabled()` (env `VITE_EMAIL_ENABLED`) - business email is OFF.
When OFF, the nav items are hidden in both merchant + admin. Preview routes
(`/preview/whatsapp`, `/preview/email`) use sample data and bypass the flag for Moti's review.

## Where things live
| Area | Files | Status |
|---|---|---|
| Domains (merchant) | `components/dashboard/DashboardDomains.tsx`, `components/domains/*`, fns `domain-search/-purchase/-purchase-webhook/-balance-check` | LIVE (charging gated on Moti's iCount page) |
| Domains (admin) | `components/admin/AdminDomainSettings.tsx` | LIVE |
| WhatsApp (merchant) | `components/dashboard/DashboardWhatsApp.tsx` (chat, contacts, campaigns, templates, AI bot, settings) | flag OFF |
| WhatsApp (admin) | `AdminWhatsApp.tsx` (adoption), `AdminWhatsAppBot.tsx` (manage Siango's own bot) | flag OFF |
| WhatsApp (backend) | `_shared/whatsapp/twilio.ts`, fns `whatsapp-connect/-send/-webhook/-broadcast/-buy-number/-bot-prompt`, migration `20260626140000` + `..._order_trigger` | NOT deployed; migrations NOT applied |
| Business email | `DashboardEmail.tsx`, `AdminEmailSettings.tsx`, fn `email-provision`, migration `20260626160000` | flag OFF |
| Marketing tracking | `AdminMarketing.tsx`, `hooks/useAdminMarketing.ts`, `lib/utmCapture.ts`, migration `20260626120000` | LIVE |
| Command Center | `AdminCommandCenter.tsx`, `hooks/useCommandCenter.ts` | LIVE |
| Font switcher | `DashboardDesign.tsx`, `lib/storeFonts.ts`, `StoreFront.tsx`, migration `20260626180000` | on PREVIEW (awaiting approval) |
| Upgrades hub | `DashboardUpgrades.tsx` | on PREVIEW |
| Checkout redesign + footer credit | `StoreCheckout.tsx`, `StoreFooter.tsx` | LIVE |

## To take a product LIVE (go-live checklists)
**WhatsApp** (only when Moti says): open Twilio + Meta Business Manager; set secrets
`TWILIO_ACCOUNT_SID/AUTH_TOKEN/WHATSAPP_FROM`, `WHATSAPP_INTERNAL_SECRET`, `TWILIO_STATUS_CALLBACK`, Cloudflare `VITE_META_APP_ID`; apply the whatsapp migrations; deploy the whatsapp-* functions; point Twilio inbound + status webhooks at `whatsapp-webhook`; flip `VITE_WHATSAPP_ENABLED=true`; apply `..._order_trigger` + set the `app.supabase_url` / `app.whatsapp_internal_secret` GUCs.

**Business email**: open OpenSRS (same account used for .co.il domains); set `OPENSRS_EMAIL_USER/KEY`; apply migration `20260626160000`; deploy `email-provision`; wire MX records to OpenSRS on provision; flip `VITE_EMAIL_ENABLED=true`.

## Open tasks (for Daniel)
- WhatsApp: actually upload media to storage before send (UI + size limits exist; wire the upload); finish the buy-a-number UX (function `whatsapp-buy-number` exists); test Embedded Signup once the Meta app exists.
- Email: provisioning function is a stub for OpenSRS - confirm the real OpenSRS email API + MX automation.
- Multilingual emails: only `siteReady` + `domainPurchased` are translated (he/en/ar/fr/ru); extend the rest using the dir-aware builder in `_shared/email/rtlEmail.ts` (optional `dir`/`lang`).
- Custom-domain serving: app-side resolution is done (`get_store_slug_for_domain` RPC + `useResolvedTenant`); still need Cloudflare custom-hostname provisioning per bought domain.
- .co.il via OpenSRS (Openprovider too expensive at $56); iCount recurring billing; PayPlus end-to-end test.

## Blocked on Moti (accounts to open)
Twilio · Meta Business Manager · OpenSRS (covers .co.il domains + email) · iCount payment page · Cloudflare API token (Zone:Edit, for custom hostnames). Claude can't create accounts; Moti opens them and provides the secrets.

## Conventions
- Hebrew RTL UI; commit messages in ASCII (Hebrew quotes break git). Branch `main`.
- New admin screens: add to `AdminDashboardContent.tsx` (type + NAV + VIEW_TITLES + ViewContent switch).
- New merchant screens: add to `DashboardNav.tsx` (`DashboardView` + nav item) + `Dashboard.tsx` render switch.
- RLS pattern for per-business tables: owner via `business_id in (select b.id from businesses b join profiles p on p.id=b.owner_id where p.user_id=auth.uid())`, admin via `has_role(auth.uid(),'admin')`.
