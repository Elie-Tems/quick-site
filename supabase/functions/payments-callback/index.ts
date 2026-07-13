// Generic gateway callback (IPN). The provider is passed as ?provider= on the
// callback URL we registered when creating the page. verify_jwt = false; the
// request is authenticated by the adapter's signature check.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getProvider } from "../_shared/payments/registry.ts";
import { settlePaidOrder } from "../_shared/payments/settle.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const providerId = new URL(req.url).searchParams.get("provider");
  const provider = getProvider(providerId);
  if (!provider) return json({ error: "Unknown provider" }, 400);

  const raw = await req.text();
  let payload: any;
  try { payload = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }

  const parsed = provider.parseCallback(payload);
  if (!parsed.pageRequestUid) return json({ error: "Missing payment reference" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: order } = await admin.from("orders")
    .select("id, business_id, payment_status, customer_name, customer_email, customer_phone, total_price")
    .eq("payment_page_request_uid", parsed.pageRequestUid).maybeSingle();
  if (!order) return json({ error: "Order not found" }, 404);

  const { data: creds } = await admin.from("payment_credentials")
    .select("api_key, secret_key, page_uid, mode, config")
    .eq("business_id", order.business_id).eq("provider", provider.id).maybeSingle();
  if (!creds) return json({ error: "Cannot verify callback" }, 401);

  const valid = await provider.verifyCallbackSignature(creds, raw, req.headers, payload);
  if (!valid) {
    console.error("Callback signature invalid", { provider: provider.id, uid: parsed.pageRequestUid });
    return json({ error: "Invalid signature" }, 401);
  }

  if (order.payment_status === "paid") return json({ ok: true, alreadyPaid: true });

  const now = new Date().toISOString();
  if (parsed.approved) {
    const tolerance = 0.01;
    if (parsed.amount > 0 && Math.abs(parsed.amount - order.total_price) > tolerance) {
      console.error(`Amount mismatch: callback=${parsed.amount} order=${order.total_price} id=${order.id}`);
      await admin.from("orders").update({ payment_status: "amount_mismatch", updated_at: now }).eq("id", order.id);
      return json({ error: "Amount mismatch" }, 400);
    }
    await admin.from("payments").update({ metadata: { callback: payload }, updated_at: now }).eq("order_id", order.id);
    // Mark paid + count the coupon use + send merchant/customer emails. Shared with
    // payments-confirm (the on-return check) so a late or missing IPN never loses the
    // sale, the paid status, or the emails.
    const r = await settlePaidOrder(admin, order.id, parsed.transactionUid);
    console.log("payments-callback settle ->", JSON.stringify(r), "order", order.id);
  } else {
    // Coupon uses are counted only on success, so a failed payment needs no release.
    await admin.from("orders").update({ payment_status: "failed", updated_at: now }).eq("id", order.id);
    await admin.from("payments").update({ status: "failed", metadata: { callback: payload }, updated_at: now }).eq("order_id", order.id);
  }
  return json({ ok: true });
});
