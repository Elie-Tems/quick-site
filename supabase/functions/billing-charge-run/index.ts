// Monthly self-managed billing cron. Charges due subscriptions via iCount cc/bill
// on their stored token, for a server-computed (coupon-aware, VAT-inclusive)
// amount. Fully idempotent + capped. This is the ONLY place a charge is
// initiated - no user-facing endpoint can trigger it.
//
// Security: cron-only (optional CRON_SECRET). Per-charge hard ceiling, per-cycle
// idempotency key (unique in billing_charges), amounts computed server-side,
// every attempt audited. verify_jwt=false in config.toml.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { chargeToken, toMMYY } from "../_shared/cardcom/api.ts";
import { chargeAmount, withinChargeCeiling, type CouponInfo } from "../_shared/billing/pricing.ts";
import { nextAnniversaryChargeMs } from "../_shared/billing/schedule.ts";

const RETRY_DAYS = 2;        // reschedule a failed charge this many days out
const MAX_FAILURES = 3;      // consecutive failures before marking past_due
const ADMIN_EMAILS = ["moti4384@gmail.com", "furmand713@gmail.com"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  // Run only around 01:30 ISRAEL time, all year. The cron fires at BOTH 22:30 and
  // 23:30 UTC; whichever one is ~01:xx in Israel (summer vs winter, DST-aware) does
  // the work, the other exits early. A manual call bypasses with { "force": true }.
  let reqBody: Record<string, unknown> = {};
  try { reqBody = await req.json(); } catch { /* empty/no body */ }
  const ilHour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Jerusalem", hour: "2-digit", hour12: false }).format(new Date()));
  if (reqBody?.force !== true && ilHour !== 1) {
    return new Response(JSON.stringify({ ok: true, skipped: "off-hours (Israel)", ilHour }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const isTest = Deno.env.get("BILLING_TEST_MODE") === "true";
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  // Due, active, token-billed subscriptions that aren't cancelled.
  const { data: subs, error } = await admin
    .from("subscriptions")
    .select("id, user_id, business_id, status, cc_token_id, base_amount_ils, coupon_duration, coupon_discount_type, coupon_discount_value, billing_cycle_count, next_charge_at, cancel_type, free_months_credit, billing_anchor_day")
    .eq("billing_provider", "cardcom_token")
    .in("status", ["active", "past_due"]) // past_due = suspended; keep retrying so a payment reactivates it
    .not("cc_token_id", "is", null)
    .lte("next_charge_at", nowIso)
    .limit(200);

  if (error) { console.error("charge-run query:", error); return new Response(JSON.stringify({ error: "query" }), { status: 500 }); }

  let charged = 0, failed = 0, skipped = 0, freeMonths = 0;
  let chargedGross = 0, declinedGross = 0; // ₪ totals (VAT-inclusive) for the report

  for (const s of subs ?? []) {
    const base = Number(s.base_amount_ils);
    if (!base || !s.cc_token_id) { skipped++; continue; }

    const cycle = Number(s.billing_cycle_count ?? 1); // 0 was the first (IPN) charge

    // Referral free month: consume a credit instead of charging. Records a ₪0
    // "charge" (reusing the cycle idempotency key) and extends the period.
    if (Number(s.free_months_credit ?? 0) > 0) {
      const { error: fErr } = await admin.from("billing_charges").insert({
        user_id: s.user_id, subscription_id: s.id, amount_ils: 0, status: "success",
        is_test: isTest, idempotency_key: `${s.id}:cycle${cycle}`,
        payment_description: "חודש חינם (הפניית חבר)",
      });
      if (fErr) { skipped++; continue; } // cycle already handled
      const freeNextMs = nextAnniversaryChargeMs(nowMs, Number(s.billing_anchor_day) || new Date(nowMs).getUTCDate());
      await admin.from("subscriptions").update({
        free_months_credit: Number(s.free_months_credit) - 1,
        paid_until: new Date(freeNextMs + 2 * 864e5).toISOString(),
        next_charge_at: new Date(freeNextMs).toISOString(),
        billing_cycle_count: cycle + 1,
        last_charge_status: "free_month",
        updated_at: nowIso,
      }).eq("id", s.id);
      freeMonths++; continue;
    }
    const coupon: CouponInfo | null = s.coupon_discount_type
      ? { discount_type: s.coupon_discount_type, discount_value: Number(s.coupon_discount_value), duration: (s.coupon_duration || "forever") }
      : null;

    // base_amount_ils is already the flat, VAT-inclusive total - no VAT added on top.
    const charge = chargeAmount(base, coupon, cycle);
    if (!withinChargeCeiling(charge, base)) {  // safety: never exceed base (+tolerance)
      console.error(`charge-run: amount ${charge} over ceiling for sub ${s.id} - skipped`);
      skipped++; continue;
    }
    const baseAmount = charge;
    const idem = `${s.id}:cycle${cycle}`;

    // Idempotency: if this cycle was already charged, skip (unique key backs this up).
    const { data: existing } = await admin.from("billing_charges").select("id, status").eq("idempotency_key", idem).maybeSingle();
    if (existing && (existing as any).status === "success") { skipped++; continue; }

    // Consolidated invoice: base subscription + any active recurring add-ons, each as
    // its OWN line, in ONE Document. Defensive: if the add-ons table is missing/empty
    // the charge is base-only (identical to before). price_ils is the gross per line.
    const invLines: { description: string; quantity: number; unitCost: number }[] =
      [{ description: "מנוי פרסום אתר Siango - חיוב חודשי", quantity: 1, unitCost: baseAmount }];
    let addonsTotal = 0;
    try {
      const { data: addons } = await admin.from("subscription_addons")
        .select("description, price_ils").eq("business_id", s.business_id).eq("active", true);
      for (const a of (addons ?? [])) {
        const p = Math.round(Number((a as any).price_ils) * 100) / 100;
        if (p > 0) { invLines.push({ description: `${(a as any).description} - חיוב חודשי`, quantity: 1, unitCost: p }); addonsTotal += p; }
      }
    } catch (_e) { /* add-ons not enabled yet - base only */ }
    const amount = Math.round((baseAmount + addonsTotal) * 100) / 100;

    // Reserve the charge row first (unique idempotency_key blocks a concurrent double).
    const { error: insErr } = await admin.from("billing_charges").insert({
      user_id: s.user_id, subscription_id: s.id, amount_ils: amount, status: "pending",
      is_test: isTest, idempotency_key: idem, payment_description: addonsTotal > 0 ? "מנוי פרסום Siango + תוספות" : "מנוי פרסום Siango",
    });
    if (insErr) { skipped++; continue; } // another runner grabbed it

    // Look up the payer email + the stored card expiry (Cardcom needs MMYY to charge a token).
    const { data: u } = await admin.auth.admin.getUserById(s.user_id);
    const email = u?.user?.email;
    const { data: tok } = await admin.from("billing_tokens")
      .select("cc_exp_month, cc_exp_year").eq("user_id", s.user_id).eq("cc_token_id", s.cc_token_id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    const expMonth = (tok as any)?.cc_exp_month;
    const expYear = (tok as any)?.cc_exp_year;
    if (!expMonth || !expYear) {
      await admin.from("billing_charges").update({ status: "failed", error_code: "no_card_expiry" }).eq("idempotency_key", idem);
      console.error("charge-run: missing card expiry for sub", s.id);
      failed++; continue;
    }

    // Charge the stored Cardcom token for the total (base + add-ons), issuing ONE
    // multi-line tax invoice/receipt. Cardcom requires the Document total to EQUAL the
    // charged Amount and treats UnitCost as VAT-INCLUSIVE, so each line is GROSS.
    // Idempotent via ExternalUniqTranId (= our per-cycle idem key). Success = RC 0.
    const res = await chargeToken({
      token: s.cc_token_id as string,
      expMMYY: toMMYY(expMonth, expYear),
      amountIls: amount,
      externalUniqId: idem,
      doc: {
        docType: "TaxInvoiceAndReceipt", email: email ?? undefined, sendByEmail: true, vatFree: false,
        products: invLines,
      },
    });

    if (res.ok) {
      const invoiceUrl = (res.data as any)?.DocumentUrl ?? (res.data as any)?.DocumentInfo?.DocumentUrl ?? null;
      const tranzId = (res.data as any)?.TranzactionId;   // needed to refund this charge later
      await admin.from("billing_charges").update({ status: "success", confirmation_code: res.data.ApprovalNumber ?? null, provider_transaction_id: tranzId != null ? String(tranzId) : null, invoice_url: invoiceUrl }).eq("idempotency_key", idem);
      // Anniversary billing: next charge is the same day-of-month the merchant joined
      // (billing_anchor_day). Falls back to today's day for legacy rows without an anchor.
      const anchorDay = Number(s.billing_anchor_day) || new Date(nowMs).getUTCDate();
      const nextMs = nextAnniversaryChargeMs(nowMs, anchorDay);
      await admin.from("subscriptions").update({
        paid_until: new Date(nextMs + 2 * 864e5).toISOString(), // small grace past the next charge
        next_charge_at: new Date(nextMs).toISOString(),
        billing_cycle_count: cycle + 1,
        last_charge_status: "success",
        status: "active", // reactivate a subscription that had gone past_due
        updated_at: nowIso,
      }).eq("id", s.id);
      // If THIS site had been suspended for non-payment, bring it back online now.
      if ((s as any).status === "past_due" && s.business_id) {
        await admin.from("businesses").update({ is_published: true, updated_at: nowIso }).eq("id", s.business_id);
      }
      charged++; chargedGross += amount;
    } else {
      const errCode = res.error || (res.data as any)?.Description || "declined";
      await admin.from("billing_charges").update({ status: "failed", error_code: String(errCode) }).eq("idempotency_key", idem);
      // Dunning aligned to the Terms (סעיף 1.4). Measure the CURRENT failure streak
      // from the first failed charge since the last success. Days 0-9: site stays
      // live, retry every RETRY_DAYS. Day 10+: SUSPEND (unpublish) the store but keep
      // retrying so a payment reactivates it. Day 45+: flag for deletion
      // (pending_deletion) - we NEVER auto-delete a customer's data; the admin decides.
      const { data: lastOk } = await admin.from("billing_charges")
        .select("created_at").eq("subscription_id", s.id).eq("status", "success")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      const sinceIso = (lastOk as any)?.created_at ?? new Date(0).toISOString();
      const { data: firstFail } = await admin.from("billing_charges")
        .select("created_at").eq("subscription_id", s.id).eq("status", "failed")
        .gt("created_at", sinceIso).order("created_at", { ascending: true }).limit(1).maybeSingle();
      const firstFailMs = new Date((firstFail as any)?.created_at ?? nowMs).getTime();
      const daysFailing = Math.floor((nowMs - firstFailMs) / 864e5);

      let newStatus = "active";
      let nextRetry: string | null = new Date(nowMs + RETRY_DAYS * 864e5).toISOString();
      if (daysFailing >= 45) {
        newStatus = "pending_deletion"; nextRetry = null; // stop; admin reviews before any deletion
      } else if (daysFailing >= 10) {
        newStatus = "past_due"; // suspended (unpublished); keep retrying to allow reactivation
        if (s.business_id) await admin.from("businesses").update({ is_published: false, updated_at: nowIso }).eq("id", s.business_id).eq("is_published", true);
      }
      await admin.from("subscriptions").update({
        next_charge_at: nextRetry,
        status: newStatus,
        last_charge_status: "failed",
        updated_at: nowIso,
      }).eq("id", s.id);
      // Reuse the publish-payment recovery email as a payment-failed nudge (best effort).
      if (email) {
        fetch(`${url}/functions/v1/send-platform-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
          body: JSON.stringify({ type: "paymentFailed", to: email, ctx: {} }),
        }).catch(() => {});
      }
      failed++; declinedGross += amount;
    }
  }

  // Daily report to the admins (Moti + Daniel): how much was charged (incl VAT) and
  // how many declines. Only when something actually ran, to avoid empty-day noise.
  if ((charged + failed + freeMonths) > 0) {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const dt = new Date(nowMs).toLocaleString("he-IL", { timeZone: "Asia/Jerusalem" });
      const money = (n: number) => `₪${(Math.round(n * 100) / 100).toLocaleString("he-IL")}`;
      const html = `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
        <h2 style="color:#16a34a">דוח חיוב יומי · Siango</h2>
        <p style="color:#555">${dt}${isTest ? " · (מצב טסט)" : ""}</p>
        <table style="width:100%;border-collapse:collapse;font-size:15px">
          <tr><td style="padding:8px;border-bottom:1px solid #eee">✅ חיובים שהצליחו</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:left"><b>${charged}</b></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee">💰 סה"כ חויב (כולל מע"מ)</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:left"><b>${money(chargedGross)}</b></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee">❌ סירובים</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:left"><b>${failed}</b> (${money(declinedGross)})</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee">🎁 חודשים חינם (הפניות)</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:left"><b>${freeMonths}</b></td></tr>
        </table>
        <p style="color:#999;font-size:12px;margin-top:16px">דוח אוטומטי ממנוע החיוב של Siango.</p>
      </div>`;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: "Siango Billing <billing@send.siango.app>", to: ADMIN_EMAILS, subject: `דוח חיוב יומי · ${money(chargedGross)} · ${dt}`, html }),
      }).catch((e) => console.warn("charge-run report email failed:", e));
    }
  }

  console.log(`billing-charge-run: charged ${charged}, freeMonths ${freeMonths}, failed ${failed}, skipped ${skipped}, test=${isTest}`);
  return new Response(JSON.stringify({ ok: true, charged, freeMonths, failed, skipped, isTest }), { status: 200, headers: { "Content-Type": "application/json" } });
});
