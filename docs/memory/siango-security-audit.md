---
name: siango-security-audit
description: "Security audit findings and fixes (2026-06-25) - RLS exposure fixed, dep vulns, monitoring, Israeli privacy exposure"
metadata: 
  node_type: memory
  type: project
  originSessionId: e5a7400b-1a5c-4f07-afb9-125d736d1967
---

Security pass on 2026-06-25 (user is very concerned about hackers/breaches before marketing). Used the israeli-appsec-scanner skill.

**CRITICAL - FIXED: RLS was disabled on 4 tables.** `profiles`, `products`, `order_items`, `product_categories` had `relrowsecurity = false`, so their (already-correct) policies were dormant and the public anon key could read/write every row - exposing ALL user profiles (names/emails) and ALL order items, and letting anyone edit/delete any store's products. Fix: `alter table ... enable row level security` on all four (migration `20260625130000_enable_rls_exposed_tables.sql`). Verified with the anon key afterwards: products/categories still readable (storefront works), profiles/order_items now return 0 (leak closed). **Lesson: always check `relrowsecurity`, not just that policies exist - policies are dormant if RLS is off.**

**FIXED earlier same day: page_views owner policy bug** (#4) - it compared `businesses.owner_id` to `auth.uid()`, but owner_id references `profiles.id`, so owners saw zero analytics. Fixed via the profiles join + `(select auth.uid())` perf wrap (migration `20260625120000_fix_analytics_rls.sql`).

**Secret scan: CLEAN** - no service_role keys / PATs / private keys committed to the repo (only the word "service_role" in docs + a normal role check in a migration).

**Dependency vulns (npm audit): 21 (1 critical, 13 high)** - still TODO. Critical = vitest (dev only). High runtime ones to update carefully (not `audit fix --force`, can break routing): react-router / react-router-dom / @remix-run/router, form-data, ws, xlsx, lodash. Rest are build/dev tooling (vite, rollup, glob, etc.).

**Monitoring built (#3):** client error reporting -> `report-error` edge function emails moti4384 + furmand713 via Resend (throttled, prod-only). Plus React ErrorBoundary. **Uptime: built in-house** (can't create external accounts) - `uptime-check` edge function + `pg_cron` job `siango-uptime` every 5 min + `system_status` table; emails admins only on a down/recovery state change. Both live.

**HTTP security headers added** (`public/_headers`): HSTS, X-Content-Type-Options, X-Frame-Options SAMEORIGIN, Referrer-Policy, Permissions-Policy. CSP intentionally deferred (needs per-domain allow-listing; do report-only first).

**Recommended next (mostly user-enabled):** GitHub CodeQL + Dependabot + Secret Scanning (free; needs repo admin on the Elie-Tems org); Cloudflare WAF (DDoS already on by default); periodic OWASP ZAP; `/code-review` on each PR.

**Israeli Privacy Protection Law (Amendment 13, in force Aug 2025):** Siango holds Israeli residents' personal data (names, phones, addresses, orders). A *serious* security incident must be reported to the Privacy Protection Authority **immediately**, plus affected individuals; statutory damages up to **NIS 100,000** without proof of harm. Database *registration* likely NOT required (not a data broker). The RLS exposure above would have been exactly such an incident risk - now closed.

All security code changes are on branch `feature/hardening`; the DB changes (RLS) are applied live (safe bug/exposure fixes). See [[siango-architecture]], [[siango-security-todo]].
