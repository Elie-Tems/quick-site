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

const VAT_RATE = 0.18;
const RETRY_DAYS = 2;        // reschedule a failed charge this many days out
const MAX_FAILURES = 3;      // consecutive failures before marking past_due
const gross = (net: number) => Math.round(net * (1 + VAT_RATE) * 100) / 100;
const ADMIN_EMAILS = ["moti4384@gmail.com", "furmand713@gmail.com"];

// Next CALENDAR-month charge date, anchored to `anchorDay` (the day-of-month of the
// first charge). If the next month is too short (e.g. anchor 30, next month = Feb),
// clamp to that month's LAST day; the month after snaps back to the anchor. Keeps the
// time-of-day at midnight so the daily 01:30 cron always catches it on the target day.
function nextMonthlyChargeMs(anchorDay: number, fromMs: number): number {
  const d = new Date(fromMs);
  let y = d.getUTCFullYear();
  let m = d.getUTCMonth() + 1; // advance one month
  if (m > 11) { m = 0; y++; }
  const daysInTarget = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const day = Math.min(Math.max(1, anchorDay || 1), daysInTarget);
  return Date.UTC(y, m, day, 0, 0, 0);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const isTest = Deno.env.get("BILLING_TEST_MODE") === "true";
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  // Due, active, token-billed subscriptions that aren't cancelled.
  const { data: subs, error } = await admin
    .from("subscriptions")
    .select("id, user_id, status, cc_token_id, base_amount_ils, coupon_duration, coupon_discount_type, coupon_discount_value, billing_cycle_count, next_charge_at, cancel_type, free_months_credit, billing_anchor_day")
    .eq("billing_provider", "cardcom_token")
    .eq("status", "active")
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
      await admin.from("subscriptions").update({
        free_months_credit: Number(s.free_months_credit) - 1,
        paid_until: new Date(nowMs + 31 * 864e5).toISOString(),
        next_charge_at: new Date(nowMs + 30 * 864e5).toISOString(),
        billing_cycle_count: cycle + 1,
        last_charge_status: "free_month",
        updated_at: nowIso,
      }).eq("id", s.id);
      freeMonths++; continue;
    }
    const coupon: CouponInfo | null = s.coupon_discount_type
      ? { discount_type: s.coupon_discount_type, discount_value: Number(s.coupon_discount_value), duration: (s.coupon_duration || "forever") }
      : null;

    const net = chargeAmount(base, coupon, cycle);
    if (!withinChargeCeiling(net, base)) {  // safety: never exceed base (+tolerance)
      console.error(`charge-run: amount ${net} over ceiling for sub ${s.id} - skipped`);
      skipped++; continue;
    }
    const baseAmount = gross(net);
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
        .select("description, price_ils").eq("user_id", s.user_id).eq("active", true);
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
      await admin.from("billing_charges").update({ status: "success", confirmation_code: res.data.ApprovalNumber ?? null, invoice_url: invoiceUrl }).eq("idempotency_key", idem);
      // Next charge = same day-of-month next month (clamped for short months); the
      // anchor is the first-charge day, stored so a Feb clamp never loses the 30th.
      const anchorDay = Number((s as any).billing_anchor_day) || new Date((s as any).next_charge_at || nowMs).getUTCDate();
      const nextMs = nextMonthlyChargeMs(anchorDay, nowMs);
      await admin.from("subscriptions").update({
        paid_until: new Date(nextMs + 2 * 864e5).toISOString(), // small grace past the next charge
        next_charge_at: new Date(nextMs).toISOString(),
        billing_cycle_count: cycle + 1,
        last_charge_status: "success",
        updated_at: nowIso,
      }).eq("id", s.id);
      charged++; chargedGross += amount;
    } else {
      const errCode = res.error || (res.data as any)?.Description || "declined";
      await admin.from("billing_charges").update({ status: "failed", error_code: String(errCode) }).eq("idempotency_key", idem);
      // Dunning: retry in RETRY_DAYS; after MAX_FAILURES consecutive fails, past_due.
      const { count } = await admin.from("billing_charges")
        .select("id", { count: "exact", head: true })
        .eq("subscription_id", s.id).eq("status", "failed")
        .gte("created_at", new Date(nowMs - 20 * 864e5).toISOString());
      const tooMany = (count ?? 0) >= MAX_FAILURES;
      await admin.from("subscriptions").update({
        next_charge_at: tooMany ? null : new Date(nowMs + RETRY_DAYS * 864e5).toISOString(),
        status: tooMany ? "past_due" : "active",
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
