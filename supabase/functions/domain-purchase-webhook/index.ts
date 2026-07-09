// Step 2 of the domain buy flow: iCount IPN. Called by iCount after the customer
// pays on the hosted payment page. Identifies the order by session_token (sent in
// the IPN URL), and only THEN registers the domain at Openprovider on the
// customer's name, points its DNS at the store, records it, and emails the buyer.
//
// Money safety: registration (which spends reseller balance) happens strictly
// after iCount confirms payment. If the reseller balance is empty the order is
// flagged failed_funds and an urgent admin alert is sent - the customer already
// paid, so it needs manual handling (top up + register, or refund).
import { createClient } from "npm:@supabase/supabase-js@2";
import { registerPaidDomainOrder } from "../_shared/domains/register.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Constant-time string comparison (avoids leaking the secret via timing).
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

interface DomainOrder {
  id: string;
  business_id: string | null;
  user_id: string | null;
  domain: string;
  extension: string | null;
  price_ils: number;
  cost_usd: number | null;
  status: string;
  auto_renew: boolean;
  reg_name: string | null;
  reg_email: string | null;
  reg_phone: string | null;
  reg_address: string | null;
  reg_city: string | null;
  reg_zip: string | null;
  reg_country: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const secret = Deno.env.get("ICOUNT_WEBHOOK_SECRET") ?? "";
  if (!secret) return json({ error: "Server misconfigured" }, 500);

  // Accept the secret via header or ?secret= query (iCount IPN can only send query params).
  const url = new URL(req.url);
  const headerSecret =
    req.headers.get("x-webhook-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("secret") ??
    "";
  if (!safeEqual(headerSecret, secret)) return json({ error: "Unauthorized" }, 401);

  // Identify the order. session_token is the reliable key (we put it in the IPN URL).
  let sessionToken = url.searchParams.get("session_token");
  let externalId = url.searchParams.get("transaction_id") || url.searchParams.get("tran_id");
  if (req.method === "POST") {
    try {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const b = await req.json().catch(() => ({}));
        sessionToken = sessionToken || b?.session_token || null;
        externalId = externalId || b?.transaction_id || b?.tran_id || b?.id || null;
      } else {
        const text = await req.text();
        const params = new URLSearchParams(text);
        sessionToken = sessionToken || params.get("session_token");
        externalId = externalId || params.get("transaction_id") || params.get("tran_id") || params.get("id");
      }
    } catch { /* tolerate empty/odd bodies - query params are the source of truth */ }
  }
  if (!sessionToken) return json({ error: "session_token required" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: order } = await admin
    .from("domain_orders").select("*").eq("session_token", sessionToken).maybeSingle() as { data: DomainOrder | null };
  if (!order) return json({ error: "Order not found" }, 404);

  // Idempotent: already done.
  if (order.status === "registered") return json({ ok: true, duplicate: true });
  if (order.status === "failed_funds" || order.status === "failed") {
    // A prior attempt failed; don't auto-retry charges. Acknowledge.
    return json({ ok: true, alreadyHandled: order.status });
  }

  // Verify the amount iCount reports (when present) is at least the order price,
  // so a forged/low IPN can't trigger a paid registration that drains balance.
  const ipnAmount = Number(
    url.searchParams.get("sum") || url.searchParams.get("amount") ||
    url.searchParams.get("total") || url.searchParams.get("paid") || 0,
  );
  if (ipnAmount > 0 && ipnAmount + 0.5 < Number(order.price_ils)) {
    await admin.from("domain_orders").update({
      status: "failed", error: `amount mismatch: ${ipnAmount} < ${order.price_ils}`, updated_at: new Date().toISOString(),
    }).eq("id", order.id);
    return json({ error: "amount mismatch" }, 400);
  }

  const now = new Date().toISOString();
  await admin.from("domain_orders").update({ status: "paid", external_transaction_id: externalId, updated_at: now }).eq("id", order.id);

  // Register (spends reseller balance) - shared with the Cardcom token flow.
  const result = await registerPaidDomainOrder(admin, order);
  if (!result.ok) return json({ ok: false, handled: result.handled }, 200);
  return json({ ok: true, domain: result.domain, orderId: result.orderId });
});
