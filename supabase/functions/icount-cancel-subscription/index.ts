// Cancels the authenticated merchant's subscription.
//
// NOTE ON THE NAME: this endpoint is still called "icount-cancel-subscription" for
// backwards compatibility (the dashboard invokes it by that name), but billing is
// now self-managed via Cardcom tokens - there is NO external standing order to
// cancel. We initiate each monthly charge ourselves from billing-charge-run, so
// cancelling = marking the subscription cancelled and it simply stops being charged.
// (Kept the name to avoid a redeploy/rename race on a billing endpoint; safe to
// rename to `subscription-cancel` in a dedicated step later.)
//
// verify_jwt = true (default): only the subscription's own owner can cancel it.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

  let body: { cancelType?: "immediate" | "end_of_period"; cancelReason?: string; businessId?: string } = {};
  try { body = await req.json(); } catch { /* defaults */ }
  const cancelType = body.cancelType === "immediate" ? "immediate" : "end_of_period";
  const cancelReason = (body.cancelReason || "").toString().slice(0, 300) || null;
  const businessId = (body.businessId || "").trim();

  const admin = createClient(url, service);

  // Per-site: cancel the subscription for the given business (an account can own several).
  // The caller can only touch their OWN subscription (matched by their verified user id).
  // Falls back to the user's latest subscription for older single-site callers.
  let subQ = admin.from("subscriptions").select("id, user_id, business_id, status, paid_until").eq("user_id", user.id);
  subQ = businessId ? subQ.eq("business_id", businessId) : subQ.order("created_at", { ascending: false }).limit(1);
  const { data: sub, error: subErr } = await subQ.maybeSingle();
  if (subErr) return json({ ok: false, error: "lookup_failed" }, 500);
  if (!sub) return json({ ok: false, error: "no_subscription" }, 404);

  // Record the cancellation. Future Cardcom charges stop because billing-charge-run
  // only charges subscriptions with status in ('active','past_due').
  const now = new Date().toISOString();
  const cancelAt = cancelType === "immediate" ? now : (sub.paid_until || now);
  const { error: updErr } = await admin
    .from("subscriptions")
    .update({ status: "cancelled", cancel_type: cancelType, cancel_at: cancelAt, cancel_reason: cancelReason, updated_at: now })
    .eq("id", sub.id);
  if (updErr) return json({ ok: false, error: "db_update_failed" }, 500);

  // Immediate cancellation takes the store offline now. End-of-period leaves it
  // live until cancel_at, when expire-subscriptions removes it.
  if (cancelType === "immediate" && (sub as { business_id?: string }).business_id) {
    await admin.from("businesses").update({ is_published: false }).eq("id", (sub as { business_id: string }).business_id);
  }

  return json({ ok: true, cancelType, cancelAt });
});
