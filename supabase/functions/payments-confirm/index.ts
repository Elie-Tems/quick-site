// On-return payment confirmation. The storefront calls this when the customer comes
// back from the gateway (?payment=success&order=…). We NEVER trust the URL param - we
// re-query the gateway server-side (provider.verifyCallbackSignature) and only if it
// reports the sale paid do we settle the order + send emails. This is the reliable path
// when the gateway's IPN is late or never fires (which left orders stuck "pending").
// Public storefront call -> verify_jwt = false.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getProvider } from "../_shared/payments/registry.ts";
import { settlePaidOrder } from "../_shared/payments/settle.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  let body: { order_id?: string };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const orderId = body.order_id;
  if (!orderId) return json({ error: "order_id required" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: order } = await admin.from("orders")
    .select("id, business_id, payment_status, payment_page_request_uid")
    .eq("id", orderId).maybeSingle();
  if (!order) return json({ error: "order not found" }, 404);
  if (order.payment_status === "paid") return json({ ok: true, paid: true, alreadyPaid: true });
  if (!order.payment_page_request_uid) return json({ ok: true, paid: false });

  const { data: biz } = await admin.from("businesses").select("payment_provider").eq("id", order.business_id).maybeSingle();
  const provider = getProvider((biz as { payment_provider?: string } | null)?.payment_provider);
  if (!provider) return json({ ok: true, paid: false });

  const { data: creds } = await admin.from("payment_credentials")
    .select("api_key, secret_key, page_uid, mode, config")
    .eq("business_id", order.business_id).eq("provider", provider.id).maybeSingle();
  if (!creds) return json({ ok: true, paid: false });

  // Re-query the gateway with our order ref (the same authoritative check the IPN uses).
  const ref = order.payment_page_request_uid;
  const payload = { x_order_id: ref, custom_client_id: ref, order_id: ref };
  let paid = false;
  try { paid = await provider.verifyCallbackSignature(creds, "", new Headers(), payload); }
  catch (e) { console.warn("payments-confirm: verify error", e); }
  console.log("payments-confirm: order", orderId, "provider", provider.id, "paid", paid);

  if (!paid) return json({ ok: true, paid: false });
  const r = await settlePaidOrder(admin, order.id, null);
  return json({ ok: true, paid: true, settled: r.settled || !!r.alreadyPaid });
});
