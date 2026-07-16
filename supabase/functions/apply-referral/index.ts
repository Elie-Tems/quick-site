// Recover referral attribution for a signed-in user whose referral code did not
// reach the DB trigger. This is the fallback for Google OAuth signups, where
// signInWithOAuth's options.data (which would carry `referred_by`) is dropped and
// never lands in raw_user_meta_data, so handle_new_user never wires the referral.
//
// The frontend stashes the code in localStorage ("onboarding_referral") before the
// OAuth redirect and calls this once, on the genuinely-new-user landing in
// /auth/callback. verify_jwt stays TRUE (default): the caller must be authenticated;
// we attribute the referral to THEM (the Bearer JWT identity), never a body field.
//
// Idempotent + safe: no-op if the user already has a referrer, guards self-referral,
// and mirrors exactly what the handle_new_user trigger writes to referral_logs
// (referrer_user_id, referred_user_id, reward_given=false) with ON CONFLICT
// (referred_user_id) DO NOTHING.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface ReqBody {
  code: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Identify the caller from their Bearer JWT - the referral is attributed to THIS
  // user, never to anything in the request body.
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return json({ error: "unauthorized" }, 401);

  let body: ReqBody;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const code = (body?.code || "").trim();
  if (!code) return json({ error: "code is required" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const caller = userData?.user;
  if (userErr || !caller) return json({ error: "unauthorized" }, 401);

  // Resolve the caller's own profile.
  const { data: myProfile, error: myErr } = await admin
    .from("profiles")
    .select("user_id, referred_by")
    .eq("user_id", caller.id)
    .maybeSingle();
  if (myErr) return json({ error: "profile lookup failed", detail: myErr.message }, 500);
  if (!myProfile) return json({ error: "profile not found" }, 404);

  // Already attributed (e.g. the trigger caught it, or a prior call) - no-op.
  if (myProfile.referred_by) return json({ ok: true, applied: false });

  // Resolve the referrer by their referral code.
  const { data: referrer, error: refErr } = await admin
    .from("profiles")
    .select("user_id")
    .eq("referral_code", code)
    .maybeSingle();
  if (refErr) return json({ error: "referrer lookup failed", detail: refErr.message }, 500);
  // Unknown code, or someone trying to refer themselves - accept without attributing.
  if (!referrer || referrer.user_id === caller.id) return json({ ok: true, applied: false });

  // Attribute: store the referral CODE on the profile (same as handle_new_user does).
  const { error: updErr } = await admin
    .from("profiles")
    .update({ referred_by: code })
    .eq("user_id", caller.id);
  if (updErr) return json({ error: "attribution failed", detail: updErr.message }, 500);

  // Mirror the trigger's referral_logs row exactly. ON CONFLICT (referred_user_id)
  // DO NOTHING => idempotent (a re-fired call can't duplicate the log).
  const { error: logErr } = await admin
    .from("referral_logs")
    .upsert(
      { referrer_user_id: referrer.user_id, referred_user_id: caller.id, reward_given: false },
      { onConflict: "referred_user_id", ignoreDuplicates: true },
    );
  if (logErr) console.warn("referral_logs insert failed (attribution stands):", caller.id, logErr.message);

  return json({ ok: true, applied: true });
});
