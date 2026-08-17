// Google Business Profile sync operations for a connected merchant.
// POST { action, businessId, locationId? }
// Actions:
//   "status"         — check connection + what's been pushed
//   "push_website"   — set websiteUri on the GBP location to the Siango store URL
//   "pull_hours"     — read regularHours from GBP and store in gbp_hours column
//   "disconnect"     — clear tokens (does not revoke at Google)
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GBP_REDIRECT_URI, CALENDAR_TOKEN_KEY.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { decryptToken } from "../_shared/calendar/crypto.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const STORE_BASE = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`refresh failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function getLocation(accessToken: string, locationId: string) {
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${locationId}?readMask=name,title,websiteUri,regularHours,phoneNumbers`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`getLocation ${res.status}: ${await res.text()}`);
  return res.json();
}

async function patchWebsite(accessToken: string, locationId: string, websiteUri: string) {
  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${locationId}?updateMask=websiteUri`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ websiteUri }),
    },
  );
  if (!res.ok) throw new Error(`patchWebsite ${res.status}: ${await res.text()}`);
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  let body: { action?: string; businessId?: string };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  const { action, businessId } = body;
  if (!action || !businessId) return json({ error: "action + businessId required" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "invalid session" }, 401);

  const admin = createClient(url, svc);
  const { data: biz } = await admin.from("businesses")
    .select("id, slug, owner_id, gbp_location_id, gbp_location_name, gbp_website_pushed, gbp_hours, gbp_last_sync")
    .eq("id", businessId).maybeSingle();
  const { data: prof } = biz
    ? await admin.from("profiles").select("user_id").eq("id", (biz as any).owner_id).maybeSingle()
    : { data: null };
  if (prof?.user_id !== user.id) return json({ error: "forbidden" }, 403);

  // Fetch token from isolated table (service_role only).
  const { data: tokenRow } = await admin.from("gbp_tokens")
    .select("refresh_token").eq("business_id", businessId).maybeSingle();

  if (action === "disconnect") {
    await admin.from("gbp_tokens").delete().eq("business_id", businessId);
    await admin.from("businesses").update({
      gbp_location_id: null,
      gbp_location_name: null,
      gbp_website_pushed: false,
      gbp_hours: null,
    }).eq("id", businessId);
    return json({ ok: true });
  }

  if (action === "status") {
    return json({
      connected: !!tokenRow?.refresh_token,
      locationId: biz?.gbp_location_id ?? null,
      locationName: biz?.gbp_location_name ?? null,
      websitePushed: biz?.gbp_website_pushed ?? false,
      hours: biz?.gbp_hours ?? null,
      lastSync: biz?.gbp_last_sync ?? null,
    });
  }

  if (!tokenRow?.refresh_token) return json({ error: "not_connected" }, 400);
  if (!biz?.gbp_location_id) return json({ error: "no_location" }, 400);

  let accessToken: string;
  try {
    const plain = await decryptToken(tokenRow.refresh_token);
    accessToken = await refreshAccessToken(plain);
  } catch (e: any) {
    return json({ error: "token_refresh_failed", detail: e.message }, 502);
  }

  if (action === "push_website") {
    const storeUrl = `${STORE_BASE}/store/${biz.slug}`;
    try {
      await patchWebsite(accessToken, biz.gbp_location_id, storeUrl);
      await admin.from("businesses").update({
        gbp_website_pushed: true,
        gbp_last_sync: new Date().toISOString(),
      }).eq("id", businessId);
      return json({ ok: true, storeUrl });
    } catch (e: any) {
      return json({ error: "push_failed", detail: e.message }, 502);
    }
  }

  if (action === "pull_hours") {
    try {
      const loc = await getLocation(accessToken, biz.gbp_location_id);
      const hours = loc.regularHours ?? null;
      await admin.from("businesses").update({
        gbp_hours: hours,
        gbp_location_name: loc.title ?? biz.gbp_location_name,
        gbp_last_sync: new Date().toISOString(),
      }).eq("id", businessId);
      return json({ ok: true, hours, locationName: loc.title });
    } catch (e: any) {
      return json({ error: "pull_failed", detail: e.message }, 502);
    }
  }

  return json({ error: "unknown action" }, 400);
});
