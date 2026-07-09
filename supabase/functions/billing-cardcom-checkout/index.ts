// Start a publish subscription via Cardcom. Creates the FIRST payment page with
// LowProfile/Create (Operation ChargeAndCreateToken): it charges the (coupon-
// discounted) first amount AND saves a card token AND issues a tax invoice - all
// in ONE real transaction, so the customer's "success" is the real charge. The
// billing-cardcom-webhook then verifies the deal, stores the token, and publishes.
//
// Auth: merchant JWT (verify_jwt=true). The amount is computed here from the plan
// base + a server-validated coupon - never trusted from the client.

import { createClient } from "npm:@supabase/supabase-js@2";
import { createLowProfile } from "../_shared/cardcom/api.ts";
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

  const admin = createClient(url, svc);

  // Ownership: the caller must own the business they're subscribing.
  const { data: biz } = await admin.from("businesses").select("id, name, owner_id").eq("id", businessId).maybeSingle();
  if (!biz) return json({ error: "business not found" }, 404);
  const { data: prof } = await admin.from("profiles").select("user_id").eq("id", (biz as { owner_id?: string }).owner_id).maybeSingle();
  if ((prof as { user_id?: string })?.user_id !== user.id) return json({ error: "forbidden" }, 403);

  // Plan base price (net, pre-VAT).
  const baseNet = Number(Deno.env.get("PUBLISH_FEE_ILS") || "69") || 69;

  // Validate the coupon server-side (never trust the client).
  let coupon: CouponInfo | null = null;
  if (body.couponCode?.trim()) {
    const { data: v } = await admin.rpc("validate_subscription_coupon", { p_code: body.couponCode.trim(), p_product: "publish" });
    const row = Array.isArray(v) ? v[0] : v;
    if (row?.valid) coupon = { discount_type: row.discount_type, discount_value: Number(row.discount_value), duration: row.duration };
  }

  // First charge = cycle 0 (coupon applies here). net -> VAT-inclusive gross.
  const firstNet = chargeAmount(baseNet, coupon, 0);
  const firstGross = gross(firstNet);

  // Track the pending checkout. ReturnValue = session_token lets the webhook match back.
  const sessionToken = crypto.randomUUID();
  const { error: sErr } = await admin.from("publish_checkout_sessions").insert({
    user_id: user.id, business_id: businessId, session_token: sessionToken,
    status: "pending", amount_ils: firstNet, provider: "cardcom", email: user.email ?? null,
  });
  if (sErr) return json({ error: "could not create session" }, 500);

  // Remember the billing intent on the subscription (activated on webhook).
  await admin.from("subscriptions").upsert({
    user_id: user.id, status: "pending", billing_provider: "cardcom_token",
    base_amount_ils: baseNet,
    coupon_code: coupon ? body.couponCode!.trim().toUpperCase() : null,
    coupon_duration: coupon?.duration ?? null,
    coupon_discount_type: coupon?.discount_type ?? null,
    coupon_discount_value: coupon?.discount_value ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  // The webhook gates on the shared secret in the URL (Cardcom can't send headers).
  const webhookSecret = Deno.env.get("CARDCOM_WEBHOOK_SECRET") ?? "";
  const webhookUrl = `${url}/functions/v1/billing-cardcom-webhook?session_token=${sessionToken}&secret=${encodeURIComponent(webhookSecret)}`;

  const label = coupon ? `פרסום אתר Siango (מבצע ${body.couponCode!.trim().toUpperCase()})` : "פרסום אתר Siango";

  const res = await createLowProfile({
    amountIls: firstGross,
    returnValue: sessionToken,
    webhookUrl,
    successUrl: `${APP_URL}/publish-payment?businessId=${businessId}&paid=1`,
    failureUrl: `${APP_URL}/publish-payment?businessId=${businessId}&failed=1`,
    productName: label,
    // Cardcom requires the Document total to EQUAL the charged Amount, and treats
    // UnitCost as VAT-INCLUSIVE (Israeli invoice) - so the line is the GROSS amount.
    // With IsVatFree=false it breaks the 18% VAT out of that gross on the invoice.
    doc: {
      docType: "TaxInvoiceAndReceipt",
      email: user.email ?? undefined,
      sendByEmail: true,
      vatFree: false,
      products: [{ description: "מנוי פרסום אתר Siango - חודשי", quantity: 1, unitCost: firstGross }],
    },
  });

  if (!res.ok || !res.data.Url) {
    return json({ error: "cardcom_create_failed", detail: res.error || res.data }, 502);
  }

  // Store the LowProfileId so the webhook can verify (GetLpResult) even if Cardcom's
  // callback body doesn't echo it back.
  await admin.from("publish_checkout_sessions")
    .update({ external_transaction_id: res.data.LowProfileId })
    .eq("session_token", sessionToken);

  return json({
    ok: true,
    saleUrl: res.data.Url,
    lowProfileId: res.data.LowProfileId,
    sessionToken,
    firstChargeIls: firstGross,
    monthlyIls: gross(baseNet),
    discountApplied: !!coupon,
  });
});
