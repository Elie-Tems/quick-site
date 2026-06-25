---
name: siango-payment-partners
description: "Payment providers + partner/affiliate model - per-merchant sliqa (PayPlus/HYP/Cardcom), iCount affiliate, referral tracking"
metadata: 
  node_type: memory
  type: project
  originSessionId: e5a7400b-1a5c-4f07-afb9-125d736d1967
---

**KEY MODEL (confirmed by the user, do not question again): there is NO aggregator / sub-merchant model. Every payment provider is per-merchant.** Each store owner opens their OWN account with the provider and enters their own terminal/API credentials into the Siango dashboard, exactly like PayPlus works today. Do NOT ask providers about a marketplace/aggregator model - it is settled. The user was annoyed at the repeated question; stop raising it.

**Merchant store sliqa (collecting shoppers' payments into the merchant's own account):**
- **PayPlus** - already integrated (per-merchant credentials in dashboard).
- **HYP** (היפ, formerly Yaad/Sarig) - partnership closed. Dev docs https://developers.hyp.co.il/pay (hosted page, server-to-server, tokenization, recurring, refunds, Apple/Google Pay, bit).
- **Cardcom** - partnership closed, signed agreement received. **API docs + test user received 2026-06-25 (#7 unblocked for Cardcom):**
  - New JSON API (Iframe/Redirect, get transaction details): https://cardcomapi.zendesk.com/hc/he (article "שלב 1-2 יצירת דף לתשלום ... Iframe/Redirect").
  - Older Name-to-Value API: https://cardcomapinametovalue.zendesk.com/hc/he
  - API category: https://support.cardcom.solutions/hc/he/categories/360000170614
  - Sandbox login https://secure.cardcom.solutions/LogInNew.aspx - user `Cardcomtest26` / pass `TerminalTest26` (shared Cardcom test creds, low sensitivity). Dev support: 03-9436100.
  - Build approach: like PayPlus (per-merchant), Iframe/Redirect hosted page; webhook to confirm + identify transaction.
- BUILT (#7, 2026-06-25): dashboard payment screen now shows Cardcom / HYP / iCount as partner cards with "open account" buttons; each click logs to `partner_referrals` (table, RLS owner-insert/admin-read). Admin "רווחי שותפים" panel (AdminPartnerEarnings) counts referrals + connected per provider + shows terms/cycle + HYP estimate. Affiliate URLs are config in `src/lib/partnerLinks.ts` - iCount live (r?aff=862330); **Cardcom + HYP URLs still PENDING** (fill `url` when received). PayPlus remains the in-app checkout (the deep per-provider checkout integration for Cardcom/HYP is a separate later effort - Cardcom onboards merchants directly per their agreement).

**What to request from each new provider (HYP, Cardcom) - only 3 things:** (1) test/sandbox access + test cards; (2) API docs (hosted page/iframe, S2S, tokenization, refunds, webhook + which fields identify the transaction); (3) a referral-tracking identifier we can embed in signup links + a partner dashboard/report. Do NOT ask about multi-merchant.

**Affiliate / referral income (Siango earns by referring merchants) - ACTUAL TERMS (from the signed agreements, 2026-06-25):**
- **HYP** (הסכם הפצה): **50% of the merchant's one-time setup fee, minimum ₪100** (setup min ₪200). ONE-TIME per merchant (not recurring). "Qualifying customer" = a NEW HYP customer, still active after **3 months** and who paid HYP. Payout: **quarterly**, against invoice, terms **net+60**; yearly invoices accepted until April 1 of the next year.
- **Cardcom**: **20% of (merchant's sliqa rate − 0.65%) × the merchant's monthly transaction volume**. RECURRING monthly for the life of the customer. Example: merchant at 1.2% on ₪50k/mo → (1.2%−0.65%)=0.55% → ×50k=₪275 → ×20% = **₪55/mo** from that merchant. Per-merchant rates set with a Cardcom rep. Payout: monthly reconciliation on the **25th**, against invoice, **min ₪500 accumulated** before payout.
- **iCount**: **15% of what iCount receives** from the referred merchant. Affiliate code 862330; exact amount only from iCount's affiliate dashboard.
- **PayPlus**: **₪150 FLAT total for the entire partnership (NOT per merchant!)** - even 2,000 referrals = ₪150 total. Essentially negligible; treat PayPlus as net service to the merchant, not a revenue partner. (Corrected 2026-06-25 - earlier wrongly modeled as ₪150/merchant.)

**Strategy (user, 2026-06-25): highlight the partners that pay US best; the rest is net service to the merchant.** Correct ranking by value to us: 1) **Cardcom** - recurring % per merchant for life (biggest long-term); 2) **HYP** - ₪100 PER merchant, scales hugely with volume (1,000 merchants = ₪100k) - the user considers this top; 3) iCount 15% recurring per merchant; 4) **PayPlus - flat ₪150 total, does NOT scale = ignore as a revenue source.** Cardcom + HYP are highlighted ("💰 הכי משתלם" / "מומלץ") in both the merchant selector and the admin earnings panel; PayPlus is de-emphasized with a note. The admin panel must NOT multiply PayPlus by merchant count (perMerchant=null for PayPlus).

**Measurability (what Siango can compute itself vs needs the provider's report):**
- HYP: estimable = (referred merchants active 3+ months) × ₪100 floor (we don't know each merchant's actual setup fee).
- Cardcom + iCount + PayPlus: NOT computable by us (we don't see the merchants' transaction volume / their bill). We track referral COUNTS on our side; exact $ comes from each provider's dashboard/reconciliation.

**Affiliate / referral income (older notes):**
- **HYP:** ~100 ₪ per merchant who joins. Rachel (HYP) is preparing a partner link + dashboard. Need a unique partner id to embed + a per-merchant sub-id.
- **iCount:** built-in affiliate program. Our link `www.icount.co.il/r?aff=862330`, code `862330`, with a built-in dashboard (clicks / paying / pending). The screenshot was under Daniel Furman's iCount login - confirm whose account gets the commission. There is also a "discount to the referred customer" percentage option.
- **Cardcom:** signed agreement (commercial terms set); still need the technical referral-tracking id.
- TO BUILD: embed our tracking id on every "open an account with provider X" link, AND log each referral on our side (who we sent + when) to reconcile against each provider's dashboard. The strongest "actually joined" signal = the merchant connecting that provider's credentials in our dashboard.

**Business legal entity (for contracts/forms):** ארפור טכנולוגיות בע"מ, ח.פ. 517331708, הרצל 93 בני ברק, office email office@siango.app. Owner: מרדכי (מוטי) ארגמן.

**iCount is also Siango's OWN subscription billing** (separate from merchant sliqa above) - see [[siango-roadmap]] for the recurring (הו"ק) build (CID quicksite, hk/* API, webhook with custom_client_id, credit simulator for testing).

See [[siango-product-decisions]], [[siango-architecture]], [[siango-roadmap]].
