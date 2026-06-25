---
name: siango-domains
description: "Domain Marketplace (reseller) - Openprovider account, what's built, the API blocker, what's left"
metadata: 
  node_type: memory
  type: project
  originSessionId: e5a7400b-1a5c-4f07-afb9-125d736d1967
---

Siango sells domains as a reseller (Wix-style recurring revenue). The big new monetization layer (see [[siango-roadmap]]).

**Reseller account:** Openprovider. Login `office@siango.app`, **RID 321474**, account currency USD, funded $10 (2026-06-25). Registered under ארפור טכנולוגיות בע"מ.

**API credentials:** Openprovider's API uses the account username + password (no separate key). Set as Supabase secrets `OPENPROVIDER_USERNAME` (office@siango.app) + `OPENPROVIDER_PASSWORD`.
**API ACCESS: ENABLED + WORKING (2026-06-25).** Enabled via RCP: Account > Account overview > click the contact (office@siango.app) > Edit (pencil) > check "API access Enabled" > clear the IP whitelist entries (empty = no IP restriction, needed for our dynamic-IP edge functions) > Update contact. Live `domain-search` verified: returns availability + priced results. Example: .com cost $6.99 -> ₪50 customer; .shop $4.99 -> ₪35; .co.il cost **$56 (high!)** -> ₪355.
**NOTE: .co.il is expensive at Openprovider ($56 cost).** Consider per-extension margin OR an Israeli registrar for .co.il. .com/.shop/.net are cheap + great.

**Built (tasks 1-4, 2026-06-25), all live on main:**
1. **Admin pricing** - `domain_settings` table (margin_percent default 100, coupon_percent 15, usd_to_ils 3.7) + admin screen "תמחור דומיינים" (מכירות > דומיינים) with live preview. `domain-search` reads it server-side. Customer price = cost_usd x usd_to_ils x (1+margin/100) x (1-coupon/100), rounded to ₪5.
2. **Lifecycle emails** - templates domainPurchased / domainExpiryReminder / domainExpiringUnpaid in PLATFORM_EMAILS; `domain-renewal-check` edge function on daily pg_cron `siango-domain-renewal` (09:00) sends 30d/7d reminders + expired-unpaid warnings (reads `domains` table).
3. **Search screen** - `DomainSearch` reusable component (calls `domain-search`) + `DashboardDomains` view (dashboard nav תפעול > דומיין: search + owned-domains list).
4. **Placements** - homepage "find your domain" section (buy -> /register) + dashboard (from #3).

**Tables:** `domain_settings`, `domains` (business_id, domain, status, expires_at, price_ils, cost_usd, op_order_id, reminder flags; RLS owner-read + admin-read).

**Price cap (DONE 2026-06-25):** `domain_settings.max_price_ils` (default 135) + admin field. domain-search caps the customer price at max_price_ils but floors at cost x 1.1 (never sell at a loss). Verified live: .online/.co cap at ₪135; .co.il floors at ₪230 (cost too high to cap).

**NOT built yet (the remaining domain block - resume here next session):**
- `domain-register` edge function: register via Openprovider (POST /v1beta/domains), charge the customer, auto-configure DNS to point at the Siango site, insert into `domains`, send the domainPurchased email. (DashboardDomains onBuy currently just toasts "coming".)
- **Balance monitoring** (user 🔴): read the Openprovider account balance via API, daily check, email admins when low, show it in the admin dashboard.
- **No-funds purchase alert** (user 🔴): if a purchase fails because the Openprovider balance is empty, email Moti urgently.
- **Cheaper .co.il provider** (user asked): Openprovider charges $56 for .co.il (too high). Sign up (via Claude browser) to a cheaper source for .co.il - an ISOC-IL accredited Israeli registrar (cheapest) or OpenSRS - and add it as a provider just for .co.il (architecture is provider-agnostic; keep Openprovider for global TLDs). Needs the user to open the account.
- Domain lifecycle "purchased" email needs the connection guide added (user request).
- DNS management UI + external-domain connect guide. Onboarding/settings placements.

**Strategy:** domains first, then **business email** (reseller via Google Workspace / OpenSRS) - same recurring+sticky model. Pricing decisions: 100% margin + 15% coupon (admin-editable). See [[siango-payment-partners]], [[siango-roadmap]].
