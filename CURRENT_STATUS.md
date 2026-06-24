# Siango - Current Status

_Snapshot date: 2026-06-25. Operational state of the project. For the deeper "why" and history, see [PROJECT_MEMORY.md](PROJECT_MEMORY.md)._

---

## Deploy status

- **Live and current.** Frontend on Cloudflare Pages (project `siango`, branch `main`); all edge functions deployed.
- Build + deploy: `npm run build` then `npx --yes wrangler pages deploy dist --project-name=siango --branch=main --commit-dirty=true`.
- Deploy a single edge function: set `SUPABASE_ACCESS_TOKEN` env to a valid PAT, then `npx --yes supabase@latest functions deploy <slug> --project-ref ytqgeoviokgxxwalieev`.

---

## 3. Features completed

**Merchant dashboard analytics**
- Insights view (`DashboardInsights.tsx`): conversion funnel (visits -> add to cart -> checkout -> purchase) + plain-language recommendations + 7/30/90-day filter. Merchant-facing, RLS-isolated per store.
- Traffic Sources (`DashboardTrafficSources.tsx`): categorizes referrer + utm_source with a date filter.
- Usage/AI (`DashboardUsage.tsx`): AI credit balance, generations, low-credit alert.
- Collapsible nav groups (`DashboardNav.tsx`), only the active group open by default.

**Storefront event tracking**
- `trackEvent` + `trackPageView` (with utm_source capture) in `useAnalytics.ts`; events fired from `StoreFront.tsx` (add_to_cart, begin_checkout, purchase).

**Email system (live end-to-end via Resend, domain send.siango.app verified)**
- Sender "Siango"; site-ready email with referral CTA; customer order-confirmation email sent FROM the merchant (reply-to merchant) on order placement; redundant first welcome email removed.
- Templates in `src/lib/email/platformEmails.ts` + `supabase/functions/_shared/email/platformEmails.ts`; sent via `send-platform-email` edge function.

**Payments**
- Payment Approval Kit (`PaymentApprovalKit.tsx`): readiness checklist + copy-site-link for credit-card-company approval.
- Onboarding payments step rewritten to PayPlus-primary (fake providers removed).

**Super-admin**
- Revenue shows Siango subscription income (NOT merchant GMV); demo/fake money cleaned.
- Subscription coupons (first-month or recurring); business suspend/restore + permanent delete; admin queries made scalable (bulk counts + limits).
- Admin access locked to the owner + partner only.

**Onboarding fixes (Daniel's list 1-10)**
- Back button, file-upload auto-scroll, category search + autocomplete, "open 24/7" hours toggle, secondary-color cubes removed, soft-suspend model, usage dashboard, emails, Search Console verified + sitemap submitted.

**Marketing / SEO**
- Extra "start now" CTAs on the homepage; SEO copy humanized; store credit footer "נבנה ע"י Siango" with utm_source=store_credit; Google Search Console verified (HTML file).

---

## 4. Features partially completed

- **iCount subscription billing** - hosted page works at fixed ₪69; coupon application and verification of the recurring (הו"ק) direct-debit charge are NOT done. `icount-webhook` exists but recurring/coupon behavior is unverified.
- **Sitemap** - only ~9 static pages indexed; store pages not yet included (needs Cloudflare Pages env vars).
- **Multi-language emails** - infrastructure ready, templates are Hebrew only.
- **Super-admin Command Center analytics** - proposed and approved in principle; not built (awaiting final go).

---

## 5. Known bugs / issues

- **Legacy `useAnalytics` query is disabled** (`enabled:false`) due to an RLS policy performance problem causing infinite loading. New views use direct queries with limits as a workaround; the root RLS perf issue is not fixed.
- **Google OAuth consent screen shows the `*.supabase.co` URL** instead of "Siango" (needs Supabase Pro custom auth domain). Cosmetic but looks unprofessional.
- **Direct analytics queries use `.limit(20000)`** - fine now, but will under-count at very high traffic; needs server-side aggregation before scale.
- No automated test suite; verification is manual.

---

## 9. Recommended next priorities

1. **iCount recurring (הו"ק) + coupon** - the one gap blocking paid-subscription marketing. Verify monthly charges actually collect; wire coupons. Investigate `icount-webhook` carefully; do not break charges; do not fake.
2. **PayPlus end-to-end test** with a real test card (owner action - Claude cannot enter card details).
3. **Super-admin Command Center** Phase 1 (growth/revenue, merchant health, marketplace aggregate, real-time alerts, CSV) from existing data.
4. **Launch cleanup**: remove `/preview/*` routes; add store pages to the sitemap (Cloudflare Pages env).
5. **Security**: revoke the Supabase PAT and Cloudflare token used during the build (see PROJECT_MEMORY.md).

---

_Full decisions, architecture, lessons, and roadmap: [PROJECT_MEMORY.md](PROJECT_MEMORY.md)._
