// Google OAuth redirect target. verify_jwt=false (Google calls it with no JWT);
// authenticated instead by the signed `state` we minted in calendar-oauth-start.
// Exchanges the code for tokens, stores them ENCRYPTED in calendar_connections,
// then 302-redirects the merchant back to the dashboard.

import { createClient } from "npm:@supabase/supabase-js@2";
import { exchangeCode, emailFromIdToken } from "../_shared/calendar/google.ts";
import { encryptToken } from "../_shared/calendar/crypto.ts";

const APP_URL = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");

async function verify(secret: string, msg: string, hex: string): Promise<boolean> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  const want = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  // constant-time-ish compare
  if (want.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ hex.charCodeAt(i);
  return diff === 0;
}

const redirect = (path: string) =>
  new Response(null, { status: 302, headers: { Location: `${APP_URL}${path}` } });

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const err = u.searchParams.get("error");
  if (err) return redirect(`/dashboard?calendar=denied`);
  if (!code || !state) return redirect(`/dashboard?calendar=error`);

  const [payloadB64, sig] = state.split(".");
  if (!payloadB64 || !sig) return redirect(`/dashboard?calendar=error`);
  let payload = "";
  try { payload = atob(payloadB64); } catch { return redirect(`/dashboard?calendar=error`); }

  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const secret = Deno.env.get("CALENDAR_STATE_SECRET") || svc;
  if (!(await verify(secret, payload, sig))) return redirect(`/dashboard?calendar=error`);

  const [businessId, staffId, provider, , issuedAtStr] = payload.split(".");
  const issuedAt = Number(issuedAtStr);
  // State is single-use-ish: reject if older than 15 minutes.
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > 15 * 60_000) {
    return redirect(`/dashboard?calendar=expired`);
  }
  if (provider !== "google") return redirect(`/dashboard?calendar=error`);

  let tokens;
  try { tokens = await exchangeCode(code); }
  catch (e) { console.error("token exchange failed", e); return redirect(`/dashboard?calendar=error`); }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, svc);
  const accessEnc = await encryptToken(tokens.access_token);
  const refreshEnc = tokens.refresh_token ? await encryptToken(tokens.refresh_token) : null;
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();
  const email = emailFromIdToken(tokens.id_token);

  const row = {
    business_id: businessId, staff_id: staffId, provider: "google",
    provider_account_email: email,
    access_token_enc: accessEnc,
    // Keep an existing refresh token if Google didn't return a new one.
    ...(refreshEnc ? { refresh_token_enc: refreshEnc } : {}),
    token_expires_at: expiresAt,
    scopes: tokens.scope ?? null,
    primary_calendar_id: "primary",
    status: "active",
    last_synced_at: null,
  };

  const { data: existing } = await admin.from("calendar_connections")
    .select("id").eq("staff_id", staffId).eq("provider", "google").maybeSingle();
  if (existing) {
    await admin.from("calendar_connections").update(row).eq("id", existing.id);
  } else {
    await admin.from("calendar_connections").insert(row);
  }

  return redirect(`/dashboard?calendar=connected`);
});
