// billing-update-card: creates a new Cardcom LowProfile session so the merchant can
// replace their saved card. We use ChargeAndCreateToken with amount=₪1 (a verify
// charge that Cardcom refunds automatically within 24h), not ₪0, because some
// issuers reject zero-amount authorizations. The billing-update-card-webhook then
// swaps billing_tokens, clears past_due, and re-publishes the store.
//
// Auth: merchant JWT (verify_jwt=true).

import { createClient } from "npm:@supabase/supabase-js@2";
import { createLowProfile } from "../_shared/cardcom/api.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const APP_URL = Deno.env.get("VITE_APP_URL") || "https://siango.app";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "invalid session" }, 401);

  let body: { businessId?: string };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const businessId = body.businessId?.trim();
  if (!businessId) return json({ error: "businessId required" }, 400);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Ownership check
  const { data: biz } = await admin
    .from("businesses")
    .select("id, name, owner_id")
    .eq("id", businessId)
    .maybeSingle();
  if (!biz) return json({ error: "business not found" }, 404);
  const { data: prof } = await admin
    .from("profiles")
    .select("user_id")
    .eq("id", (biz as any).owner_id)
    .maybeSingle();
  if ((prof as any)?.user_id !== user.id) return json({ error: "forbidden" }, 403);

  // Must have an active/past_due Cardcom subscription
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, status, billing_provider")
    .eq("business_id", businessId)
    .eq("billing_provider", "cardcom_token")
    .maybeSingle();
  if (!sub) return json({ error: "no_cardcom_subscription" }, 400);

  const sessionToken = crypto.randomUUID();
  const webhookSecret = Deno.env.get("CARDCOM_WEBHOOK_SECRET") ?? "";
  const webhookUrl = `${url}/functions/v1/billing-update-card-webhook?session_token=${sessionToken}&secret=${encodeURIComponent(webhookSecret)}&business_id=${businessId}`;

  // ₪1 verify charge (Cardcom refunds automatically)
  const res = await createLowProfile({
    amountIls: 1,
    returnValue: sessionToken,
    webhookUrl,
    successUrl: `${APP_URL}/dashboard?cardUpdated=1`,
    failureUrl: `${APP_URL}/dashboard?cardUpdateFailed=1`,
    productName: "אימות כרטיס Siango",
  });

  if (!res.ok || !res.data.Url) {
    return json({ error: "cardcom_create_failed", detail: res.error || res.data }, 502);
  }

  return json({ ok: true, saleUrl: res.data.Url, sessionToken });
});
