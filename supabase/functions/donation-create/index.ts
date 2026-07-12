// Public: start a donation. Creates/updates the donor contact, records a pending
// `transactions` row (kind='donation'), and returns a hosted payment-page link
// from the MERCHANT's own gateway (per-merchant acquiring, same as orders) - the
// money reaches the nonprofit's account, never Siango's. verify_jwt = false.
//
// Recurring: v1 captures the FIRST payment via the hosted page and records
// details.recurring so the merchant + the future recurring engine can see it.
// Auto-renewal (monthly re-charge on the merchant's provider) is a documented
// follow-up - see docs/vertical-deploy-checklist.md. One-time donations are
// fully complete here.
//
// Section 46: details.section46_eligible mirrors businesses.section46_enabled at
// the time of the gift (never assumed - OFF unless the org turned it on).

import { createClient } from "npm:@supabase/supabase-js@2";
import { getProvider } from "../_shared/payments/registry.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface ReqBody {
  businessId: string;
  amount: number;
  recurring?: boolean;
  campaignId?: string;
  pledgeId?: string;   // paying a synagogue aliyah/neder pledge - marked paid on callback
  // idNumber (ת"ז) is required to report to תרומות ישראל for a Section-46 credit;
  // anonymous donors skip it (valid receipt, no credit).
  donor: { name: string; email?: string; phone?: string; idNumber?: string; anonymous?: boolean };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: ReqBody;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const { businessId, campaignId, donor } = body;
  const amount = Math.round(Number(body.amount) * 100) / 100;
  const recurring = !!body.recurring;
  if (!businessId || !donor?.name?.trim() || (!donor.email && !donor.phone) || !(amount > 0)) {
    return json({ error: "businessId, donor (name + email/phone) and a positive amount are required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: business } = await admin
    .from("businesses")
    .select("id, name, slug, payment_enabled, payment_provider, section46_enabled")
    .eq("id", businessId).single();
  if (!business) return json({ error: "Organization not found" }, 404);
  if (!business.payment_enabled) {
    return json({ error: "Online donations are not enabled for this organization" }, 400);
  }

  const provider = getProvider(business.payment_provider);
  if (!provider) return json({ error: `Unsupported payment provider: ${business.payment_provider}` }, 400);

  const { data: creds } = await admin
    .from("payment_credentials")
    .select("api_key, secret_key, page_uid, mode, config")
    .eq("business_id", businessId).eq("provider", provider.id).maybeSingle();
  if (!creds) return json({ error: "Donation payment is not configured" }, 400);

  // Donor contact (dedup identical to contacts-capture / the CRM trigger).
  const dedup = (donor.email || donor.phone || donor.name).trim().toLowerCase();
  const { data: contact, error: cErr } = await admin.from("contacts")
    .upsert({ business_id: businessId, name: donor.name, phone: donor.phone || null,
      email: donor.email || null, source: "donation", dedup_key: dedup },
      { onConflict: "business_id,dedup_key" })
    .select("id").single();
  if (cErr) return json({ error: "Could not save donor", detail: cErr.message }, 500);

  // Section 46 eligibility is captured as-of-now, never assumed.
  const section46 = business.section46_enabled === true;
  const details: Record<string, unknown> = {
    recurring, frequency: recurring ? "monthly" : "once",
    campaign_id: campaignId ?? null, section46_eligible: section46,
    pledge_id: body.pledgeId ?? null,
    donor_name: donor.name, donor_email: donor.email ?? null, donor_phone: donor.phone ?? null,
    // For תרומות ישראל reporting (donation-callback issues the receipt on payment).
    donor_id_number: donor.anonymous ? null : (donor.idNumber ?? null),
    donor_anonymous: !!donor.anonymous,
  };

  // Pending donation transaction. page_request_uid (set below) lets the callback
  // match this row without a dedicated column.
  const { data: txn, error: tErr } = await admin.from("transactions").insert({
    business_id: businessId, contact_id: contact.id, kind: "donation",
    amount, currency: "ILS", status: "pending", source_table: "donations", details,
  }).select("id").single();
  if (tErr || !txn) return json({ error: "Could not create donation", detail: tErr?.message }, 500);

  const siteUrl = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");
  const storeUrl = `${siteUrl}/store/${business.slug}`;
  const label = `תרומה ל${business.name}${campaignId ? "" : ""}${recurring ? " (חודשי)" : ""}`;
  const result = await provider.createPaymentPage(creds, {
    amount, currency: "ILS",
    customer: { name: donor.name, email: donor.email || "", phone: donor.phone },
    items: [{ name: label, quantity: 1, price: amount }],
    successUrl: `${storeUrl}?donation=success&t=${txn.id}`,
    failureUrl: `${storeUrl}?donation=failed&t=${txn.id}`,
    cancelUrl: `${storeUrl}?donation=cancelled&t=${txn.id}`,
    callbackUrl: `${supabaseUrl}/functions/v1/donation-callback?provider=${provider.id}`,
  }, Deno.env);

  if (!result.ok || !result.link) {
    await admin.from("transactions").update({ status: "failed" }).eq("id", txn.id);
    return json({ error: result.error || "Could not create payment page", provider: result.raw }, 502);
  }

  // Stash the gateway tracking id so the callback can resolve this donation.
  await admin.from("transactions").update({
    details: { ...details, page_request_uid: result.pageRequestUid ?? null },
  }).eq("id", txn.id);

  return json({
    ok: true, paymentUrl: result.link, transactionId: txn.id,
    recurringPending: recurring, // auto-renewal is a follow-up; first charge is live
  });
});
