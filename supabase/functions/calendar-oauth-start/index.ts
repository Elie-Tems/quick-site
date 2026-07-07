// Start the Google Calendar connect flow for a staff member. Merchant JWT
// (verify_jwt=true): the caller must own the business the staff belongs to. We
// return a Google consent URL carrying a signed `state` (business+staff+nonce)
// that calendar-oauth-callback verifies, so the callback can't be forged.
//
// Google-first (per product decision); Microsoft can follow the same shape.

import { createClient } from "npm:@supabase/supabase-js@2";
import { googleAuthUrl } from "../_shared/calendar/google.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function sign(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  let body: { staffId?: string; provider?: string };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const staffId = body.staffId?.trim();
  const provider = body.provider ?? "google";
  if (!staffId) return json({ error: "staffId required" }, 400);
  if (provider !== "google") return json({ error: "only google is supported yet" }, 400);
  if (!Deno.env.get("GOOGLE_CLIENT_ID")) return json({ error: "google_not_configured" }, 503);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "invalid session" }, 401);

  const admin = createClient(url, svc);
  // Ownership: staff -> business -> profile -> user.
  const { data: staff } = await admin.from("booking_staff")
    .select("id, business_id").eq("id", staffId).maybeSingle();
  if (!staff) return json({ error: "staff not found" }, 404);
  const { data: biz } = await admin.from("businesses")
    .select("id, owner_id").eq("id", staff.business_id).maybeSingle();
  const { data: prof } = await admin.from("profiles")
    .select("user_id").eq("id", biz?.owner_id).maybeSingle();
  if (prof?.user_id !== user.id) return json({ error: "forbidden" }, 403);

  // Signed, expiring state. No DB row needed - the callback re-derives ownership.
  const nonce = crypto.randomUUID();
  const issuedAt = Date.now();
  const payload = `${staff.business_id}.${staffId}.${provider}.${nonce}.${issuedAt}`;
  const secret = Deno.env.get("CALENDAR_STATE_SECRET") || svc;
  const state = `${btoa(payload)}.${await sign(secret, payload)}`;

  return json({ ok: true, url: googleAuthUrl(state) });
});
