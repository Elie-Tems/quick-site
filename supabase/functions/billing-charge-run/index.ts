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
import { billToken } from "../_shared/icount/api.ts";
import { chargeAmount, withinChargeCeiling, type CouponInfo } from "../_shared/billing/pricing.ts";

const VAT_RATE = 0.18;
const RETRY_DAYS = 2;        // reschedule a failed charge this many days out
const MAX_FAILURES = 3;      // consecutive failures before marking past_due
const gross = (net: number) => Math.round(net * (1 + VAT_RATE) * 100) / 100;

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
    .select("id, user_id, status, cc_token_id, base_amount_ils, coupon_duration, coupon_discount_type, coupon_discount_value, billing_cycle_count, next_charge_at, cancel_type")
    .eq("billing_provider", "icount_token")
    .eq("status", "active")
    .not("cc_token_id", "is", null)
    .lte("next_charge_at", nowIso)
    .limit(200);

  if (error) { console.error("charge-run query:", error); return new Response(JSON.stringify({ error: "query" }), { status: 500 }); }

  let charged = 0, failed = 0, skipped = 0;

  for (const s of subs ?? []) {
    const base = Number(s.base_amount_ils);
    if (!base || !s.cc_token_id) { skipped++; continue; }

    const cycle = Number(s.billing_cycle_count ?? 1); // 0 was the first (IPN) charge
    const coupon: CouponInfo | null = s.coupon_discount_type
      ? { discount_type: s.coupon_discount_type, discount_value: Number(s.coupon_discount_value), duration: (s.coupon_duration || "forever") }
      : null;

    const net = chargeAmount(base, coupon, cycle);
    if (!withinChargeCeiling(net, base)) {  // safety: never exceed base (+tolerance)
      console.error(`charge-run: amount ${net} over ceiling for sub ${s.id} - skipped`);
      skipped++; continue;
    }
    const amount = gross(net);
    const idem = `${s.id}:cycle${cycle}`;

    // Idempotency: if this cycle was already charged, skip (unique key backs this up).
    const { data: existing } = await admin.from("billing_charges").select("id, status").eq("idempotency_key", idem).maybeSingle();
    if (existing && (existing as any).status === "success") { skipped++; continue; }

    // Reserve the charge row first (unique idempotency_key blocks a concurrent double).
    const { error: insErr } = await admin.from("billing_charges").insert({
      user_id: s.user_id, subscription_id: s.id, amount_ils: amount, status: "pending",
      is_test: isTest, idempotency_key: idem, payment_description: "מנוי פרסום Siango",
    });
    if (insErr) { skipped++; continue; } // another runner grabbed it

    // Look up the payer email for the invoice/receipt.
    const { data: u } = await admin.auth.admin.getUserById(s.user_id);
    const email = u?.user?.email;

    const res = await billToken({
      ccTokenId: s.cc_token_id, sumIls: amount, description: "מנוי פרסום Siango",
      email: email ?? undefined, isTest,
    });

    if (res.ok && res.data.success !== false) {
      await admin.from("billing_charges").update({ status: "success", confirmation_code: res.data.confirmation_code ?? null }).eq("idempotency_key", idem);
      await admin.from("subscriptions").update({
        paid_until: new Date(nowMs + 31 * 864e5).toISOString(),
        next_charge_at: new Date(nowMs + 30 * 864e5).toISOString(),
        billing_cycle_count: cycle + 1,
        last_charge_status: "success",
        updated_at: nowIso,
      }).eq("id", s.id);
      charged++;
    } else {
      const errCode = (res.data as any)?.error || res.error || "declined";
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
      failed++;
    }
  }

  console.log(`billing-charge-run: charged ${charged}, failed ${failed}, skipped ${skipped}, test=${isTest}`);
  return new Response(JSON.stringify({ ok: true, charged, failed, skipped, isTest }), { status: 200, headers: { "Content-Type": "application/json" } });
});
