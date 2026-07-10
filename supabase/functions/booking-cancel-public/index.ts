// Public: customer self-cancels their appointment via the HMAC cancel_token from
// the confirmation (mirrors customer-orders magic-link auth - no account needed).
// verify_jwt = false.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

interface ReqBody { appointmentId: string; token: string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: ReqBody;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const { appointmentId, token } = body;
  if (!appointmentId || !token) return json({ error: "appointmentId and token are required" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: appt } = await admin
    .from("booking_appointments")
    .select("id, status, cancel_token, starts_at")
    .eq("id", appointmentId).maybeSingle();
  if (!appt || !appt.cancel_token || !safeEqual(String(appt.cancel_token), token)) {
    return json({ error: "not_found_or_invalid_token" }, 404);
  }
  if (appt.status === "cancelled") return json({ ok: true, alreadyCancelled: true });
  if (["completed", "no_show"].includes(appt.status)) return json({ error: "cannot_cancel_past" }, 400);

  const { error } = await admin
    .from("booking_appointments")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", appointmentId);
  if (error) return json({ error: error.message }, 500);

  // (Deposit refund + staff notification are handled in a later pass.)
  return json({ ok: true });
});
