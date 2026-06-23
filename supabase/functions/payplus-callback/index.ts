// PayPlus server-to-server callback (IPN). PayPlus calls this URL after a
// payment attempt. verify_jwt = false (no Supabase user). We authenticate the
// request by recomputing the HMAC signature with the merchant's secret key.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function hmacBase64(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const raw = await req.text();
  let payload: any;
  try { payload = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }

  // page_request_uid links the callback back to the order we created.
  const pageRequestUid =
    payload?.transaction?.payment_page_request_uid ||
    payload?.transaction?.page_request_uid ||
    payload?.page_request_uid ||
    payload?.data?.page_request_uid;
  if (!pageRequestUid) return json({ error: "Missing page_request_uid" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: order } = await admin
    .from("orders")
    .select("id, business_id, total_price, payment_status, customer_name, customer_email, customer_phone")
    .eq("payment_page_request_uid", pageRequestUid)
    .maybeSingle();
  if (!order) return json({ error: "Order not found" }, 404);

  // ── Verify the signature with the merchant's secret key ──
  const { data: creds } = await admin
    .from("payment_credentials")
    .select("secret_key")
    .eq("business_id", order.business_id)
    .eq("provider", "payplus")
    .maybeSingle();

  // Validate per PayPlus docs (Validate Requests Received from PayPlus):
  //   1. header `user-agent` must equal "PayPlus"
  //   2. HMAC-SHA256(secret_key, JSON body) digest base64 must equal header `hash`
  // We match against the raw body (which equals PayPlus's own JSON.stringify
  // output, so this is exact) and also against a re-stringify as a fallback to
  // survive any cross-runtime stringification differences.
  if (!creds?.secret_key) {
    console.error("No PayPlus secret on file for business", { pageRequestUid });
    return json({ error: "Cannot verify callback" }, 401);
  }
  const userAgent = req.headers.get("user-agent") || "";
  const sentHash = req.headers.get("hash") || "";
  const expectedRaw = await hmacBase64(creds.secret_key, raw);
  const expectedStringify = await hmacBase64(creds.secret_key, JSON.stringify(payload));
  const hashOk = sentHash === expectedRaw || sentHash === expectedStringify;
  if (userAgent !== "PayPlus" || !hashOk) {
    console.error("PayPlus callback failed validation", { pageRequestUid, userAgent, hashPresent: !!sentHash });
    return json({ error: "Invalid signature" }, 401);
  }

  // Idempotency — ignore repeats once already paid.
  if (order.payment_status === "paid") return json({ ok: true, alreadyPaid: true });

  const statusCode = String(
    payload?.transaction?.status_code ?? payload?.status_code ?? payload?.data?.status_code ?? "",
  );
  const approved = statusCode === "000" || payload?.transaction?.status === "approved";
  const txUid =
    payload?.transaction?.uid || payload?.transaction?.transaction_uid || payload?.data?.transaction_uid || null;
  const now = new Date().toISOString();

  if (approved) {
    await admin.from("orders").update({
      payment_status: "paid",
      paid_at: now,
      payment_transaction_uid: txUid,
      updated_at: now,
    }).eq("id", order.id);
    await admin.from("payments").update({
      status: "success",
      provider_transaction_id: txUid,
      metadata: { callback: payload },
      updated_at: now,
    }).eq("order_id", order.id);

    // Now that payment is real, notify the merchant (Make.com).
    const webhookUrl = Deno.env.get("VITE_ORDER_WEBHOOK_URL");
    if (webhookUrl) {
      const { data: items } = await admin.from("order_items").select("*").eq("order_id", order.id);
      const { data: business } = await admin
        .from("businesses").select("name, email, phone").eq("id", order.business_id).single();
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: { ...order, payment_status: "paid", paid_at: now },
          items: items || [],
          businessName: business?.name ?? null,
          businessEmail: business?.email ?? null,
          businessPhone: business?.phone ?? null,
          paid: true,
        }),
      }).catch((e) => console.warn("order webhook failed:", e));
    }
  } else {
    await admin.from("orders").update({ payment_status: "failed", updated_at: now }).eq("id", order.id);
    await admin.from("payments").update({
      status: "failed",
      error_message: payload?.transaction?.status_description ?? `status_code ${statusCode}`,
      metadata: { callback: payload },
      updated_at: now,
    }).eq("order_id", order.id);
  }

  return json({ ok: true });
});
