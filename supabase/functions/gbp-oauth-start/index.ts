// Start the Google Business Profile OAuth flow for a merchant.
// POST { businessId } — merchant JWT required.
// Returns { url } — redirect the browser there to begin the consent flow.
// Secrets: GOOGLE_CLIENT_ID, GBP_REDIRECT_URI, GBP_STATE_SECRET (falls back to SERVICE_ROLE_KEY).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const GBP_SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
  "openid", "email",
].join(" ");

async function sign(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  let body: { businessId?: string };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const businessId = body.businessId?.trim();
  if (!businessId) return json({ error: "businessId required" }, 400);

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const redirectUri = Deno.env.get("GBP_REDIRECT_URI");
  if (!clientId || !redirectUri) return json({ error: "google_not_configured" }, 503);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "invalid session" }, 401);

  const admin = createClient(url, svc);
  const { data: biz } = await admin.from("businesses")
    .select("id, owner_id").eq("id", businessId).maybeSingle();
  const { data: prof } = biz
    ? await admin.from("profiles").select("user_id").eq("id", biz.owner_id).maybeSingle()
    : { data: null };
  if (prof?.user_id !== user.id) return json({ error: "forbidden" }, 403);

  const nonce = crypto.randomUUID();
  const issuedAt = Date.now();
  const payload = `${businessId}.${nonce}.${issuedAt}`;
  const secret = Deno.env.get("GBP_STATE_SECRET") || svc;
  const state = `${btoa(payload)}.${await sign(secret, payload)}`;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GBP_SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return json({ ok: true, url: authUrl.toString() });
});
