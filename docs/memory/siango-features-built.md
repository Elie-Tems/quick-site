---
name: siango-features-built
description: Inventory of features/components built this session with their file paths
metadata: 
  node_type: memory
  type: project
  originSessionId: e5a7400b-1a5c-4f07-afb9-125d736d1967
---

Everything built/changed during the long session (file -> what it does). Verify a file still exists before relying on it.

**Merchant dashboard analytics:**
- `src/components/dashboard/DashboardInsights.tsx` - conversion funnel (visits from page_views; add_to_cart/begin_checkout/purchase distinct visitors from analytics_events) + plain-language recommendations (cart abandonment %, low add-to-cart, good conversion, payment-not-connected) + 7/30/90 day filter. Merchant-facing (own store only).
- `src/components/dashboard/DashboardTrafficSources.tsx` - categorizes referrer + utm_source (גוגל/וואטסאפ/ישיר/קרדיט/מייל/etc) with date filter + breakdown bars.
- `src/components/dashboard/DashboardUsage.tsx` - AI credit balance, generations count, low-credit alert, bot "included".
- `src/components/dashboard/SubscriptionAlert.tsx` - in-dashboard dunning: warning before freeze, "suspended" state, delete countdown (FREEZE_DAYS / DELETE_DAYS).
- Wiring: `DashboardNav.tsx` DashboardView type + nav items for `usage` (group הגדרות), `traffic` + `insights` (group שיווק ותצוגה); desktop groups are collapsible (only the active group open by default). `Dashboard.tsx` imports + cases for usage/traffic/insights.

**Event tracking:**
- `src/hooks/useAnalytics.ts` - added `trackEvent(businessId, eventType, opts)` (visitor_id from localStorage) + utm_source capture in trackPageView. Legacy useAnalytics query left disabled.
- `src/pages/StoreFront.tsx` - imports trackPageView/trackEvent + supabase; fires add_to_cart (handleAddToCart), begin_checkout (handleCheckout), purchase (after orders-only success); after purchase, invokes `send-platform-email` type `orderConfirmationCustomer` (to customer, FROM the merchant, reply-to merchant). Also a SITE_SUSPENDED "האתר אינו זמין" page.

**Payments / approval:**
- `src/components/payments/PaymentApprovalKit.tsx` - readiness checklist + copy-site-link for credit-card-company approval. In DashboardPayments.
- `src/components/onboarding/StepPayments.tsx` - rewritten: PayPlus primary + coming-soon (removed fake iCredit/Cardcom/PayPal).

**Super-admin:**
- `src/components/admin/AdminSubscriptionCoupons.tsx` - create/manage subscription coupons (first-month or recurring).
- `src/components/admin/AdminBusinessesList.tsx` - suspend/restore toggle + permanent delete + "מושהה" badge.
- `src/components/admin/AdminDashboardContent.tsx` - 'coupons' view + nav + case.
- `src/components/admin/AdminStatsCards.tsx` - relabel to "הכנסה חודשית (מנויים)".
- `src/hooks/useAdmin.ts` - bulk counts + .limit(300); MRR/revenue = Siango paid subscriptions only.
- `src/hooks/useStorefront.ts` - throws SITE_SUSPENDED when is_suspended.

**Onboarding:**
- `StepCategory.tsx` (search + autocomplete + browse-all), `BusinessHoursPicker.tsx` (24/7 toggle vs custom), `StepBrandStyle.tsx` (no secondary cubes, auto-scroll after file detect, Back via onBack), `OnboardingComplete.tsx` (ReferralBox at publish), `StepPublish.tsx` ("edit everything after live" reassurance).

**Email system:**
- `src/lib/email/platformEmails.ts` + `supabase/functions/_shared/email/platformEmails.ts` - siangoSender businessName "Siango"; siteReady has referral CTA; `orderConfirmationCustomer(merchant, args)` template; welcome rewritten then its trigger removed.
- `supabase/functions/send-platform-email/index.ts` - special-cases type `orderConfirmationCustomer` (builds merchant sender, fromName=storeName, replyTo=merchant email); otherwise uses PLATFORM_EMAILS[type].
- `supabase/functions/_shared/email/resend.ts` - fromName default "Siango".
- `src/pages/AuthCallback.tsx` - removed redundant welcome email send.

**Marketing / home / SEO:**
- `src/pages/Index.tsx` - safety-net redirect (incomplete onboarding -> /onboarding) + extra CtaBand conversion CTAs.
- `src/components/SEOContentSection.tsx` - 3 SEO blocks humanized (AI phrasing removed, keywords kept).
- `src/components/storefront/StoreFooter.tsx` + `storefront-v2/StoreFooterV2.tsx` - "נבנה ע"י Siango" credit + utm_source=store_credit.
- `public/google41d23f5e6d05c945.html` - Search Console verification.

**Preview routes** (for Daniel's review, remove before public launch): `/preview/payments`, `/preview/emails`, `/preview/publish` (PublishCheckoutPreview.tsx - green-dominant payment screen v3).

See [[siango-architecture]], [[siango-product-decisions]], [[siango-roadmap]].
