// Cron: free slots held by unpaid pending appointments whose hold expired. A
// pending appointment with a deposit gets a 10-min hold; if the deposit was never
// paid, cancel it so the slot returns to availability. Guarded by CRON_SECRET
// (?secret=...), constant-time compared. verify_jwt = false.

import { createClient } from "npm:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const secret = Deno.env.get("CRON_SECRET");
  if (secret && !safeEqual(url.searchParams.get("secret") || "", secret)) {
    return json({ error: "unauthorized" }, 401);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const nowIso = new Date().toISOString();

  const { data, error } = await admin
    .from("booking_appointments")
    .update({ status: "cancelled", deposit_status: "none", hold_expires_at: null, updated_at: nowIso })
    .eq("status", "pending")
    .eq("deposit_status", "pending")
    .lt("hold_expires_at", nowIso)
    .select("id");

  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, expired: (data ?? []).length });
});
