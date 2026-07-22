// Nedarim Plus (נדרים פלוס) server-to-server CallBack (IPN) for donations.
//
// Nedarim is an iframe gateway: the storefront charges via postMessage and the
// browser result is NOT trustworthy. THIS is the authoritative "paid" signal -
// Nedarim POSTs it from their own servers on a successful charge. We authenticate
// it by: (1) source IP in their published range, (2) our unguessable single-use
// token echoed in Param1, (3) amount match. Then we mark the donation paid and run
// the exact same tail as donation-callback (receipt + thank-you + pledge + campaign).
// verify_jwt = false (Nedarim can't send a Supabase JWT).

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  parseNedarimCallback, callerIp, NEDARIM_CALLBACK_IPS,
} from "../_shared/payments/nedarimplus.ts";
import { createDonationReceipt, allocationNumberFrom } from "../_shared/icount/api.ts";
import { decryptToken } from "../_shared/calendar/crypto.ts";
import { sendLifecycleEmail } from "../_shared/email/lifecycle.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // (1) Source-IP gate. Defense in depth alongside the unguessable token below.
  // If the IP is determinable and not Nedarim's, reject. If it can't be read
  // (proxy/edge quirk) we log and continue - the single-use token is the real lock.
  const ip = callerIp(req);
  const ipKnown = ip !== "unknown";
  if (ipKnown && !NEDARIM_CALLBACK_IPS.includes(ip)) {
    console.error("nedarim-webhook: rejected foreign source IP", ip);
    return json({ error: "Forbidden" }, 403);
  }
  if (!ipKnown) console.warn("nedarim-webhook: source IP unavailable - relying on token match");

  // Body is application/json per the docs; fall back to form-encoded defensively.
  const raw = await req.text();
  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = Object.fromEntries(new URLSearchParams(raw));
  }

  const cb = parseNedarimCallback(payload);
  if (!cb.token) return json({ error: "Missing token" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // (2) Match the pending donation by our token (page_request_uid). Single-use.
  const { data: txn } = await admin.from("transactions")
    .select("id, business_id, status, amount, details")
    .eq("kind", "donation")
    .eq("details->>page_request_uid", cb.token).maybeSingle();
  if (!txn) return json({ error: "Donation not found" }, 404);
  if (txn.status === "paid") return json({ ok: true, alreadyPaid: true });

  const now = new Date().toISOString();

  // A CallBack is sent only on success. For a ONE-TIME gift, require a credit
  // confirmation number (a temporary auth with no confirmation isn't a real charge).
  // For a RECURRING setup (הוראת קבע / HK) there is no immediate charge - success is
  // the standing order being created, i.e. a KevaId/transaction id came back.
  const isRecurring = !!(txn.details as { recurring?: boolean } | null)?.recurring;
  const approved = cb.approved && (isRecurring ? cb.transactionId !== null : cb.confirmation !== null);
  if (!approved) {
    await admin.from("transactions").update({ status: "failed" }).eq("id", txn.id);
    return json({ ok: true, approved: false });
  }

  // (3) Amount match when the payload carries it (mosad-level IPN). The per-txn
  // CallBack may omit Amount - then we trust the donor-chosen amount we recorded.
  const tolerance = 0.01;
  if (cb.amount > 0 && Math.abs(cb.amount - Number(txn.amount)) > tolerance) {
    console.error(`nedarim-webhook: amount mismatch cb=${cb.amount} txn=${txn.amount} id=${txn.id}`);
    await admin.from("transactions").update({ status: "amount_mismatch" }).eq("id", txn.id);
    return json({ error: "Amount mismatch" }, 400);
  }

  const paidDetails: Record<string, unknown> = {
    ...(txn.details ?? {}),
    transaction_uid: cb.transactionId,
    keva_id: cb.kevaId,            // standing-order id, for recurring gifts
    confirmation: cb.confirmation,
    last_num: cb.lastNum,
    paid_at: now,
  };

  // תרומות ישראל receipt via the nonprofit's provider (best-effort; never blocks
  // marking paid). Identical policy to donation-callback.
  try {
    const { data: biz } = await admin.from("businesses")
      .select("donation_reporting_enabled, donation_receipt_provider, nonprofit_46_number")
      .eq("id", txn.business_id).maybeSingle();
    if (biz?.donation_reporting_enabled && biz?.donation_receipt_provider && biz.donation_receipt_provider !== "icount") {
      paidDetails.reporting_mode = "self";
      paidDetails.receipt_provider = biz.donation_receipt_provider;
    } else if (biz?.donation_reporting_enabled && biz?.donation_receipt_provider === "icount") {
      const { data: rcreds } = await admin.from("donation_receipt_credentials")
        .select("api_token_enc, company_id").eq("business_id", txn.business_id).maybeSingle();
      const d = (txn.details ?? {}) as Record<string, any>;
      if (rcreds?.api_token_enc && (d.donor_id_number || d.donor_anonymous)) {
        const rec = await createDonationReceipt({
          apiToken: await decryptToken(rcreds.api_token_enc),
          companyId: rcreds.company_id ?? undefined,
          sumIls: Number(txn.amount),
          donorName: d.donor_name || "תורם",
          donorId: d.donor_id_number ?? undefined,
          donorEmail: d.donor_email ?? undefined,
          donorPhone: d.donor_phone ?? undefined,
          isAnonymous: !!d.donor_anonymous,
        });
        if (rec.ok) {
          paidDetails.receipt_allocation_number = allocationNumberFrom(rec.data);
          paidDetails.receipt_doc_url = rec.data.doc_url ?? null;
          paidDetails.reported_to_tax_authority = true;
        } else {
          paidDetails.receipt_error = rec.error || "icount_donation_receipt_failed";
          console.error("nedarim donation receipt failed", txn.id, rec.error);
        }
      }
    }
  } catch (e) {
    console.error("nedarim donation reporting error", txn.id, String(e));
  }

  await admin.from("transactions").update({ status: "paid", details: paidDetails }).eq("id", txn.id);

  // Thank-you email (best-effort).
  try {
    const d = (txn.details ?? {}) as Record<string, any>;
    if (d.donor_email && !d.donor_anonymous) {
      const alloc = paidDetails.receipt_allocation_number as string | undefined;
      const res = await sendLifecycleEmail(admin, {
        businessId: txn.business_id, key: "donation_thanks",
        to: d.donor_email, name: d.donor_name || undefined,
        extraHtml: alloc
          ? `<p dir="rtl" style="margin:0 0 14px;font-family:Arial,Tahoma,sans-serif;font-size:14px;color:#1f5c46;text-align:right;">דווח לתרומות ישראל · מספר הקצאה <span dir="ltr">${alloc}</span>. הזיכוי יופיע באזור האישי שלך ברשות המסים - אין צורך לשמור קבלה.</p>`
          : undefined,
      });
      if (!res.ok) console.error("nedarim donor thank-you email failed - txn", txn.id, res.error);
    }
  } catch (e) {
    console.warn("nedarim donor thank-you email failed:", txn.id, String(e));
  }

  // Synagogue: close the aliyah/neder pledge this gift paid.
  const pledgeId = (txn.details as { pledge_id?: string } | null)?.pledge_id;
  if (pledgeId) {
    await admin.from("synagogue_pledges").update({ status: "paid", paid_at: now }).eq("id", pledgeId);
  }

  // Refresh the campaign's cached totals, if targeted.
  const campaignId = (txn.details as { campaign_id?: string } | null)?.campaign_id;
  if (campaignId) {
    await admin.rpc("refresh_donation_campaign", { p_campaign_id: campaignId });
  }

  return json({ ok: true });
});
