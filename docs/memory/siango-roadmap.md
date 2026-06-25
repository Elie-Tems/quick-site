---
name: siango-roadmap
description: "Pending work and future plans - super-admin Command Center analytics, iCount billing, multi-lang emails, launch cleanup"
metadata: 
  node_type: memory
  type: project
  originSessionId: e5a7400b-1a5c-4f07-afb9-125d736d1967
---

Open work, roughly by priority.

**1. Super-admin "Command Center" analytics (the big next thing).** The owner is a self-described data freak who asked to "think big, bring bombshells" and said "אני יאשר לך" (he will approve before build). Proposed modules:
- SEO & Google (his explicit top ask): search queries that brought traffic, average Google position per keyword, impressions/clicks/CTR, "opportunity" keywords (high impressions + low position), indexed-pages count. Needs the **Google Search Console API** -> requires a Google Cloud service account (verified GSC property already exists). This is Phase 2.
- Growth & revenue: MRR/ARR + MRR movement, paid conversion, churn % + reasons, cohort retention, LTV. (CAC/payback needs ad-spend data.)
- Merchant health: active vs dormant + churn-risk alerts, feature adoption (AI/coupons/campaigns), top/bottom performers by GMV, AI-credit upsell candidates.
- Marketplace aggregate (across ALL stores): total GMV, orders, AOV, aggregate funnel, category + traffic-source breakdown.
- Real-time + smart alerts: live activity feed, today's signups/publishes/sales, anomaly alerts (signup spike, churn wave, payment errors, a store's first sale).
- Free exploration: date filters, drill-down, CSV export.
- Recommended build order: Phase 1 = everything buildable from existing data (growth, health, marketplace, real-time, exploration); Phase 2 = SEO via GSC API; Phase 3 = CAC/ROI (needs ad spend) + geography (needs capture). Awaiting the user's final go + any must-have metric he adds.

**2. iCount subscription billing - ACTIVE TOP PRIORITY (revenue-blocking).** The user explicitly said to handle this now ("אתה חייב לבדוק ולטפל בזה עכשיו!!!", "בוודאי").

INVESTIGATION FINDINGS (2026-06-25): there is **NO iCount API integration and NO recurring-billing code anywhere**. Current flow is a ONE-TIME payment:
- `src/lib/publishPaymentConfig.ts` builds a URL to an iCount **hosted page** (fixed ₪69) with session_token + business_id appended.
- A `publish_checkout_sessions` row (status pending) is created; on payment, either `icount-webhook` (supabase/functions/icount-webhook/index.ts) fires -> marks session paid -> sets `businesses.is_published=true`, OR the merchant manually enters the iCount approval number in DashboardSubscription -> `finalize-publish` publishes.
- `subscriptions` table has paid_until/status/cancel_at; `expire-subscriptions` function takes a site offline when it expires. But NOTHING recharges the card monthly. The "₪69/חודש" + cancel-dialog wording imply recurring, but it is not implemented. iCount holds the card (not us), per the user.

PLAN options (do not fake; needs user input + a fresh PAT to deploy):
- Option A (iCount-managed): set the iCount page up as a הו"ק/standing-order so iCount auto-charges monthly and fires the webhook each cycle; extend `icount-webhook` to handle RENEWAL events (extend paid_until, keep published) using a stable business/subscription reference.
- Option B (we-managed via iCount API, also solves coupons): store the iCount customer/token at first charge; a scheduled function charges due subscriptions monthly via iCount's API with the amount we set (so a coupon can reduce it), then extends paid_until. Coupons cannot apply on the current fixed hosted page, so Option B is cleaner for coupons.

NEED FROM USER before building: (a) a fresh Supabase PAT to deploy + set secrets; (b) iCount API credentials (CID/user/pass or API token), set as Supabase secrets, never pasted in chat; (c) confirmation of whether the current iCount page is one-time or already a הו"ק page, and the page/product id. Coupons UI exists (`AdminSubscriptionCoupons.tsx`) but is not wired to actual charging.

**3. PayPlus end-to-end test** with a real test card. User action (Claude cannot enter card details).

**4. Launch cleanup:** remove `/preview/*` routes before public launch (still used to show Daniel for now).

**5. SEO sitemap - DONE (2026-06-25).** `functions/sitemap.xml.ts` already enumerated published stores; set `SUPABASE_URL` + `SUPABASE_ANON_KEY` as Cloudflare Pages secrets via `wrangler pages secret put` (no PAT needed - public values). siango.app/sitemap.xml now returns 29 entries (9 static + published stores x2). Google will pick them up on next crawl.

**6. Multi-language emails - now WANTED (no longer deferred).** The user said "תעשה בכל 5 שפות" - translate the ~14 templates into 5 languages. Confirm the exact set with the user; likely Hebrew, English, Arabic, Russian + one more (French/Spanish) given the Israeli market. Pick language per recipient.

**7. Improve AI image generation (requested).** The user does NOT want to merely de-emphasize it - he wants the actual generation improved (onboarding step 3 is slow and sometimes fails). Investigate the image-gen edge function / model + add clearer progress. Keep upload as a fallback.

**8. Shorten onboarding (user is open to it).** Currently ~8 steps; the user asked for a consolidation proposal. Candidate merges: combine brand-language-source + brand-style into one "look & feel" step; fold business hours into the about/details step; defer payments to post-publish (publish first, connect PayPlus later) so time-to-live drops. Propose, then implement on approval.

**9. Optional:** deeper AI-fingerprint cleanup of UI marketing copy (he.ts hero/benefits) if the user wants.

See [[siango-architecture]], [[siango-product-decisions]], [[siango-security-todo]].
