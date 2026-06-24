---
name: siango-architecture
description: "Tech stack, infra, Supabase/Cloudflare/Resend/iCount/PayPlus, deploy commands, DB schema, gotchas"
metadata: 
  node_type: memory
  type: reference
  originSessionId: e5a7400b-1a5c-4f07-afb9-125d736d1967
---

**Frontend:** Vite + React + TypeScript SPA, Tailwind, shadcn/ui, Hebrew RTL. Repo root: `C:\Users\moti4\Downloads\quick-site-main`. Git branch `main`, remote pushed via `git push origin main`. Git user motiargaman. Commit footer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

**Hosting - Cloudflare Pages**, project `siango`, branch `main`.
- Deploy: `npm run build` then `npx --yes wrangler pages deploy dist --project-name=siango --branch=main --commit-dirty=true`.
- A Cloudflare API token (DNS-scoped) was used for DNS records - MUST be revoked (see [[siango-security-todo]]).
- TODO for SEO: set `SUPABASE_URL` + anon `SUPABASE_ANON_KEY` as Cloudflare Pages env vars so the sitemap function includes store pages (currently only ~9 static pages indexed). DNS-scoped token cannot set Pages env; needs the dashboard or a broader token.

**Backend - Supabase**, project ref `ytqgeoviokgxxwalieev`.
- URL: https://ytqgeoviokgxxwalieev.supabase.co
- Anon public key (safe to embed/share):
  `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl0cWdlb3Zpb2tneHh3YWxpZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMTA0NjYsImV4cCI6MjA4Njg4NjQ2Nn0.jeSSSbTP3CbKVjlzqlYavwoGqooLW7bLV9JQTY9RhD8`
- Service role key + Personal Access Token: NOT stored here on purpose (secret). PAT must be revoked.
- Edge functions (Deno) live in `supabase/functions/*`. Deploy one: set `SUPABASE_ACCESS_TOKEN` env = a valid PAT, then `npx --yes supabase@latest functions deploy <slug> --project-ref ytqgeoviokgxxwalieev`.
- NOTE (2026-06-25): the PAT was revoked by the user, so there is currently NO token to deploy functions or run Management API SQL. A new PAT must be created first. See [[siango-security-todo]].
- Management API base: `https://api.supabase.com/v1/projects/ytqgeoviokgxxwalieev/...` with PAT bearer. Useful paths: `/database/query` (run SQL), `/config/auth`, `/functions/{slug}`, `/secrets`.

**Gotchas / hard-won fixes:**
- The npx-cached supabase CLI binary can fail to spawn (`spawnSync ... UNKNOWN`, errno -4094) - antivirus/cache corruption. FIX: `Remove-Item -Recurse -Force "$env:LOCALAPPDATA\npm-cache\_npx\<hash>"` then rerun `npx --yes supabase@latest ...`. This recovered function deploys.
- Claude-in-Chrome: screenshots froze on heavy pages (Cloudflare dashboard); worked fine on siango.app. javascript_tool: top-level await works, async IIFEs return {} (don't await them). console/network tracking only starts AFTER the read tool is first called - must reload the page after starting tracking to capture load-time logs.
- git commit failed when message contained Hebrew quote `ע"י` - use quote-free commit messages.

**Auth:** Supabase Auth - Google OAuth + email. `has_role(user_id,'admin')` RPC + `user_roles` table + RLS. Google consent screen currently shows the `...supabase.co` URL instead of "Siango" (needs Supabase Pro custom auth domain to fix). Auth redirect URLs configured.

**Email - Resend.** Domain `send.siango.app` verified (DNS done). `RESEND_API_KEY` secret set (was rotated via clipboard to avoid chat exposure). Sender name "Siango". Templates duplicated in `src/lib/email/platformEmails.ts` AND `supabase/functions/_shared/email/platformEmails.ts` (+ `_shared/email/resend.ts` fromName default "Siango", + `_shared/email/rtlEmail.ts` renderEmail which REQUIRES an unsubscribeUrl). Send via `send-platform-email` edge function (verify_jwt=true; the anon key is a valid JWT so anonymous storefront visitors can invoke it).

**Payments:**
- Subscriptions = Siango's revenue: **iCount**, ₪69/mo, hosted payment page with a FIXED price (so a discount/coupon cannot be applied purely from our code as-is). iCount has a **הו"ק (recurring direct-debit)** model. `icount-webhook` function exists. Recurring charge + coupon application are NOT yet verified/wired - investigate carefully, do not break charges.
- Merchant store checkout = **PayPlus**.

**SEO:** Google Search Console verified via HTML file `public/google41d23f5e6d05c945.html`. Sitemap submitted (success, ~9 pages). Property is verified so the GSC API can later be used for the analytics Command Center (see [[siango-roadmap]]).

**Analytics tables/flow:**
- `page_views` (cols incl. business_id, visitor_id, page_path, referrer, user_agent, utm_source). Inserted by `trackPageView` in `src/hooks/useAnalytics.ts` (visitor_id persisted in localStorage; captures `utm_source` from query string).
- `analytics_events` (business_id, visitor_id, event_type, product_id, value, metadata). event_type in: view_product / add_to_cart / begin_checkout / purchase. Inserted by `trackEvent` in the same hook. RLS: anon insert, owner select - so each merchant only sees their own store's events.
- The legacy `useAnalytics` query is DISABLED (`enabled:false`) because the RLS policy caused infinite loading; the new insights/traffic views use direct `(supabase as any).from(...)` queries with `.limit(20000)` instead.
- Other migrated DB changes: `help_conversations`; businesses soft-suspend cols `is_suspended/suspended_at/suspend_reason`; `profiles.welcome_sent`; `subscription_coupons` table.

See [[siango-overview]], [[siango-features-built]], [[siango-security-todo]].
