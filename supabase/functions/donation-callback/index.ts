// Generic gateway callback for donations (IPN). Mirrors payments-callback but
// resolves the pending `transactions` row (kind='donation') by the gateway
// tracking id stored in details.page_request_uid, marks it paid, and refreshes
// the campaign's cached totals. verify_jwt = false; authenticated by the
// adapter's signature check against the merchant's own credentials.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getProvider } from "../_shared/payments/registry.ts";
import { createDonationReceipt, allocationNumberFrom } from "../_shared/icount/api.ts";
import { decryptToken } from "../_shared/calendar/crypto.ts";
import { sendLifecycleEmail } from "../_shared/email/lifecycle.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const providerId = new URL(req.url).searchParams.get("provider");
  const provider = getProvider(providerId);
  if (!provider) return json({ error: "Unknown provider" }, 400);

  const raw = await req.text();
  let payload: any;
  try { payload = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400); }

  const parsed = provider.parseCallback(payload);
  if (!parsed.pageRequestUid) return json({ error: "Missing payment reference" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: txn } = await admin.from("transactions")
    .select("id, business_id, status, amount, details")
    .eq("kind", "donation")
    .eq("details->>page_request_uid", parsed.pageRequestUid).maybeSingle();
  if (!txn) return json({ error: "Donation not found" }, 404);

  const { data: creds } = await admin.from("payment_credentials")
    .select("api_key, secret_key, page_uid, mode, config")
    .eq("business_id", txn.business_id).eq("provider", provider.id).maybeSingle();
  if (!creds) return json({ error: "Cannot verify callback" }, 401);

  const valid = await provider.verifyCallbackSignature(creds, raw, req.headers, payload);
  if (!valid) {
    console.error("Donation callback signature invalid", { provider: provider.id, uid: parsed.pageRequestUid });
    return json({ error: "Invalid signature" }, 401);
  }

  if (txn.status === "paid") return json({ ok: true, alreadyPaid: true });

  const now = new Date().toISOString();
  if (parsed.approved) {
    const tolerance = 0.01;
    if (parsed.amount > 0 && Math.abs(parsed.amount - Number(txn.amount)) > tolerance) {
      console.error(`Donation amount mismatch: callback=${parsed.amount} txn=${txn.amount} id=${txn.id}`);
      await admin.from("transactions").update({ status: "amount_mismatch" }).eq("id", txn.id);
      return json({ error: "Amount mismatch" }, 400);
    }
    const paidDetails: Record<string, unknown> = { ...(txn.details ?? {}), transaction_uid: parsed.transactionUid, paid_at: now };

    // תרומות ישראל: issue a donation receipt via the nonprofit's provider, which
    // reports it to the Tax Authority and returns an allocation number. Off unless
    // the nonprofit enabled reporting AND connected a provider. Best-effort - a
    // failure never blocks marking the gift paid (we retry/report separately).
    try {
      const { data: biz } = await admin.from("businesses")
        .select("donation_reporting_enabled, donation_receipt_provider, nonprofit_46_number")
        .eq("id", txn.business_id).maybeSingle();
      if (biz?.donation_reporting_enabled && biz?.donation_receipt_provider && biz.donation_receipt_provider !== "icount") {
        // Record mode (Morning / ריווחית / SUMIT / self): Siango captured the donor
        // ID; the nonprofit issues the allocation-numbered receipt in its own system.
        paidDetails.reporting_mode = "self";
        paidDetails.receipt_provider = biz.donation_receipt_provider;
      } else if (biz?.donation_reporting_enabled && biz?.donation_receipt_provider === "icount") {
        const { data: creds } = await admin.from("donation_receipt_credentials")
          .select("api_token_enc, company_id").eq("business_id", txn.business_id).maybeSingle();
        const d = (txn.details ?? {}) as Record<string, any>;
        if (creds?.api_token_enc && (d.donor_id_number || d.donor_anonymous)) {
          const rec = await createDonationReceipt({
            apiToken: await decryptToken(creds.api_token_enc),
            companyId: creds.company_id ?? undefined,
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
            console.error("donation receipt failed", txn.id, rec.error, rec.data);
          }
        }
      }
    } catch (e) {
      console.error("donation reporting error", txn.id, String(e));
    }

    await admin.from("transactions").update({ status: "paid", details: paidDetails }).eq("id", txn.id);

    // Thank-you email to the donor - a merchant-editable lifecycle email. If an
    // allocation number was issued we mention it (no receipt PDF to keep). Best-effort.
    try {
      const d = (txn.details ?? {}) as Record<string, any>;
      if (d.donor_email && !d.donor_anonymous) {
        const alloc = paidDetails.receipt_allocation_number as string | undefined;
        await sendLifecycleEmail(admin, {
          businessId: txn.business_id, key: "donation_thanks",
          to: d.donor_email, name: d.donor_name || undefined,
          extraHtml: alloc
            ? `<p dir="rtl" style="margin:0 0 14px;font-family:Arial,Tahoma,sans-serif;font-size:14px;color:#1f5c46;text-align:right;">דווח לתרומות ישראל · מספר הקצאה <span dir="ltr">${alloc}</span>. הזיכוי יופיע באזור האישי שלך ברשות המסים - אין צורך לשמור קבלה.</p>`
            : undefined,
        });
      }
    } catch (e) {
      console.warn("donor thank-you email failed:", txn.id, String(e));
    }

    // Synagogue: if this paid a specific aliyah/neder pledge, close that debt.
    const pledgeId = (txn.details as { pledge_id?: string } | null)?.pledge_id;
    if (pledgeId) {
      await admin.from("synagogue_pledges").update({ status: "paid", paid_at: now }).eq("id", pledgeId);
    }

    // Refresh the campaign's cached raised/backers totals, if this gift targeted one.
    const campaignId = (txn.details as { campaign_id?: string } | null)?.campaign_id;
    if (campaignId) {
      await admin.rpc("refresh_donation_campaign", { p_campaign_id: campaignId });
    }
  } else {
    await admin.from("transactions").update({ status: "failed" }).eq("id", txn.id);
  }
  return json({ ok: true });
});
