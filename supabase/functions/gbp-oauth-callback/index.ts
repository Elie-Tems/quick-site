// Google's redirect target for the GBP OAuth flow.
// verify_jwt=false — Google calls this with no JWT; authenticated by signed state.
// Exchanges the auth code for tokens, picks the first GBP location,
// stores the encrypted refresh_token on the business row, then redirects to dashboard.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { encryptToken } from "../_shared/calendar/crypto.ts";

const APP_URL = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");
const redirect = (path: string) =>
  new Response(null, { status: 302, headers: { Location: `${APP_URL}${path}` } });

async function verify(secret: string, msg: string, hex: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  const want = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (want.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ hex.charCodeAt(i);
  return diff === 0;
}

async function exchangeCode(code: string): Promise<{ access_token: string; refresh_token?: string }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      redirect_uri: Deno.env.get("GBP_REDIRECT_URI") ?? "",
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
  return res.json();
}

async function listAccounts(accessToken: string): Promise<{ name: string }[]> {
  const res = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.accounts ?? [];
}

async function listLocations(accessToken: string, accountName: string): Promise<{ name: string; title: string }[]> {
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations?readMask=name,title`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.locations ?? [];
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  if (u.searchParams.get("error")) return redirect("/dashboard?gbp=denied");
  if (!code || !state) return redirect("/dashboard?gbp=error");

  const [payloadB64, sig] = state.split(".");
  if (!payloadB64 || !sig) return redirect("/dashboard?gbp=error");
  let payload = "";
  try { payload = atob(payloadB64); } catch { return redirect("/dashboard?gbp=error"); }

  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const secret = Deno.env.get("GBP_STATE_SECRET") || svc;
  if (!(await verify(secret, payload, sig))) return redirect("/dashboard?gbp=error");

  const [businessId, , issuedAtStr] = payload.split(".");
  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > 15 * 60_000) {
    return redirect("/dashboard?gbp=expired");
  }
  if (!businessId) return redirect("/dashboard?gbp=error");

  let tokens: { access_token: string; refresh_token?: string };
  try { tokens = await exchangeCode(code); } catch {
    return redirect("/dashboard?gbp=error");
  }

  const { access_token, refresh_token } = tokens;
  if (!refresh_token) return redirect("/dashboard?gbp=no_refresh_token");

  const encRefresh = await encryptToken(refresh_token);

  // Discover first location
  const accounts = await listAccounts(access_token);
  let locationId: string | null = null;
  let locationName: string | null = null;
  for (const acc of accounts) {
    const locs = await listLocations(access_token, acc.name);
    if (locs.length > 0) {
      locationId = locs[0].name;
      locationName = locs[0].title;
      break;
    }
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    svc,
  );
  await admin.from("businesses").update({
    gbp_refresh_token: encRefresh,
    gbp_location_id: locationId,
    gbp_location_name: locationName,
    gbp_last_sync: new Date().toISOString(),
    gbp_website_pushed: false,
  }).eq("id", businessId);

  const locCount = locationId ? 1 : 0;
  return redirect(`/dashboard?gbp=connected&locations=${locCount}&view=google-business`);
});
