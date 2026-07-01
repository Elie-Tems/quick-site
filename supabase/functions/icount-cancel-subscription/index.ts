// Cancels the authenticated merchant's subscription - and, crucially, cancels the
// iCount recurring-billing profile (הוראת קבע) so future cycles are NOT charged.
//
// Flow: verify the logged-in merchant -> find their subscription -> if it has an
// iCount hk_id, call iCount hk/cancel FIRST. Only if iCount confirms (or there is
// nothing to cancel) do we mark our DB cancelled. If the iCount cancel fails we
// return an error and leave the subscription active, so we never tell the merchant
// "cancelled" while iCount keeps charging. A daily reconciliation job double-checks.
//
// verify_jwt = true (default): only the subscription's own owner can cancel it.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ICOUNT_BASE = "https://api.icount.co.il/api/v3.php";

// Call the iCount v3 API (same auth as icount-invoices: Bearer ICOUNT_API_TOKEN).
async function icount(endpoint: string, payload: Record<string, unknown>) {
  const token = Deno.env.get("ICOUNT_API_TOKEN");
  if (!token) return { status: false, reason: "not_configured" } as any;
  try {
    const r = await fetch(`${ICOUNT_BASE}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return await r.json();
  } catch (e) {
    return { status: false, reason: "request_failed", error: String(e) } as any;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "Unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json({ ok: false, error: "Invalid session" }, 401);

  let body: { cancelType?: "immediate" | "end_of_period"; cancelReason?: string } = {};
  try { body = await req.json(); } catch { /* defaults */ }
  const cancelType = body.cancelType === "immediate" ? "immediate" : "end_of_period";
  const cancelReason = (body.cancelReason || "").toString().slice(0, 300) || null;

  const admin = createClient(url, service);

  // The caller can only ever touch their OWN subscription (looked up by their
  // verified auth user id), so there's no way to cancel someone else's.
  const { data: sub, error: subErr } = await admin
    .from("subscriptions")
    .select("id, user_id, status, paid_until, icount_hk_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (subErr) return json({ ok: false, error: "lookup_failed" }, 500);
  if (!sub) return json({ ok: false, error: "no_subscription" }, 404);

  // 1) Stop the money first. If there's an iCount standing order, cancel it and
  //    require confirmation before we flag our DB. No hk_id => nothing to stop at
  //    iCount (e.g. legacy / one-time), so we proceed to the DB cancel.
  let icountCancelled = false;
  const hkId = (sub as any).icount_hk_id;
  if (hkId) {
    const res = await icount("hk/cancel", { hk_id: hkId });
    if (!res?.status) {
      console.error("icount hk/cancel failed:", JSON.stringify(res));
      return json({ ok: false, error: "icount_cancel_failed", detail: res?.reason || null }, 502);
    }
    icountCancelled = true;
  }

  // 2) Now record the cancellation in our DB.
  const now = new Date().toISOString();
  const cancelAt = cancelType === "immediate" ? now : (sub.paid_until || now);
  const { error: updErr } = await admin
    .from("subscriptions")
    .update({ status: "cancelled", cancel_type: cancelType, cancel_at: cancelAt, cancel_reason: cancelReason, updated_at: now })
    .eq("id", sub.id);
  if (updErr) return json({ ok: false, error: "db_update_failed", icountCancelled }, 500);

  // 3) Immediate cancellation takes the store offline now. End-of-period leaves it
  //    live until cancel_at, when expire-subscriptions removes it.
  if (cancelType === "immediate") {
    const { data: profile } = await admin.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
    if (profile) {
      await admin.from("businesses").update({ is_published: false }).eq("owner_id", (profile as any).id);
    }
  }

  return json({ ok: true, icountCancelled, cancelType, cancelAt });
});
