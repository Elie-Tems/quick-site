# Siango - Project Memory & Handoff

_Comprehensive handoff. The "why" behind the project. For the current operational snapshot, see [CURRENT_STATUS.md](CURRENT_STATUS.md). Last updated 2026-06-25._

---

## Overview & people

**Siango (סיאנגו)** is a Hebrew/RTL SaaS website & online-store builder for the Israeli market. Core promise: a live store in ~5 minutes with AI assistance.

- **Owner:** Moti (moti4384@gmail.com). Non-technical business owner; a self-described "data analytics freak" who wants every possible metric.
- **Partner:** Daniel (furmand713@gmail.com); gives design/UX feedback.
- **Former developer:** Eli - no longer involved. All dev/ops he used to do is now done directly. Do not wait on Eli.

**Business model:** Siango earns from a monthly subscription (**₪69/mo**) billed via **iCount**. Merchant stores collect their own customers' payments via **PayPlus**. As of mid-2026 there are **no paying customers yet** (pre-launch).

---

## 1. Major decisions made

- **Admin access is limited to the owner + partner only.** The former developer and a typo duplicate account were removed.
- **Admin financials report Siango's own revenue** (paying subscriptions x ₪69), NOT merchants' GMV. All demo/fake money was cleaned out, because there are no paying customers yet and the dashboard must reflect reality.
- **Referral surfacing is allowed at the publish moment and in the site-ready email, but NOT as a referral link in every store's public footer** - that was judged economically harmful to Siango. The public footer shows only a plain "נבנה ע"י Siango" credit (with utm_source=store_credit).
- **Removed the redundant first welcome email** (the user builds a site minutes later and receives a site-ready email anyway).
- **Never fake functionality.** Specifically refused to fake an iCount coupon discount; the real billing capability will be investigated instead.
- **Customer order-confirmation email is sent FROM the merchant** (reply-to the merchant), not from Siango - it is the store's email to its customer.
- **Copy must read human**, cleaned of AI fingerprints (ben-adam skill). Hard rule: never use em/en dashes, always a plain hyphen "-".
- **The admin dashboard must scale to thousands of stores** without hanging (drove the query refactor).

## 2. Architectural decisions

- **Frontend:** Vite + React + TypeScript SPA, Tailwind, shadcn/ui, Hebrew RTL.
- **Hosting:** Cloudflare Pages (project `siango`, branch `main`).
- **Backend:** Supabase (project ref `ytqgeoviokgxxwalieev`). Postgres + RLS, Auth (Google + email), Edge Functions (Deno), Storage. Authz via a `has_role(user_id,'admin')` RPC + `user_roles` table.
- **Email:** Resend, sending domain `send.siango.app` (verified). Lifecycle emails go through the `send-platform-email` edge function (verify_jwt=true; the public anon key is a valid JWT so anonymous storefront visitors can still trigger the customer order email).
- **Subscriptions billed via iCount** (hosted page, fixed price; has a recurring direct-debit "הו"ק" model). **Merchant store checkout via PayPlus.**
- **Analytics** are first-party: a `page_views` table (with referrer + utm_source) and an `analytics_events` table (view_product / add_to_cart / begin_checkout / purchase), keyed by a localStorage `visitor_id`. RLS isolates each merchant's data so the insights view is safely merchant-facing.
- **Decision: keep merchant analytics merchant-facing and platform analytics separate.** Each store owner sees only their own shoppers' funnel; the platform owner gets a separate super-admin view.
- **SEO:** Google Search Console verified via an HTML file in `public/`; the verified property enables a future GSC-API-driven analytics module.

## 6. Future roadmap

1. **Super-admin "Command Center" analytics** (owner is a data freak; approved in principle, awaiting final go):
   - SEO & Google via the **Search Console API** (search queries, average position per keyword, impressions/clicks/CTR, opportunity keywords, indexed-page count) - needs a Google Cloud service account. (Phase 2.)
   - Growth & revenue: MRR/ARR + MRR movement, paid conversion, churn % + reasons, cohort retention, LTV.
   - Merchant health: active vs dormant + churn-risk alerts, feature adoption, top/bottom performers, AI-credit upsell candidates.
   - Marketplace aggregate across all stores: GMV, orders, AOV, aggregate funnel, category & traffic breakdown.
   - Real-time + smart alerts; free exploration with date filters, drill-down, CSV export.
   - Build order: Phase 1 = everything from existing data; Phase 2 = SEO/GSC; Phase 3 = CAC/ROI (needs ad-spend) + geography (needs capture).
2. **iCount recurring (הו"ק) + coupon** - verify monthly collection and wire coupons. Revenue-blocking.
3. **PayPlus end-to-end test** with a test card (owner action).
4. **Launch cleanup**: remove `/preview/*`; add store pages to the sitemap (Cloudflare Pages env vars).
5. **Multi-language emails** (translate ~14 templates).

## 7. Important discussions & conclusions

- **Revenue vs GMV:** the admin had been showing merchant turnover as if it were Siango's money. Conclusion: the platform dashboard must show Siango's subscription revenue only.
- **iCount coupons:** the hosted iCount page uses a fixed price, so a coupon cannot be applied purely from our code. Conclusion: do not fake a discount; investigate iCount's real recurring/coupon capabilities first.
- **Insights ownership:** clarified that the insights tool built into the merchant dashboard shows each store owner THEIR OWN customers' funnel (a selling point), and is distinct from the platform-wide analytics the owner wants for himself.
- **Referral economics:** a footer referral link on every store was rejected as not economical; surfacing referrals at the publish moment + in email was kept.

## 8. Lessons learned during development

- The npx-cached Supabase CLI binary can fail to spawn (`spawnSync ... UNKNOWN`, errno -4094) due to antivirus/cache corruption. Fix: delete the `_npx/<hash>` cache folder and rerun `npx --yes supabase@latest ...`.
- Browser automation (Claude-in-Chrome): screenshots froze on heavy third-party dashboards but were fine on the app; console/network capture only starts after the read tool is first called, so reload after starting capture.
- Git commits failed when the message contained a Hebrew quote character (`ע"י`); use quote-free commit messages.
- Setting DNS via the Cloudflare API token worked when the dashboard UI hung.
- Disabling a query (`enabled:false`) masked an underlying RLS performance problem rather than fixing it - the root cause still needs attention.

## 10. Context that would be lost otherwise

- **The GitHub remote is `github.com/Elie-Tems/quick-site.git`** - i.e. under the former developer's GitHub org. The owner removed Eli's access inside the app, but the source repository (including this handoff) is hosted under Eli's org. Worth confirming who actually controls this GitHub account before treating pushes here as private.
- **Secrets to revoke** (used during the build, deliberately NOT written into any committed file): the Supabase Personal Access Token and the Cloudflare API token. Only the Supabase **anon/public** key is safe to share; never expose the service_role key.
- The Supabase project ref is `ytqgeoviokgxxwalieev`; the anon public key is embedded in the built frontend (public by design).
- There is a more detailed, non-committed memory set under the local Claude memory folder (overview, architecture, product decisions, features, roadmap, security) that mirrors this document.

---

_Operational snapshot and next priorities: [CURRENT_STATUS.md](CURRENT_STATUS.md)._
