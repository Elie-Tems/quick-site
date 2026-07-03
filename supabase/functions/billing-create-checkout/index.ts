// Start a self-managed subscription: create the FIRST hosted-page payment via
// iCount paypage/generate_sale, with the (coupon-discounted) amount injected by
// us. The hosted page tokenizes the card; billing-icount-ipn then captures the
// token and activates recurring billing.
//
// Auth: merchant JWT (verify_jwt=true). The charged amount is computed here from
// the plan base + a server-validated coupon - never trusted from the client.

import { createClient } from "npm:@supabase/supabase-js@2";
import { generateSale } from "../_shared/icount/api.ts";
import { chargeAmount, type CouponInfo } from "../_shared/billing/pricing.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const VAT_RATE = 0.18;
const APP_URL = Deno.env.get("VITE_APP_URL") || "https://siango.app";
const gross = (net: number) => Math.round(net * (1 + VAT_RATE) * 100) / 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "invalid session" }, 401);

  let body: { businessId?: string; couponCode?: string };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const businessId = body.businessId?.trim();
  if (!businessId) return json({ error: "businessId required" }, 400);

  const paypageId = Deno.env.get("ICOUNT_PUBLISH_PAYPAGE_ID");
  if (!paypageId) return json({ error: "billing not configured" }, 503);

  const admin = createClient(url, svc);

  // Ownership check: the caller must own the business they're subscribing.
  const { data: biz } = await admin
    .from("businesses").select("id, name, owner_id").eq("id", businessId).maybeSingle();
  if (!biz) return json({ error: "business not found" }, 404);
  const { data: prof } = await admin
    .from("profiles").select("user_id").eq("id", (biz as any).owner_id).maybeSingle();
  if ((prof as any)?.user_id !== user.id) return json({ error: "forbidden" }, 403);

  // Plan base price (net, pre-VAT).
  const baseNet = Number(Deno.env.get("PUBLISH_FEE_ILS") || "69") || 69;

  // Validate the coupon server-side (anti-enumeration RPC). Never trust the client.
  let coupon: CouponInfo | null = null;
  if (body.couponCode?.trim()) {
    const { data: v } = await admin.rpc("validate_subscription_coupon", { p_code: body.couponCode.trim() });
    const row = Array.isArray(v) ? v[0] : v;
    if (row?.valid) {
      coupon = { discount_type: row.discount_type, discount_value: Number(row.discount_value), duration: row.duration };
    }
  }

  // First charge = cycle 0. Coupon (if any) applies to this charge.
  const firstNet = chargeAmount(baseNet, coupon, 0);
  const firstGross = gross(firstNet);

  // Track the pending checkout. x_order_id = session_token lets the IPN match back.
  const sessionToken = crypto.randomUUID();
  const { error: sErr } = await admin.from("publish_checkout_sessions").insert({
    user_id: user.id,
    business_id: businessId,
    session_token: sessionToken,
    status: "pending",
    amount_ils: firstNet,
    provider: "icount_token",
    email: user.email ?? null,
  });
  if (sErr) return json({ error: "could not create session" }, 500);

  // Remember the billing intent on the subscription (created/updated now, activated on IPN).
  await admin.from("subscriptions").upsert({
    user_id: user.id,
    status: "pending",
    billing_provider: "icount_token",
    base_amount_ils: baseNet,
    coupon_code: coupon ? body.couponCode!.trim().toUpperCase() : null,
    coupon_duration: coupon?.duration ?? null,
    coupon_discount_type: coupon?.discount_type ?? null,
    coupon_discount_value: coupon?.discount_value ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  const label = coupon ? `פרסום אתר Siango (מבצע ${body.couponCode!.trim().toUpperCase()})` : "פרסום אתר Siango";
  const sale = await generateSale({
    paypageId,
    sumIls: firstGross,
    description: label,
    ipnUrl: `${url}/functions/v1/billing-icount-ipn?session_token=${sessionToken}`,
    successUrl: `${APP_URL}/publish-payment?businessId=${businessId}&paid=1`,
    failureUrl: `${APP_URL}/publish-payment?businessId=${businessId}&failed=1`,
    xOrderId: sessionToken,
    email: user.email ?? undefined,
    isIframe: true,
  });

  if (!sale.ok || !sale.data.sale_url) {
    return json({ error: "icount_sale_failed", detail: sale.error || sale.data }, 502);
  }

  return json({
    ok: true,
    saleUrl: sale.data.sale_url,
    sessionToken,
    firstChargeIls: firstGross,
    monthlyIls: gross(baseNet),
    discountApplied: !!coupon,
  });
});
