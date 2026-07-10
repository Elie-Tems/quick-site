// Cardcom webhook for the FIRST publish-subscription payment. Cardcom POSTs here
// after the hosted page (ChargeAndCreateToken) finishes. Per Cardcom's guidance we
// do NOT trust the posted body - we call LowProfile/GetLpResult to verify the deal
// server-to-server, then: store the card token (+ expiry) for recurring, record the
// charge, activate the subscription, and PUBLISH the store. The tax invoice was
// already issued by Cardcom (Document on the charge). Idempotent.
//
// Auth: Cardcom can't send custom headers, so the shared secret rides in the URL
// query (?secret=). verify_jwt=false in config.toml.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getLpResult } from "../_shared/cardcom/api.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type" };
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const secret = Deno.env.get("CARDCOM_WEBHOOK_SECRET") ?? "";
  if (!secret) return json({ error: "server misconfigured" }, 500);
  const u = new URL(req.url);
  if (!safeEqual(u.searchParams.get("secret") ?? "", secret)) return json({ error: "unauthorized" }, 401);

  // Parse the posted body (JSON or form-encoded) - only to find the LowProfileId +
  // our ReturnValue; the authoritative data comes from GetLpResult below.
  let payload: Record<string, unknown> = {};
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) payload = await req.json();
    else { const t = await req.text(); try { payload = JSON.parse(t); } catch { for (const [k, v] of new URLSearchParams(t)) payload[k] = v; } }
  } catch { /* fall through - we may still have the URL params */ }

  const sessionToken = u.searchParams.get("session_token") ||
    (typeof payload["ReturnValue"] === "string" ? (payload["ReturnValue"] as string) : null);
  const lowProfileId = (typeof payload["LowProfileId"] === "string" && payload["LowProfileId"])
    ? (payload["LowProfileId"] as string) : null;
  if (!sessionToken) return json({ error: "no session_token" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: session } = await admin
    .from("publish_checkout_sessions")
    .select("id, user_id, business_id, status, amount_ils, email, external_transaction_id")
    .eq("session_token", sessionToken).maybeSingle();
  if (!session) return json({ error: "session not found" }, 404);
  if (session.status === "completed") return json({ ok: true, duplicate: true });

  const now = new Date().toISOString();
  const userId = session.user_id as string;
  const businessId = session.business_id as string;
  const lpId = lowProfileId || (session.external_transaction_id as string | null);
  if (!lpId) return json({ error: "no LowProfileId" }, 400);

  // VERIFY server-to-server (never trust the webhook body alone).
  const result = await getLpResult(lpId);
  const rd = result.data;
  const charged = result.ok && rd.ResponseCode === 0;
  const token = rd.TokenInfo?.Token || rd.TranzactionInfo?.Token || null;
  const expMonth = rd.TokenInfo?.CardMonth ?? null;
  const expYear = rd.TokenInfo?.CardYear ?? null;
  const approval = rd.TokenInfo?.TokenApprovalNumber ?? rd.TranzactionInfo?.ApprovalNumber ?? null;
  const last4 = rd.TranzactionInfo?.Last4CardDigitsString ?? undefined;
  const ccName = rd.TranzactionInfo?.CardName ?? undefined;
  const chargedAmount = rd.TranzactionInfo?.Amount ?? (Number(session.amount_ils) || 0);
  // The tax-invoice/receipt URL (so the dashboard can list + download it).
  const invoiceUrl = rd.DocumentInfo?.DocumentUrl ?? null;

  const idem = `${sessionToken}:cycle0`;
  const isTest = Deno.env.get("BILLING_TEST_MODE") === "true";

  // Idempotency: a duplicate webhook just re-publishes and returns.
  const { data: prior } = await admin.from("billing_charges").select("status").eq("idempotency_key", idem).maybeSingle();
  if (prior && (prior as { status?: string }).status === "success") {
    await admin.from("businesses").update({ is_published: true, updated_at: now }).eq("id", businessId);
    await admin.from("publish_checkout_sessions").update({ status: "completed", payment_verified_at: now, updated_at: now }).eq("id", session.id);
    return json({ ok: true, duplicate: true, published: true });
  }

  // Charge failed -> do NOT publish. Surface it (the frontend + a failure email).
  if (!charged) {
    await admin.from("billing_charges").insert({
      user_id: userId, business_id: businessId, amount_ils: chargedAmount, status: "failed",
      is_test: isTest, error_code: String(rd.Description || result.error || "declined"), idempotency_key: idem,
      payment_description: "פרסום אתר Siango - חיוב ראשון",
    }).then(() => {}).catch(() => {});
    await admin.from("publish_checkout_sessions").update({ status: "charge_failed", updated_at: now }).eq("id", session.id);
    const to = (session.email as string | null) ?? null;
    if (to) {
      fetch(`${url}/functions/v1/send-platform-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({ type: "publishPaymentFailed", to, ctx: { continueUrl: `https://siango.app/publish-payment?businessId=${businessId}`, recipientEmail: to, lang: "he" } }),
      }).then(() => {}).catch(() => {});
    }
    return json({ ok: false, charged: false, error: rd.Description, published: false }, 200);
  }

  // Store the token (+ expiry) so the monthly cron can charge it via cc token.
  if (token) {
    await admin.from("billing_tokens").insert({
      user_id: userId, provider: "cardcom", cc_token_id: token,
      cc_last4: last4 ?? null, cc_type: ccName ?? null,
      cc_exp_month: expMonth, cc_exp_year: expYear,
    }).then(() => {}).catch(() => {});
  } else {
    console.warn("billing-cardcom-webhook: charge OK but no token returned for", userId);
  }

  await admin.from("billing_charges").insert({
    user_id: userId, business_id: businessId, amount_ils: chargedAmount, status: "success",
    is_test: isTest, confirmation_code: approval, idempotency_key: idem,
    payment_description: "פרסום אתר Siango - חיוב ראשון", invoice_url: invoiceUrl,
  }).then(() => {}).catch(() => {});

  // Anchor monthly billing to today's day-of-month, and set the next charge to the
  // SAME day next month (clamped for short months - e.g. paid on the 31st -> Feb 28).
  const nowD = new Date();
  const anchorDay = nowD.getUTCDate();
  let ny = nowD.getUTCFullYear(), nm = nowD.getUTCMonth() + 1;
  if (nm > 11) { nm = 0; ny++; }
  const dim = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
  const nextChargeMs = Date.UTC(ny, nm, Math.min(anchorDay, dim), 0, 0, 0);
  const nextCharge = new Date(nextChargeMs).toISOString();
  const paidUntil = new Date(nextChargeMs + 2 * 864e5).toISOString();
  try {
    await admin.from("subscriptions").upsert({
      user_id: userId, status: "active", billing_provider: "cardcom_token",
      cc_token_id: token ?? null,
      paid_until: paidUntil, next_charge_at: token ? nextCharge : null,
      billing_cycle_count: 1, last_charge_status: "success", billing_anchor_day: anchorDay,
      cancel_type: null, cancel_at: null, updated_at: now,
    }, { onConflict: "user_id" });
  } catch (e) { console.warn("cardcom webhook: subscription activation failed (non-fatal):", e); }

  // Redeem the coupon (best effort - must never block publish/emails).
  try {
    const { data: sub } = await admin.from("subscriptions").select("coupon_code").eq("user_id", userId).maybeSingle();
    const code = (sub as { coupon_code?: string })?.coupon_code;
    if (code) {
      const { data: coup } = await admin.from("subscription_coupons").select("id, redeemed_count").ilike("code", code).maybeSingle();
      if (coup) {
        await admin.from("subscription_coupons").update({ redeemed_count: ((coup as { redeemed_count?: number }).redeemed_count ?? 0) + 1 }).eq("id", (coup as { id?: string }).id);
        await admin.from("subscription_coupon_redemptions").upsert(
          { coupon_id: (coup as { id?: string }).id, user_id: userId, business_id: businessId, code },
          { onConflict: "coupon_id,user_id", ignoreDuplicates: true });
      }
    }
  } catch (e) { console.warn("cardcom webhook: coupon redemption failed (non-fatal):", e); }

  // Referral / affiliate link (best effort). If this buyer signed up via someone's
  // link (profiles.referred_by), then on their FIRST paid month we:
  //   (a) grant the REFERRER a free month, and
  //   (b) grant the BUYER a free month too - the automatic affiliate-link discount
  //       ("a free month, subscription only"). Both are free_months_credit consumed
  //       by the monthly cron. Idempotent per referred user via referral_rewards.
  try {
    const { data: me } = await admin.from("profiles").select("referred_by").eq("user_id", userId).maybeSingle();
    const refCode = (me as { referred_by?: string })?.referred_by;
    if (refCode) {
      const grantFreeMonth = async (targetUserId: string) => {
        const { data: rs } = await admin.from("subscriptions").select("free_months_credit").eq("user_id", targetUserId).maybeSingle();
        await admin.from("subscriptions").upsert(
          { user_id: targetUserId, free_months_credit: (((rs as { free_months_credit?: number })?.free_months_credit ?? 0) + 1), updated_at: now },
          { onConflict: "user_id" });
      };
      // (a) referrer reward - once per referred buyer.
      const { data: refProf } = await admin.from("profiles").select("user_id").eq("referral_code", refCode).maybeSingle();
      const referrerId = (refProf as { user_id?: string })?.user_id;
      if (referrerId && referrerId !== userId) {
        const { data: reward } = await admin.from("referral_rewards")
          .upsert({ referrer_user_id: referrerId, referred_user_id: userId, reward_type: "free_month" }, { onConflict: "referred_user_id,reward_type", ignoreDuplicates: true })
          .select("id");
        if (reward && reward.length > 0) await grantFreeMonth(referrerId);
      }
      // (b) buyer's automatic free month (affiliate-link discount) - once per buyer.
      const { data: buyerReward } = await admin.from("referral_rewards")
        .upsert({ referrer_user_id: referrerId ?? userId, referred_user_id: userId, reward_type: "buyer_free_month" }, { onConflict: "referred_user_id,reward_type", ignoreDuplicates: true })
        .select("id");
      if (buyerReward && buyerReward.length > 0) await grantFreeMonth(userId);
    }
  } catch (e) { console.warn("cardcom webhook: referral reward failed (non-fatal):", e); }

  // Publish (invoice already issued by Cardcom on the charge).
  await admin.from("businesses").update({ is_published: true, updated_at: now }).eq("id", businessId);
  await admin.from("publish_checkout_sessions").update({ status: "completed", payment_verified_at: now, updated_at: now }).eq("id", session.id);

  // Site-live + payment-receipt emails (best effort).
  const to = (session.email as string | null) ?? null;
  if (to) {
    const { data: bizRow } = await admin.from("businesses").select("name, slug").eq("id", businessId).maybeSingle();
    const businessName = (bizRow as { name?: string })?.name ?? undefined;
    const siteUrl = (bizRow as { slug?: string })?.slug ? `https://siango.app/store/${(bizRow as { slug?: string }).slug}` : "https://siango.app";
    const sendEmail = (type: string, ctx: Record<string, unknown>) =>
      fetch(`${url}/functions/v1/send-platform-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
        body: JSON.stringify({ type, to, ctx }),
      }).then(() => {}).catch(() => {});
    await sendEmail("siteReady", { businessName, siteUrl, recipientEmail: to, lang: "he" });
    if (chargedAmount > 0) await sendEmail("paymentReceipt", { businessName, amountIls: chargedAmount, recipientEmail: to, lang: "he" });
  }

  return json({ ok: true, published: true, tokenSaved: !!token });
});
