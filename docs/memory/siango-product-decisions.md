---
name: siango-product-decisions
description: "Key product/UX decisions and their rationale - admin scope, revenue vs GMV, referral, emails, onboarding, no-fake rule"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e5a7400b-1a5c-4f07-afb9-125d736d1967
---

Decisions the user made during the long build session, with the reasoning. Treat these as standing guidance.

**Admin access:** ONLY moti4384@gmail.com + furmand713@gmail.com are admins. Eli and a typo account `furmamnd713` were removed.
- Why: Eli is out; only the owner + partner should have admin.

**Admin financials show SIANGO's revenue, not merchant GMV.** Total/MRR = paying subscriptions (paid_until>now, active, ₪69) × price. Demo/fake money was cleaned out. `useAdmin.ts` uses bulk counts (3 queries) + `.limit(300)` to scale.
- Why: "המערכת אמורה להציג נתונים שלנו של העסק, לא של החנויות"; and there are no paying customers yet, so no fake numbers. Must not hang with thousands of stores.

**Referral / sharing:** surfacing approved at the publish moment + a CTA in the site-ready email. The plain credit footer reads "נבנה ע"י Siango" with `?utm_source=store_credit`. The idea of a referral link in the store footer was REJECTED.
- Why: "מה פתאום זה לא כלכלי לי" - a referral offer in every merchant's public footer hurts Siango economically.

**Emails:** removed the redundant first welcome email (the user builds a site ~5 min later and gets a site-ready email anyway). Sender shows "Siango" (English). Future: emails in other languages should match the user's language.

**Onboarding fixes (Daniel's list 1-10, all done):** back button on steps; auto-scroll after file upload is detected; category screen -> search + autocomplete (+ browse-all); business hours -> "open 24/7" default toggle vs custom; removed secondary-color cubes; usage/AI-credit dashboard; soft-suspend model for non-payment; welcome+order emails; Search Console; remove /preview before launch (still pending).

**Payment approval kit:** lets a merchant show credit-card companies a live site with terms/policies BEFORE getting PayPlus/sliqa approved. Built into DashboardPayments.

**Subscription coupons** (super-admin): support first-month-only OR a recurring monthly discount.

**Homepage:** add more "התחילו עכשיו" CTAs - improves conversion.

**NEVER fake functionality.** Specifically refused to fake iCount coupon discounts; will investigate the real iCount capability instead. General rule across the project.

**Voice / copy:** use the ben-adam skill to remove AI fingerprints from system + email copy. HARD rule: never use em/en dashes ("—"/"–"), always a regular hyphen "-" (see [[no-em-dashes]]).

**Insights tool is MERCHANT-facing:** each store owner sees a funnel of THEIR OWN shoppers (RLS-isolated), as a value-add selling point. Separately, the platform owner has super-admin analytics about the merchants. The user (a data freak) wants a much bigger super-admin "Command Center" - see [[siango-roadmap]].

See [[siango-overview]], [[siango-features-built]].
