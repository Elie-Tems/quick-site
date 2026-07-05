// IPN for the FIRST self-managed subscription payment. iCount posts here after
// the hosted-page sale succeeds. We capture the stored card token (cc_token_id),
// activate recurring billing, publish the store, log the first charge, and
// redeem the coupon. Idempotent.
//
// Auth: iCount can't send headers, so the shared secret rides in the URL query
// (?secret=). verify_jwt=false in config.toml.

import { createClient } from "npm:@supabase/supabase-js@2";
import { tokenInfo, getCcTokens, billToken, createDoc } from "../_shared/icount/api.ts";

const VAT_RATE = 0.18;
const grossIls = (net: number) => Math.round(net * (1 + VAT_RATE) * 100) / 100;

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

// Pull the newest token id out of a client/get_cc_tokens response (shape varies:
// the list may sit under tokens/cc_tokens/data/list, items keyed cc_token_id or
// token_id). Defensive - takes the last (usually most-recent) entry.
function tokenIdFromList(resp: Record<string, unknown>): string | null {
  const listKey = ["tokens", "cc_tokens", "data", "list", "items"].find(
    (k) => Array.isArray((resp as any)[k]),
  );
  const arr = listKey ? ((resp as any)[listKey] as Record<string, unknown>[]) : null;
  if (!arr?.length) return null;
  for (const item of [...arr].reverse()) {
    const id = item["cc_token_id"] ?? item["token_id"] ?? item["id"];
    if (id != null && String(id).trim() !== "") return String(id);
  }
  return null;
}

// iCount needs the client id alongside the token to charge (cc/bill). Probe the
// IPN payload (and a get_cc_tokens list) for it.
function extractClientId(p: Record<string, unknown>): string | null {
  for (const k of ["client_id", "clientId", "cid", "custom_client_id"]) {
    const v = p[k];
    if (typeof v === "number" && isFinite(v)) return String(v);
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  const nested = p["data"] ?? p["body"];
  if (nested && typeof nested === "object") return extractClientId(nested as Record<string, unknown>);
  return null;
}
function clientIdFromList(resp: Record<string, unknown>): string | null {
  const listKey = ["tokens", "cc_tokens", "data", "list", "items"].find((k) => Array.isArray((resp as any)[k]));
  const arr = listKey ? ((resp as any)[listKey] as Record<string, unknown>[]) : null;
  if (!arr?.length) return null;
  for (const item of [...arr].reverse()) {
    const id = item["client_id"] ?? item["cid"];
    if (id != null && String(id).trim() !== "") return String(id);
  }
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

  // Capture the stored-card token. iCount sends cc_token_id directly in the IPN;
  // if it's missing (field-name drift), fall back to client/get_cc_tokens by the
  // payer email. Enrich last4/expiry when possible.
  let tokenId = extractTokenId(payload);
  let clientId = extractClientId(payload);   // iCount client id - needed to charge the token
  if (!tokenId && session.email) {
    const list = await getCcTokens({ email: session.email as string });
    if (list.ok) { tokenId = tokenIdFromList(list.data); clientId = clientId ?? clientIdFromList(list.data); }
  }
  let last4: string | undefined, ccType: string | undefined, expM: number | undefined, expY: number | undefined;
  if (tokenId) {
    const info = await tokenInfo(tokenId);
    if (info.ok) { last4 = info.data.cc_last4; ccType = info.data.cc_type; expM = info.data.cc_exp_month; expY = info.data.cc_exp_year; }
    await admin.from("billing_tokens").insert({
      user_id: userId, provider: "icount", cc_token_id: tokenId, icount_client_id: clientId ?? null,
      cc_last4: last4 ?? null, cc_type: ccType ?? null,
      cc_exp_month: expM ?? null, cc_exp_year: expY ?? null,
    });
  } else {
    console.warn("billing-icount-ipn: no token id in IPN - recurring not armed. Fields:", Object.keys(payload).join(","));
  }

  // Without a stored token we can neither collect nor arm recurring - do NOT
  // publish (the hosted page only validated the card; there's nothing to charge on).
  if (!tokenId) {
    await admin.from("publish_checkout_sessions").update({ status: "no_token", updated_at: now }).eq("id", session.id);
    return json({ ok: false, error: "no_token", published: false }, 200);
  }

  const idem = `${sessionToken}:cycle0`;
  const isTest = Deno.env.get("BILLING_TEST_MODE") === "true";
  // session.amount_ils is the NET (pre-VAT, coupon-applied) first-charge amount.
  const firstGross = grossIls(Number(session.amount_ils) || 0);

  // Idempotency: if this session's first charge already succeeded (duplicate IPN),
  // just make sure the store is published and return.
  const { data: prior } = await admin.from("billing_charges").select("id, status").eq("idempotency_key", idem).maybeSingle();
  if (prior && (prior as any).status === "success") {
    await admin.from("businesses").update({ is_published: true, updated_at: now }).eq("id", businessId);
    await admin.from("publish_checkout_sessions").update({ status: "completed", payment_verified_at: now, updated_at: now }).eq("id", session.id);
    return json({ ok: true, duplicate: true, published: true });
  }

  // Collect the first month on the stored token. The token page only VALIDATED the
  // card (₪1); per our self-managed model WE charge the real amount via cc/bill.
  // A 100%-off coupon makes firstGross 0 -> nothing to charge (still activate/publish).
  let chargeOk = firstGross <= 0;
  let confCode: string | null = (payload["confirmation_code"] as string) ?? null;
  let chargeErr: string | null = null;
  if (firstGross > 0) {
    const res = await billToken({
      ccTokenId: tokenId, sumIls: firstGross,
      clientId: clientId ?? undefined, customClientId: userId,
      description: "פרסום אתר Siango - חיוב ראשון",
      email: (session.email as string) ?? undefined, isTest,
    });
    // A real charge returns a confirmation_code (and success:true). res.ok already
    // rejects an explicit failure (success:false / error). We accept either the
    // success flag OR a confirmation_code so a harmless format difference in
    // iCount's response can't silently make a real, paid charge look declined.
    confCode = res.data.confirmation_code ?? confCode;
    chargeOk = res.ok && ((res.data as any).success === true || !!res.data.confirmation_code);
    if (!chargeOk) chargeErr = String((res.data as any)?.error || res.error || "declined");
  }

  // Audit the REAL outcome (append-only, idempotent on the cycle-0 key).
  await admin.from("billing_charges").insert({
    user_id: userId, business_id: businessId, amount_ils: firstGross,
    status: chargeOk ? "success" : "failed", is_test: isTest,
    confirmation_code: chargeOk ? confCode : null, error_code: chargeErr,
    idempotency_key: idem,
    payment_description: "פרסום אתר Siango - חיוב ראשון",
  }).then(() => {}).catch(() => {});

  // First charge declined -> do NOT publish. Keep the token so the customer can
  // retry (kept pending). The store stays unpublished until a charge succeeds.
  if (!chargeOk) {
    await admin.from("subscriptions").upsert({
      user_id: userId, status: "pending", billing_provider: "icount_token",
      cc_token_id: tokenId, last_charge_status: "failed", updated_at: now,
    }, { onConflict: "user_id" });
    await admin.from("publish_checkout_sessions").update({ status: "charge_failed", updated_at: now }).eq("id", session.id);
    return json({ ok: false, charged: false, error: chargeErr, published: false }, 200);
  }

  const paidUntil = new Date(Date.now() + 31 * 24 * 3600 * 1000).toISOString();
  const nextCharge = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

  // Activate the subscription for token-based recurring billing (cycle 0 done;
  // the monthly cron picks up cycle 1 at next_charge_at).
  await admin.from("subscriptions").upsert({
    user_id: userId,
    status: "active",
    billing_provider: "icount_token",
    cc_token_id: tokenId,
    paid_until: paidUntil,
    next_charge_at: nextCharge,
    billing_cycle_count: 1,
    last_charge_status: "success",
    cancel_type: null,
    cancel_at: null,
    updated_at: now,
  }, { onConflict: "user_id" });

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

  // Referral reward: if this merchant was referred, grant the REFERRER a free
  // month (once per referred merchant - the unique referral_rewards row + the
  // session-completed idempotency both guard against double-granting).
  try {
    const { data: me } = await admin.from("profiles").select("referred_by").eq("user_id", userId).maybeSingle();
    const refCode = (me as any)?.referred_by as string | undefined;
    if (refCode) {
      const { data: refProf } = await admin.from("profiles").select("user_id").eq("referral_code", refCode).maybeSingle();
      const referrerId = (refProf as any)?.user_id as string | undefined;
      if (referrerId && referrerId !== userId) {
        const { data: reward } = await admin.from("referral_rewards")
          .upsert({ referrer_user_id: referrerId, referred_user_id: userId, reward_type: "free_month" },
                  { onConflict: "referred_user_id,reward_type", ignoreDuplicates: true })
          .select("id");
        // Only credit when the reward row was newly created (not a duplicate).
        if (reward && reward.length > 0) {
          const { data: rs } = await admin.from("subscriptions").select("free_months_credit").eq("user_id", referrerId).maybeSingle();
          await admin.from("subscriptions").upsert(
            { user_id: referrerId, free_months_credit: (((rs as any)?.free_months_credit ?? 0) + 1), updated_at: now },
            { onConflict: "user_id" },
          );
          console.log(`referral: granted free month to referrer ${referrerId} for ${userId}`);
        }
      }
    }
  } catch (e) { console.warn("referral reward failed (non-fatal):", e); }

  // Publish the store (service role passes the publish gate). Do this BEFORE
  // issuing the invoice / sending emails so a slow iCount doc/create or email
  // call can never leave a paid store unpublished.
  await admin.from("businesses").update({ is_published: true, updated_at: now }).eq("id", businessId);
  await admin.from("publish_checkout_sessions").update({ status: "completed", payment_verified_at: now, updated_at: now }).eq("id", session.id);

  // Issue the tax invoice/receipt (חשבונית מס/קבלה) - cc/bill captured the money
  // but does NOT create a document; doc/create does. Best effort (publish already
  // happened). Verify the FIRST real doc in iCount for correct amount/VAT.
  if (firstGross > 0) {
    try {
      const doc = await createDoc({
        description: "פרסום אתר Siango - מנוי חודשי",
        sumIls: firstGross,
        clientId: clientId ?? undefined,
        email: (session.email as string) ?? undefined,
        confirmationCode: confCode ?? undefined,
        ccType, ccLast4: last4,
      });
      if (!doc.ok) console.warn("billing-icount-ipn: doc/create failed:", doc.error || JSON.stringify(doc.data));
    } catch (e) { console.warn("billing-icount-ipn: doc/create threw:", e); }
  }

  // Welcome ("your site is live") + payment receipt emails (best effort - never
  // block publishing). The formal tax invoice itself is issued by iCount per the
  // merchant's account settings; this receipt confirms the charge to the customer.
  const to = (session.email as string | null) ?? null;
  if (to) {
    const { data: bizRow } = await admin.from("businesses").select("name, slug").eq("id", businessId).maybeSingle();
    const businessName = (bizRow as any)?.name ?? undefined;
    const siteUrl = (bizRow as any)?.slug ? `https://siango.app/store/${(bizRow as any).slug}` : "https://siango.app";
    const sendEmail = (type: string, ctx: Record<string, unknown>) =>
      fetch(`${url}/functions/v1/send-platform-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({ type, to, ctx }),
      }).then(() => {}).catch(() => {});
    await sendEmail("siteReady", { businessName, siteUrl, recipientEmail: to, lang: "he" });
    if (firstGross > 0) {
      await sendEmail("paymentReceipt", { businessName, amountIls: firstGross, recipientEmail: to, lang: "he" });
    }
  }

  return json({ ok: true, published: true, recurringArmed: !!tokenId });
});
