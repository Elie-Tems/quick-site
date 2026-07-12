// Resume (un-cancel) a subscription. The client CANNOT do this directly: the
// protect_subscription_billing trigger blocks any non-service-role change to
// `status`, so a client UPDATE to status='active' always fails ("שגיאה בחידוש
// המנוי"). This runs with the service role, verifies ownership, clears the
// cancellation flags, and - if an immediate cancel had taken the store offline -
// brings it back. No provider call needed: recurring billing is driven by our
// own cron (billing-charge-run), which simply resumes once status is active.
//
// verify_jwt=true (default): only the authenticated owner can resume their own sub.

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: uErr } = await userClient.auth.getUser();
  if (uErr || !user) return json({ ok: false, error: "invalid session" }, 401);

  const admin = createClient(url, service);

  // The user's subscription (owned by them via user_id).
  const { data: sub } = await admin.from("subscriptions")
    .select("id, user_id, cancel_type, status").eq("user_id", user.id)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!sub) return json({ ok: false, error: "no subscription" }, 404);
  if ((sub as { user_id?: string }).user_id !== user.id) return json({ ok: false, error: "forbidden" }, 403);

  const wasImmediate = (sub as { cancel_type?: string }).cancel_type === "immediate";

  const { error: upErr } = await admin.from("subscriptions")
    .update({ status: "active", cancel_type: null, cancel_at: null, updated_at: new Date().toISOString() })
    .eq("id", (sub as { id: string }).id);
  if (upErr) return json({ ok: false, error: "לא הצלחנו לחדש כרגע. נסו שוב עוד רגע." }, 500);

  // Bring the store back online if an immediate cancel had taken it down.
  if (wasImmediate) {
    const { data: prof } = await admin.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
    if (prof) {
      await admin.from("businesses").update({ is_published: true }).eq("owner_id", (prof as { id: string }).id);
    }
  }

  return json({ ok: true });
});
