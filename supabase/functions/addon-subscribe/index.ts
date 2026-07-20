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
import { chargeAmount, type CouponInfo } from "../_shared/billing/pricing.ts";
import { cfAddCustomHostname } from "../_shared/domains/cloudflare.ts";

const VAT_RATE = 0.18;
const gross = (net: number) => Math.round(net * (1 + VAT_RATE) * 100) / 100;

// Server-authoritative recurring add-on registry. netIls is PRE-VAT monthly.
// `flag` is a businesses column flipped true once the add-on is active.
// `subFlag` is a subscriptions column flipped true instead, for add-ons whose
// entitlement lives on the subscription row (crm/analytics - see
// useCrmEntitled/useAnalyticsEntitled, and the protect_subscription_billing
// trigger that locks these columns to service-role-only writes).
const ADDONS: Record<string, { netIls: number; description: string; flag?: string; subFlag?: string }> = {
  reviews:       { netIls: 14, description: "ביקורות Google", flag: "reviews_paid" },
  email:         { netIls: 19, description: "מייל עסקי" },
  whatsapp:      { netIls: 89, description: "וואטסאפ עסקי" },
  crm:           { netIls: 49, description: "CRM - ניהול לקוחות", subFlag: "crm_addon_enabled" },
  analytics:     { netIls: 29, description: "אנליטיקה", subFlag: "analytics_addon_enabled" },
  custom_domain: { netIls: 15, description: "דומיין אישי (חיבור דומיין קיים)" },
};

// custom_domain is the only addon that needs an extra client-supplied value
// (the domain to connect) and a side effect beyond flipping a flag - see
// grantCustomDomain below.
const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;

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

  let body: { addon?: string; businessId?: string; couponCode?: string; domain?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }

  const addon = body.addon ? ADDONS[body.addon] : undefined;
  const addonType = body.addon || "";
  if (!addon) return json({ ok: false, error: "unknown addon" }, 400);
  const businessId = (body.businessId || "").trim();
  if (!businessId) return json({ ok: false, error: "businessId required" }, 400);

  const admin = createClient(url, service);

  // Ownership.
  const { data: prof } = await admin.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
  const { data: biz } = await admin.from("businesses").select("id, owner_id, slug").eq("id", businessId).maybeSingle();
  if (!biz || !prof || (biz as { owner_id?: string }).owner_id !== (prof as { id?: string }).id) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  // custom_domain needs a valid, not-already-claimed domain BEFORE we charge -
  // never take money for something we can't deliver.
  const domainInput = (body.domain || "").trim().toLowerCase();
  if (addonType === "custom_domain") {
    if (!domainInput || !domainRegex.test(domainInput)) {
      return json({ ok: false, error: "יש להזין דומיין תקין (למשל shop.co.il)" }, 400);
    }
    const { data: existingDomain } = await admin.from("domains").select("business_id").ilike("domain", domainInput).maybeSingle();
    if (existingDomain && (existingDomain as { business_id?: string }).business_id !== businessId) {
      return json({ ok: false, error: "הדומיין הזה כבר מחובר לחנות אחרת." }, 409);
    }
  }

  // Already active? no-op (idempotent).
  const { data: existingAddon } = await admin.from("subscription_addons")
    .select("id, active").eq("business_id", businessId).eq("addon_type", addonType).maybeSingle();
  if (existingAddon && (existingAddon as { active?: boolean }).active) return json({ ok: true, alreadyActive: true });

  // THIS site's active subscription (for the proration window) + saved Cardcom token.
  // Per-site: the add-on attaches to the specific business's subscription.
  const { data: sub } = await admin.from("subscriptions")
    .select("next_charge_at, status").eq("business_id", businessId).maybeSingle();
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

  // Optional coupon: server-validated for THIS add-on (or scope 'all'). A
  // 'first_month' coupon discounts only this prorated charge; the recurring
  // price stays full from next cycle. A 'forever' coupon is persisted onto the
  // subscription_addons row below (see activate()) so billing-charge-run keeps
  // applying it every consolidated monthly charge. chargeAmount only ever
  // REDUCES the amount, and we clamp to >= 1 so Cardcom always sees a real amount.
  let coupon: CouponInfo | null = null;
  let couponCode: string | null = null;
  if (body.couponCode?.trim()) {
    const code = body.couponCode.trim();
    const { data: v } = await admin.rpc("validate_subscription_coupon", { p_code: code, p_product: addonType });
    const row = Array.isArray(v) ? v[0] : v;
    if (row?.valid) {
      coupon = { discount_type: row.discount_type, discount_value: Number(row.discount_value), duration: row.duration };
      couponCode = code;
    }
  }
  const chargeGross = Math.max(1, chargeAmount(proratedGross, coupon, 0));

  const idem = `addon-sub:${businessId}:${addonType}:${new Date(nextChargeAt).toISOString().slice(0, 10)}`;
  const isTest = Deno.env.get("BILLING_TEST_MODE") === "true";
  const { data: existingCharge } = await admin.from("billing_charges").select("status").eq("idempotency_key", idem).maybeSingle();
  const existingStatus = (existingCharge as { status?: string } | null)?.status;
  const cnameTarget = addonType === "custom_domain" ? `${(biz as { slug?: string }).slug}.siango.app` : undefined;

  if (existingStatus === "success") {
    // Charge already happened; just ensure the add-on + flag are active.
    try {
      await activate(admin, { user, businessId, addonType, addon, monthGross, domain: domainInput, coupon, couponCode });
    } catch (e) {
      console.error("addon-subscribe: activate() failed AFTER a prior confirmed charge - business", businessId, "addon", addonType, e);
      return json({ ok: false, error: "התשלום כבר בוצע אך הפעלת התוסף נכשלה. פנו לתמיכה.", chargedButNotActivated: true });
    }
    return json({ ok: true, alreadyCharged: true, cnameTarget });
  }

  const chargeRow = {
    user_id: user.id, business_id: businessId, amount_ils: chargeGross, status: "pending",
    is_test: isTest, idempotency_key: idem, coupon_code: couponCode, error_code: null,
    payment_description: `${addon.description} - חלק יחסי (${daysLeft} ימים)`,
  };
  if (existingCharge) {
    // A prior attempt left a pending/failed row for the SAME idem key (e.g. the
    // merchant double-clicked, or a previous run crashed before completing).
    // Re-use it and retry instead of hard-failing with a 409 the user can never
    // recover from. The token charge below sends the same externalUniqId, so
    // Cardcom itself de-dupes - a genuinely-completed charge can't double.
    await admin.from("billing_charges").update(chargeRow).eq("idempotency_key", idem);
  } else {
    const { error: insErr } = await admin.from("billing_charges").insert(chargeRow);
    if (insErr) return json({ ok: false, error: "לא הצלחנו לפתוח חיוב כרגע. נסו שוב עוד רגע." }, 409);
  }

  const res = await chargeToken({
    token: ccTokenId, expMMYY: toMMYY(expMonth, expYear), amountIls: chargeGross, externalUniqId: idem,
    doc: {
      docType: "TaxInvoiceAndReceipt", email, sendByEmail: true, vatFree: false,
      products: [{ description: `${addon.description} - חלק יחסי (${daysLeft} ימים)`, quantity: 1, unitCost: chargeGross }],
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
  // Money has already moved at this point, so a failure here must be loud and
  // recoverable, not silently swallowed - the merchant paid for something that
  // didn't turn on.
  try {
    await activate(admin, { user, businessId, addonType, addon, monthGross, domain: domainInput, coupon, couponCode });
  } catch (e) {
    console.error("addon-subscribe: activate() failed AFTER a successful charge - business", businessId, "addon", addonType, "idem", idem, e);
    return json({ ok: false, error: "התשלום בוצע אך הפעלת התוסף נכשלה. פנו לתמיכה ונציין את מספר האישור " + (confirmation ?? idem) + ".", chargedButNotActivated: true, proratedIls: chargeGross, invoiceUrl });
  }

  return json({ ok: true, proratedIls: chargeGross, monthlyIls: monthGross, invoiceUrl, couponApplied: !!coupon, cnameTarget });
});

// deno-lint-ignore no-explicit-any
async function activate(admin: any, o: { user: { id: string }; businessId: string; addonType: string; addon: { description: string; flag?: string; subFlag?: string }; monthGross: number; domain?: string; coupon?: CouponInfo | null; couponCode?: string | null }) {
  const now = new Date().toISOString();
  // Persist the coupon only when it must keep applying every future cycle -
  // billing-charge-run re-derives the monthly charge from these columns.
  const persistCoupon = o.coupon?.duration === "forever";
  if (o.addonType === "custom_domain" && o.domain) {
    // Connect the merchant's OWN domain (bought elsewhere) to Cloudflare, same
    // engine as purchased domains - the only difference is WE never touch their
    // DNS, so the customer still has to add one CNAME record themselves.
    // Best-effort: dormant until Cloudflare secrets are set, never blocks the
    // charge that already succeeded.
    let cfHostnameId: string | null = null;
    let cfSslStatus: string | null = null;
    try {
      const cf = await cfAddCustomHostname(o.domain);
      if (cf.configured && cf.ok && cf.data) { cfHostnameId = cf.data.id; cfSslStatus = cf.data.sslStatus; }
    } catch (e) { console.error("custom_domain: cloudflare hostname failed (charge succeeded!)", o.domain, e); }
    await admin.from("domains").upsert({
      business_id: o.businessId, domain: o.domain, status: "active", source: "byod",
      registered_at: now, cf_hostname_id: cfHostnameId, cf_ssl_status: cfSslStatus,
      cf_checked_at: cfHostnameId ? now : null,
    }, { onConflict: "domain" });
  }
  await admin.from("subscription_addons").upsert({
    user_id: o.user.id, business_id: o.businessId, addon_type: o.addonType,
    description: o.addon.description, price_ils: o.monthGross, active: true,
    cancelled_at: null, updated_at: now,
    coupon_code: persistCoupon ? o.couponCode : null,
    coupon_discount_type: persistCoupon ? o.coupon!.discount_type : null,
    coupon_discount_value: persistCoupon ? o.coupon!.discount_value : null,
    coupon_duration: persistCoupon ? o.coupon!.duration : null,
  }, { onConflict: "business_id,addon_type" });
  if (o.addon.flag) {
    await admin.from("businesses").update({ [o.addon.flag]: true, updated_at: now }).eq("id", o.businessId);
  }
  if (o.addon.subFlag) {
    await admin.from("subscriptions").update({ [o.addon.subFlag]: true, updated_at: now }).eq("business_id", o.businessId);
  }
}
