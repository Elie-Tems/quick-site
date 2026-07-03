// IPN for the FIRST self-managed subscription payment. iCount posts here after
// the hosted-page sale succeeds. We capture the stored card token (cc_token_id),
// activate recurring billing, publish the store, log the first charge, and
// redeem the coupon. Idempotent.
//
// Auth: iCount can't send headers, so the shared secret rides in the URL query
// (?secret=). verify_jwt=false in config.toml.

import { createClient } from "npm:@supabase/supabase-js@2";
import { tokenInfo } from "../_shared/icount/api.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type" };
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Probe common field names for the stored-card token id in the IPN payload.
function extractTokenId(p: Record<string, unknown>): string | null {
  for (const k of ["cc_token_id", "token_id", "cc_token", "token", "ccTokenId"]) {
    const v = p[k];
    if (typeof v === "number" && isFinite(v)) return String(v);
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  const nested = p["data"] ?? p["body"];
  if (nested && typeof nested === "object") return extractTokenId(nested as Record<string, unknown>);
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const secret = Deno.env.get("ICOUNT_WEBHOOK_SECRET") ?? "";
  if (!secret) return json({ error: "server misconfigured" }, 500);

  const u = new URL(req.url);
  const given = u.searchParams.get("secret") ?? u.searchParams.get("webhook_secret") ?? "";
  if (!safeEqual(given, secret)) return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Parse payload (JSON or form-encoded).
  let payload: Record<string, unknown> = {};
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) payload = await req.json();
    else {
      const t = await req.text();
      try { payload = JSON.parse(t); } catch { for (const [k, v] of new URLSearchParams(t)) payload[k] = v; }
    }
  } catch { return json({ error: "bad body" }, 400); }

  const sessionToken = u.searchParams.get("session_token") ||
    (typeof payload["x_order_id"] === "string" ? payload["x_order_id"] as string : null);
  if (!sessionToken) return json({ error: "no session_token" }, 400);

  const { data: session } = await admin
    .from("publish_checkout_sessions")
    .select("id, user_id, business_id, status, amount_ils, email")
    .eq("session_token", sessionToken).maybeSingle();
  if (!session) return json({ error: "session not found" }, 404);
  if (session.status === "completed") return json({ ok: true, duplicate: true });

  const now = new Date().toISOString();
  const userId = session.user_id as string;
  const businessId = session.business_id as string;

  // Capture the stored-card token. If the IPN doesn't carry it, we still activate
  // the first period but flag that recurring isn't armed (Moti confirms the exact
  // field with iCount, then we backfill). Enrich last4/expiry when possible.
  const tokenId = extractTokenId(payload);
  let last4: string | undefined, ccType: string | undefined, expM: number | undefined, expY: number | undefined;
  if (tokenId) {
    const info = await tokenInfo(tokenId);
    if (info.ok) { last4 = info.data.cc_last4; ccType = info.data.cc_type; expM = info.data.cc_exp_month; expY = info.data.cc_exp_year; }
    await admin.from("billing_tokens").insert({
      user_id: userId, provider: "icount", cc_token_id: tokenId,
      cc_last4: last4 ?? null, cc_type: ccType ?? null,
      cc_exp_month: expM ?? null, cc_exp_year: expY ?? null,
    });
  } else {
    console.warn("billing-icount-ipn: no token id in IPN - recurring not armed. Fields:", Object.keys(payload).join(","));
  }

  const paidUntil = new Date(Date.now() + 31 * 24 * 3600 * 1000).toISOString();
  const nextCharge = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

  // Activate the subscription for token-based recurring billing.
  await admin.from("subscriptions").upsert({
    user_id: userId,
    status: "active",
    billing_provider: "icount_token",
    cc_token_id: tokenId ?? null,
    paid_until: paidUntil,
    next_charge_at: tokenId ? nextCharge : null,   // only arm recurring if we have a token
    billing_cycle_count: 1,
    last_charge_status: "success",
    cancel_type: null,
    cancel_at: null,
    updated_at: now,
  }, { onConflict: "user_id" });

  // Audit the first charge.
  await admin.from("billing_charges").insert({
    user_id: userId, business_id: businessId,
    amount_ils: session.amount_ils, status: "success", is_test: false,
    confirmation_code: (payload["confirmation_code"] as string) ?? null,
    idempotency_key: `${sessionToken}:cycle0`,
    payment_description: "פרסום אתר Siango - חיוב ראשון",
  }).then(() => {}).catch(() => {});

  // Redeem the coupon (increment + record), if one was on the subscription.
  const { data: sub } = await admin.from("subscriptions").select("coupon_code").eq("user_id", userId).maybeSingle();
  const code = (sub as any)?.coupon_code as string | undefined;
  if (code) {
    const { data: coup } = await admin.from("subscription_coupons").select("id, redeemed_count").ilike("code", code).maybeSingle();
    if (coup) {
      await admin.from("subscription_coupons").update({ redeemed_count: ((coup as any).redeemed_count ?? 0) + 1 }).eq("id", (coup as any).id);
      await admin.from("subscription_coupon_redemptions").upsert(
        { coupon_id: (coup as any).id, user_id: userId, business_id: businessId, code },
        { onConflict: "coupon_id,user_id", ignoreDuplicates: true },
      );
    }
  }

  // Publish the store (service role passes the publish gate).
  await admin.from("businesses").update({ is_published: true, updated_at: now }).eq("id", businessId);
  await admin.from("publish_checkout_sessions").update({ status: "completed", payment_verified_at: now, updated_at: now }).eq("id", session.id);

  return json({ ok: true, published: true, recurringArmed: !!tokenId });
});
