// Cardcom webhook for card-update flow. Called after the merchant enters a new card
// on the Cardcom hosted page (₪1 verify charge). Verifies server-to-server via
// GetLpResult, swaps billing_tokens, reactivates a past_due subscription, and
// re-publishes the store. The ₪1 verify charge is NOT refunded here - Cardcom does
// that automatically within 24h.
//
// Auth: shared secret in URL (?secret=). verify_jwt=false in config.toml.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getLpResult } from "../_shared/cardcom/api.ts";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const secret = Deno.env.get("CARDCOM_WEBHOOK_SECRET") ?? "";
  const u = new URL(req.url);
  if (!safeEqual(u.searchParams.get("secret") ?? "", secret)) return json({ error: "unauthorized" }, 401);

  const businessId = u.searchParams.get("business_id");
  const sessionToken = u.searchParams.get("session_token");
  if (!businessId || !sessionToken) return json({ error: "missing params" }, 400);

  let payload: Record<string, unknown> = {};
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) payload = await req.json();
    else {
      const t = await req.text();
      try { payload = JSON.parse(t); } catch { for (const [k, v] of new URLSearchParams(t)) payload[k] = v; }
    }
  } catch { /* ok */ }

  const lowProfileId = (typeof payload["LowProfileId"] === "string" && payload["LowProfileId"])
    ? payload["LowProfileId"] as string : null;
  if (!lowProfileId) return json({ error: "no LowProfileId" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Server-to-server verification
  const result = await getLpResult(lowProfileId);
  if (!result.ok || result.data.ResponseCode !== 0) {
    return json({ ok: false, error: result.error || result.data.Description }, 200);
  }

  const rd = result.data;
  const token = rd.TokenInfo?.Token || null;
  const expMonth = rd.TokenInfo?.CardMonth ?? null;
  const expYear = rd.TokenInfo?.CardYear ?? null;
  const last4 = rd.TranzactionInfo?.Last4CardDigitsString ?? null;
  const ccName = rd.TranzactionInfo?.CardName ?? null;

  if (!token) return json({ ok: false, error: "no token returned" }, 200);

  // Find the subscription to know the user_id
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, user_id, status, cc_token_id")
    .eq("business_id", businessId)
    .eq("billing_provider", "cardcom_token")
    .maybeSingle();
  if (!sub) return json({ error: "subscription not found" }, 404);

  const userId = (sub as any).user_id as string;
  const nowIso = new Date().toISOString();

  // Insert new token row
  await admin.from("billing_tokens").insert({
    user_id: userId,
    provider: "cardcom",
    cc_token_id: token,
    cc_last4: last4,
    cc_type: ccName,
    cc_exp_month: expMonth,
    cc_exp_year: expYear,
  });

  // Update subscription to point to new token + clear past_due
  const wasPaymentDue = (sub as any).status === "past_due";
  await admin.from("subscriptions").update({
    cc_token_id: token,
    status: wasPaymentDue ? "active" : (sub as any).status,
    updated_at: nowIso,
  }).eq("id", (sub as any).id);

  // Re-publish if store was suspended
  if (wasPaymentDue) {
    await admin.from("businesses")
      .update({ is_published: true, updated_at: nowIso })
      .eq("id", businessId);

    // Notify the merchant
    const { data: u2 } = await admin.auth.admin.getUserById(userId);
    const email = u2?.user?.email;
    if (email) {
      fetch(`${url}/functions/v1/send-platform-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({
          type: "cardUpdated",
          to: email,
          ctx: { last4: last4 ?? "????", recipientEmail: email, lang: "he" },
        }),
      }).catch(() => {});
    }
  }

  return json({ ok: true, tokenUpdated: true, reactivated: wasPaymentDue });
});
