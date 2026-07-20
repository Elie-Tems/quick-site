// Admin-only refund of a subscription/publish charge (Siango -> shop owner).
// Two gates before any money moves:
//   gate 1 (client): the admin types the exact refund amount to confirm.
//   gate 2 (here):   a 6-digit OTP emailed to the acting admin's inbox.
// Flow: step="request_otp" validates + emails the code; step="confirm" verifies the
// code and THEN calls the gateway (Cardcom RefundByTransactionId / iCount cc/refund).
// Supports full OR partial (free-amount) refunds, guarded against over-refunding.

import { createClient } from "npm:@supabase/supabase-js@2";
import { refundCharge } from "../_shared/icount/api.ts";
import { refundByTransactionId } from "../_shared/cardcom/api.ts";
import { sendViaResend } from "../_shared/email/resend.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function sixDigitCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return String(n).padStart(6, "0");
}
function maskEmail(e: string): string {
  const [u, d] = e.split("@");
  if (!d) return e;
  return `${u.slice(0, 1)}${"*".repeat(Math.max(1, u.length - 1))}@${d}`;
}
const round2 = (n: number) => Math.round(n * 100) / 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "invalid session" }, 401);

  // Admin gate: the caller must have the 'admin' role.
  const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (isAdmin !== true) return json({ error: "forbidden" }, 403);

  let body: { step?: string; chargeId?: string; amount?: number; transactionId?: string; code?: string };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  const step = body.step === "confirm" ? "confirm" : "request_otp";
  if (!body.chargeId) return json({ error: "chargeId required" }, 400);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: charge } = await admin
    .from("billing_charges")
    .select("id, user_id, subscription_id, business_id, amount_ils, status, confirmation_code, provider_transaction_id, refunded_amount")
    .eq("id", body.chargeId).maybeSingle();
  if (!charge) return json({ error: "charge not found" }, 404);
  const c = charge as Record<string, any>;
  if (c.status !== "success") return json({ error: "רק חיוב מוצלח ניתן לזיכוי" }, 400);

  // Provider: charges taken via Cardcom refund through Cardcom; else iCount. Per-site:
  // look up THIS charge's site subscription (an account can own several); fall back to
  // the user's most recent so a null business_id charge still resolves (no maybeSingle
  // throw on multiple rows).
  let subQ = admin.from("subscriptions").select("billing_provider").eq("user_id", c.user_id);
  subQ = c.business_id ? subQ.eq("business_id", c.business_id) : subQ.order("created_at", { ascending: false });
  const { data: subRow } = await subQ.limit(1).maybeSingle();
  const provider = String((subRow as { billing_provider?: string } | null)?.billing_provider || "");
  const isCardcom = provider.startsWith("cardcom");

  // Amount math: never refund more than what's left on the charge.
  const already = Number(c.refunded_amount || 0);
  const remaining = round2(Number(c.amount_ils) - already);
  if (remaining <= 0) return json({ error: "החיוב כבר זוכה במלואו" }, 400);
  const reqAmount = body.amount != null ? round2(Number(body.amount)) : remaining;
  if (!(reqAmount > 0) || reqAmount > remaining) {
    return json({ error: `סכום הזיכוי חייב להיות בין 0 ל-${remaining} ₪` }, 400);
  }
  const isPartial = reqAmount < remaining || already > 0;

  // The transaction id to refund (Cardcom): stored on the charge, or entered manually
  // for older charges taken before we started saving it.
  const txId = (body.transactionId && String(body.transactionId).trim()) || c.provider_transaction_id || null;

  // ── GATE 2, part A: generate + email the OTP ──
  if (step === "request_otp") {
    if (isCardcom && !txId) {
      return json({ error: "no_transaction_id", message: "לחיוב הזה לא שמור מזהה עסקה (TranzactionId). מצאו אותו בפאנל Cardcom (עסקאות) והזינו ידנית." }, 400);
    }
    const code = sixDigitCode();
    const codeHash = await sha256Hex(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min
    await admin.from("admin_refund_otps").insert({
      admin_user_id: user.id, charge_id: c.id, amount_ils: reqAmount,
      transaction_id: txId, code_hash: codeHash, expires_at: expiresAt,
    });
    const to = user.email;
    if (!to) return json({ error: "לחשבון האדמין אין אימייל לשליחת קוד" }, 400);
    const send = await sendViaResend({
      to,
      subject: `קוד אישור לזיכוי ${reqAmount} ₪ - סיאנגו`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;color:#111">
        <p>קוד האישור לביצוע זיכוי בסך <b>${reqAmount} ₪</b> (חיוב ${c.id}):</p>
        <p style="font-size:30px;font-weight:800;letter-spacing:6px;margin:12px 0">${code}</p>
        <p style="color:#666">הקוד תקף ל-10 דקות. אם לא ביקשת זיכוי - התעלם מהודעה זו.</p>
      </div>`,
    });
    if (!send.ok) return json({ error: "לא הצלחנו לשלוח את קוד האישור למייל", detail: send.error }, 502);
    return json({ ok: true, otp_sent: true, to: maskEmail(to), amount: reqAmount, partial: isPartial });
  }

  // ── GATE 2, part B: verify the OTP, then refund ──
  if (!body.code || !/^\d{6}$/.test(body.code)) return json({ error: "קוד אישור לא תקין" }, 400);
  const { data: otpRow } = await admin.from("admin_refund_otps")
    .select("id, code_hash, amount_ils, transaction_id, attempts, expires_at, consumed_at")
    .eq("admin_user_id", user.id).eq("charge_id", c.id).is("consumed_at", null)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  const o = otpRow as Record<string, any> | null;
  if (!o) return json({ error: "לא נמצא קוד פעיל - בקשו קוד חדש" }, 400);
  if (new Date(o.expires_at) < new Date()) return json({ error: "הקוד פג תוקף - בקשו קוד חדש" }, 400);
  if (Number(o.attempts) >= 5) return json({ error: "יותר מדי נסיונות - בקשו קוד חדש" }, 429);
  const inputHash = await sha256Hex(body.code);
  if (inputHash !== o.code_hash) {
    await admin.from("admin_refund_otps").update({ attempts: Number(o.attempts) + 1 }).eq("id", o.id);
    return json({ error: "קוד שגוי" }, 400);
  }
  // Use the amount/txId locked in when the code was issued (can't be changed after).
  const amount = round2(Number(o.amount_ils));
  const useTxId = o.transaction_id || txId;

  // Atomically consume the OTP BEFORE charging so a double-submit can't double-refund
  // with the SAME code. This alone doesn't stop two DIFFERENT valid OTPs issued for
  // the same charge (e.g. the admin requested a code twice) from both passing the
  // amount check below, since each request read refunded_amount independently -
  // the compare-and-set right before the gateway call closes that gap.
  const { data: claimed } = await admin.from("admin_refund_otps")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", o.id).is("consumed_at", null).select("id");
  if (!claimed || !claimed.length) return json({ error: "הקוד כבר נוצל" }, 409);

  // Re-read the charge's CURRENT refunded_amount (may have moved since this request
  // started) and reserve this refund atomically: the update only succeeds if
  // refunded_amount still matches what we just read. A second concurrent refund
  // request (different OTP, same charge) loses this race and is rejected before
  // any money moves at the gateway.
  const { data: fresh } = await admin.from("billing_charges").select("refunded_amount, amount_ils").eq("id", c.id).maybeSingle();
  const freshAlready = round2(Number((fresh as { refunded_amount?: number } | null)?.refunded_amount || 0));
  const freshRemaining = round2(Number((fresh as { amount_ils?: number } | null)?.amount_ils ?? c.amount_ils) - freshAlready);
  if (amount > freshRemaining) return json({ error: "הסכום כבר עודכן מאז שהוזן הקוד - רעננו ונסו שוב" }, 409);
  const newRefunded = round2(freshAlready + amount);
  const fully = newRefunded >= round2(Number(c.amount_ils));
  const { data: reserved } = await admin.from("billing_charges")
    .update({ refunded_amount: newRefunded, ...(fully ? { status: "refunded" } : {}) })
    .eq("id", c.id).eq("refunded_amount", freshAlready).select("id");
  if (!reserved || !reserved.length) return json({ error: "זיכוי כפול נחסם - הסכום כבר עודכן. רעננו ונסו שוב." }, 409);

  // Execute the refund at the gateway. If it fails, roll back the reservation so
  // the charge doesn't show as (partially) refunded when no money actually moved.
  let newTxId: string | null = null;
  try {
    if (isCardcom) {
      if (!useTxId) throw { rollbackError: "no_transaction_id" };
      const partial = amount < freshRemaining ? amount : undefined; // omit for a full refund
      const res = await refundByTransactionId({ transactionId: useTxId, partialSum: partial });
      if (!res.ok) throw { rollbackError: "cardcom_refund_failed", detail: res.error || res.data };
      newTxId = (res.data as { NewTranzactionId?: number })?.NewTranzactionId != null
        ? String((res.data as { NewTranzactionId?: number }).NewTranzactionId) : null;
    } else {
      const res = await refundCharge({ confirmation_code: c.confirmation_code, sum: amount });
      if (!res.ok) throw { rollbackError: "icount_refund_failed", detail: res.error || res.data };
    }
  } catch (e) {
    await admin.from("billing_charges").update({ refunded_amount: freshAlready, status: c.status }).eq("id", c.id);
    const err = e as { rollbackError?: string; detail?: unknown };
    if (err?.rollbackError) return json({ error: err.rollbackError, detail: err.detail }, err.rollbackError === "no_transaction_id" ? 400 : 502);
    throw e;
  }

  // Audit row. This is a record-keeping insert AFTER the gateway refund already
  // succeeded and refunded_amount is already reserved - log loudly on failure
  // instead of silently losing the audit trail of a real refund.
  const { error: auditErr } = await admin.from("billing_charges").insert({
    user_id: c.user_id, subscription_id: c.subscription_id, business_id: c.business_id,
    amount_ils: -Math.abs(amount), status: "refunded",
    payment_description: `זיכוי ${fully ? "מלא" : "חלקי"} (ע"י אדמין) לחיוב ${c.id}`,
    provider_transaction_id: newTxId,
    idempotency_key: `refund:${c.id}:${o.id}`,
  });
  if (auditErr) console.error("billing-refund: audit row insert FAILED after a real gateway refund - charge", c.id, "amount", amount, "error", auditErr);

  return json({ ok: true, refundedChargeId: c.id, amount, fullyRefunded: fully, newTransactionId: newTxId });
});
