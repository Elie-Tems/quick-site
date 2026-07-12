// Enable a RECURRING add-on (Google Reviews, business email, WhatsApp...) as a
// line-item on the merchant's publish subscription. Charges a PRORATED first amount
// on the ALREADY-SAVED Cardcom token (days left until the next subscription charge),
// issuing its own invoice; from the next cycle the add-on is billed together with
// the base in ONE consolidated invoice (see billing-charge-run). Server-authoritative
// pricing, idempotent, activates the feature flag only after a confirmed charge.
//
// verify_jwt=true: only the authenticated merchant can enable an add-on on their own
// subscription, on their own saved card.

import { createClient } from "npm:@supabase/supabase-js@2";
import { chargeToken, toMMYY } from "../_shared/cardcom/api.ts";

const VAT_RATE = 0.18;
const gross = (net: number) => Math.round(net * (1 + VAT_RATE) * 100) / 100;

// Server-authoritative recurring add-on registry. netIls is PRE-VAT monthly.
// `flag` is a businesses column flipped true once the add-on is active.
// `subFlag` is a subscriptions column flipped true instead, for add-ons whose
// entitlement lives on the subscription row (crm/analytics - see
// useCrmEntitled/useAnalyticsEntitled, and the protect_subscription_billing
// trigger that locks these columns to service-role-only writes).
const ADDONS: Record<string, { netIls: number; description: string; flag?: string; subFlag?: string }> = {
  reviews:   { netIls: 14, description: "ביקורות Google", flag: "reviews_paid" },
  email:     { netIls: 19, description: "מייל עסקי" },
  whatsapp:  { netIls: 89, description: "וואטסאפ עסקי" },
  crm:       { netIls: 49, description: "CRM - ניהול לקוחות", subFlag: "crm_addon_enabled" },
  analytics: { netIls: 29, description: "אנליטיקה", subFlag: "analytics_addon_enabled" },
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: uErr } = await userClient.auth.getUser();
  if (uErr || !user) return json({ ok: false, error: "invalid session" }, 401);

  let body: { addon?: string; businessId?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }

  const addon = body.addon ? ADDONS[body.addon] : undefined;
  const addonType = body.addon || "";
  if (!addon) return json({ ok: false, error: "unknown addon" }, 400);
  const businessId = (body.businessId || "").trim();
  if (!businessId) return json({ ok: false, error: "businessId required" }, 400);

  const admin = createClient(url, service);

  // Ownership.
  const { data: prof } = await admin.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
  const { data: biz } = await admin.from("businesses").select("id, owner_id").eq("id", businessId).maybeSingle();
  if (!biz || !prof || (biz as { owner_id?: string }).owner_id !== (prof as { id?: string }).id) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  // Already active? no-op (idempotent).
  const { data: existingAddon } = await admin.from("subscription_addons")
    .select("id, active").eq("user_id", user.id).eq("addon_type", addonType).maybeSingle();
  if (existingAddon && (existingAddon as { active?: boolean }).active) return json({ ok: true, alreadyActive: true });

  // The merchant's active subscription (for the proration window) + saved Cardcom token.
  const { data: sub } = await admin.from("subscriptions")
    .select("next_charge_at, status").eq("user_id", user.id).maybeSingle();
  const nextChargeAt = (sub as { next_charge_at?: string } | null)?.next_charge_at;
  if (!sub || (sub as { status?: string }).status !== "active" || !nextChargeAt) {
    return json({ ok: false, needsSubscription: true, message: "צריך מנוי פרסום פעיל כדי להוסיף תוספת." });
  }

  const { data: tok } = await admin.from("billing_tokens")
    .select("cc_token_id, cc_exp_month, cc_exp_year").eq("user_id", user.id).eq("provider", "cardcom")
    .not("cc_token_id", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const ccTokenId = (tok as { cc_token_id?: string } | null)?.cc_token_id;
  const expMonth = (tok as { cc_exp_month?: number } | null)?.cc_exp_month;
  const expYear = (tok as { cc_exp_year?: number } | null)?.cc_exp_year;
  if (!ccTokenId || !expMonth || !expYear) {
    return json({ ok: false, needsCard: true, message: "אין כרטיס שמור. יש לפרסם אתר תחילה." });
  }

  const { data: u } = await admin.auth.admin.getUserById(user.id);
  const email = u?.user?.email ?? undefined;

  // Prorate: days left until the next subscription charge / 30, min 1 day so the
  // token charge is never ₪0 (Cardcom needs a real amount). Rounded to agorot.
  const monthGross = gross(addon.netIls);
  const nowMs = Date.now();
  const daysLeft = Math.max(1, Math.min(30, Math.ceil((new Date(nextChargeAt).getTime() - nowMs) / 864e5)));
  const proratedGross = Math.max(1, Math.round(monthGross * (daysLeft / 30) * 100) / 100);

  const idem = `addon-sub:${user.id}:${addonType}:${new Date(nextChargeAt).toISOString().slice(0, 10)}`;
  const isTest = Deno.env.get("BILLING_TEST_MODE") === "true";
  const { data: existingCharge } = await admin.from("billing_charges").select("status").eq("idempotency_key", idem).maybeSingle();
  if (existingCharge && (existingCharge as { status?: string }).status === "success") {
    // Charge already happened; just ensure the add-on + flag are active.
    await activate(admin, { user, businessId, addonType, addon, monthGross });
    return json({ ok: true, alreadyCharged: true });
  }

  const { error: insErr } = await admin.from("billing_charges").insert({
    user_id: user.id, business_id: businessId, amount_ils: proratedGross, status: "pending",
    is_test: isTest, idempotency_key: idem, payment_description: `${addon.description} - חלק יחסי (${daysLeft} ימים)`,
  });
  if (insErr) return json({ ok: false, error: "duplicate in flight" }, 409);

  const res = await chargeToken({
    token: ccTokenId, expMMYY: toMMYY(expMonth, expYear), amountIls: proratedGross, externalUniqId: idem,
    doc: {
      docType: "TaxInvoiceAndReceipt", email, sendByEmail: true, vatFree: false,
      products: [{ description: `${addon.description} - חלק יחסי (${daysLeft} ימים)`, quantity: 1, unitCost: proratedGross }],
    },
  });
  if (!res.ok) {
    const errCode = res.error || (res.data as { Description?: string })?.Description || "declined";
    await admin.from("billing_charges").update({ status: "failed", error_code: String(errCode) }).eq("idempotency_key", idem);
    return json({ ok: false, declined: true, error: "התשלום נדחה. בדקו את הכרטיס ונסו שוב." });
  }

  const confirmation = (res.data as { ApprovalNumber?: string }).ApprovalNumber ?? null;
  const invoiceUrl = (res.data as { DocumentUrl?: string; DocumentInfo?: { DocumentUrl?: string } })?.DocumentUrl
    ?? (res.data as { DocumentInfo?: { DocumentUrl?: string } })?.DocumentInfo?.DocumentUrl ?? null;
  await admin.from("billing_charges").update({ status: "success", confirmation_code: confirmation, invoice_url: invoiceUrl }).eq("idempotency_key", idem);

  // Activate the add-on line + its feature flag ONLY after a confirmed charge.
  await activate(admin, { user, businessId, addonType, addon, monthGross });

  return json({ ok: true, proratedIls: proratedGross, monthlyIls: monthGross, invoiceUrl });
});

// deno-lint-ignore no-explicit-any
async function activate(admin: any, o: { user: { id: string }; businessId: string; addonType: string; addon: { description: string; flag?: string; subFlag?: string }; monthGross: number }) {
  const now = new Date().toISOString();
  await admin.from("subscription_addons").upsert({
    user_id: o.user.id, business_id: o.businessId, addon_type: o.addonType,
    description: o.addon.description, price_ils: o.monthGross, active: true,
    cancelled_at: null, updated_at: now,
  }, { onConflict: "user_id,addon_type" });
  if (o.addon.flag) {
    await admin.from("businesses").update({ [o.addon.flag]: true, updated_at: now }).eq("id", o.businessId);
  }
  if (o.addon.subFlag) {
    await admin.from("subscriptions").update({ [o.addon.subFlag]: true, updated_at: now }).eq("user_id", o.user.id);
  }
}
