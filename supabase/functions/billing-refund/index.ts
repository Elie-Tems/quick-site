// Admin-only refund of a subscription charge. Calls iCount cc/refund and records
// the refund in billing_charges (status='refunded'). Guarded by the caller's
// admin role - no merchant can refund.

import { createClient } from "npm:@supabase/supabase-js@2";
import { refundCharge } from "../_shared/icount/api.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "invalid session" }, 401);

  // Admin gate: the caller must have the 'admin' role.
  const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (isAdmin !== true) return json({ error: "forbidden" }, 403);

  let body: { chargeId?: string };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  if (!body.chargeId) return json({ error: "chargeId required" }, 400);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: charge } = await admin
    .from("billing_charges")
    .select("id, user_id, subscription_id, business_id, amount_ils, status, confirmation_code")
    .eq("id", body.chargeId).maybeSingle();
  if (!charge) return json({ error: "charge not found" }, 404);
  if ((charge as any).status !== "success") return json({ error: "only successful charges can be refunded" }, 400);

  // Attempt the refund at iCount. Exact cc/refund params can vary by account;
  // we pass the confirmation code + amount. Failures are surfaced, not swallowed.
  const res = await refundCharge({
    confirmation_code: (charge as any).confirmation_code,
    sum: (charge as any).amount_ils,
  });
  if (!res.ok) return json({ error: "icount_refund_failed", detail: res.error || res.data }, 502);

  const now = new Date().toISOString();
  await admin.from("billing_charges").update({ status: "refunded" }).eq("id", (charge as any).id);
  // Log the refund as its own audit row (negative amount).
  await admin.from("billing_charges").insert({
    user_id: (charge as any).user_id, subscription_id: (charge as any).subscription_id,
    business_id: (charge as any).business_id, amount_ils: -Math.abs((charge as any).amount_ils),
    status: "refunded", payment_description: `זיכוי (ע"י אדמין) לחיוב ${(charge as any).id}`,
    idempotency_key: `refund:${(charge as any).id}`,
    created_at: now,
  }).then(() => {}).catch(() => {});

  return json({ ok: true, refundedChargeId: (charge as any).id });
});
