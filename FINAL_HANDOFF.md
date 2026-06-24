# Siango - Final Handoff

_Single entry point for the next developer / next Claude Code session. Date: 2026-06-25._

_Deeper detail lives in [CURRENT_STATUS.md](CURRENT_STATUS.md), [PROJECT_MEMORY.md](PROJECT_MEMORY.md), and the mirrored memory set in [docs/memory/](docs/memory/)._

---

## Current project status

Siango is a Hebrew/RTL SaaS website & store builder. The product is **live and functionally complete** (signup, AI onboarding, storefront, cart/checkout, orders, emails, merchant dashboard, super-admin). Frontend on Cloudflare Pages; Supabase backend; Resend email (verified); subscriptions via iCount (₪69/mo); merchant checkout via PayPlus. **No paying customers yet - pre-launch.**

## Last completed work

- Merchant **Insights** view (conversion funnel + recommendations) and **Traffic Sources** view, wired into the dashboard.
- Storefront **event tracking** (add_to_cart / begin_checkout / purchase) into `analytics_events`.
- **Customer order-confirmation email** sent FROM the merchant (reply-to merchant) on order placement; `send-platform-email` extended + redeployed.
- Handoff docs added: CURRENT_STATUS.md, PROJECT_MEMORY.md, and this file; memory mirrored into docs/memory/.

## Open tasks

- **iCount recurring (הו"ק) + coupons** - verify monthly charges actually collect and wire coupon application. The user marked this as the active top priority. (Requires a fresh Supabase PAT to deploy - see below.)
- **PayPlus end-to-end test** - the user will run a test-card transaction.
- **Multi-language emails in 5 languages** - the user wants this now (no longer deferred); confirm the language set.
- **Improve AI image generation** - the user wants the generation itself improved (onboarding step 3 is slow/flaky).
- **Shorten onboarding** - the user is open to consolidating the ~8 steps; a proposal is needed.
- **Launch cleanup** - remove `/preview/*` routes; add store pages to the sitemap (Cloudflare Pages env vars `SUPABASE_URL` + anon key).

## Recommended next priorities

1. **iCount billing** (revenue-blocking) - get a new PAT from the user, then investigate `icount-webhook` carefully and wire recurring + coupons without breaking charges. Never fake it.
2. **AI image generation** improvement (the user explicitly chose this over de-emphasizing it).
3. **Multi-language emails** (5 languages).
4. **Onboarding consolidation** proposal + implementation.
5. **Launch cleanup** (preview routes + sitemap).

## Anything the next session MUST know

- **No active backend token.** The Supabase Personal Access Token and the Cloudflare API token were **deleted by the user on 2026-06-25**. You therefore **cannot deploy edge functions or run Management API SQL** until the user creates a new Supabase PAT (Supabase -> Account -> Access Tokens). Frontend deploys via `wrangler` still work.
- **Build + deploy frontend:** `npm run build` then `npx --yes wrangler pages deploy dist --project-name=siango --branch=main --commit-dirty=true`.
- **Deploy an edge function (needs a fresh PAT):** set `SUPABASE_ACCESS_TOKEN`, then `npx --yes supabase@latest functions deploy <slug> --project-ref ytqgeoviokgxxwalieev`. If the CLI fails with `spawnSync ... UNKNOWN`, delete the `_npx/<hash>` cache folder and retry.
- **Supabase project ref:** `ytqgeoviokgxxwalieev`. The anon (public) key is in docs/memory/siango-architecture.md and is safe. Never expose the service_role key.
- **The GitHub remote (`github.com/Elie-Tems/quick-site.git`) is under the former developer's org.** The user confirmed pushing there is acceptable, but be aware the source (including these strategy docs) is hosted under that account.
- **Hard copy rule:** never use em/en dashes ("—"/"–"); always a plain hyphen "-". Applies to all UI, emails, and commits.
- **Financials:** the admin dashboard must show Siango's subscription revenue, NOT merchant GMV. No fake/demo numbers.
- **Insights are merchant-facing** (each store owner sees only their own shoppers). A separate platform-wide super-admin "Command Center" analytics suite is proposed and approved in principle - see PROJECT_MEMORY.md / docs/memory/siango-roadmap.md.
