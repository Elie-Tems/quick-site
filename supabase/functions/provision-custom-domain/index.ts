// Provision a merchant's PURCHASED domain as a Cloudflare custom hostname so it
// serves their store over HTTPS. Merchant-authenticated (verify_jwt=true). The
// merchant must own a COMPLETED domain_order for the domain. DORMANT until the
// Cloudflare secrets are set (see _shared/domains/cloudflare.ts) - returns
// { configured:false } so the dashboard can show "בהקמה" instead of erroring.
//
// Deliberately standalone: it does NOT run inside the paid-registration path
// (register.ts), so an un-set-up / failing Cloudflare call can never break a real
// domain purchase. Call it after purchase (or on a "connect domain" button).

import { createClient } from "npm:@supabase/supabase-js@2";
import { cfAddCustomHostname, cfGetCustomHostnameStatus } from "../_shared/domains/cloudflare.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: uErr } = await userClient.auth.getUser();
  if (uErr || !user) return json({ ok: false, error: "invalid session" }, 401);

  let body: { domain?: string; action?: "provision" | "status" };
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }
  const domain = (body.domain || "").trim().toLowerCase();
  if (!domain) return json({ ok: false, error: "domain required" }, 400);

  // Ownership: the caller must own a completed order for this domain.
  const admin = createClient(url, service);
  const { data: order } = await admin.from("domain_orders")
    .select("id, status, user_id").eq("domain", domain).eq("user_id", user.id)
    .in("status", ["completed", "registered"]).maybeSingle();
  if (!order) return json({ ok: false, error: "no_completed_order_for_domain" }, 403);

  const res = body.action === "status"
    ? await cfGetCustomHostnameStatus(domain)
    : await cfAddCustomHostname(domain);

  if (!res.configured) {
    return json({ ok: true, configured: false, message: "חיבור דומיינים מותאמים בהקמה - יופעל בקרוב." });
  }
  return json({ ok: res.ok ?? true, configured: true, data: (res as { data?: unknown }).data ?? null, error: (res as { error?: string }).error });
});
