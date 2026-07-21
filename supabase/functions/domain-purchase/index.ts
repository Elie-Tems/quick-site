// Domain buy flow (payment-first, Cardcom token). The customer fills the
// registrant details + consent and clicks buy; this function:
//   1. authenticates the user and verifies they own the business,
//   2. re-checks availability + price at Openprovider SERVER-SIDE (never trust
//      the client's price),
//   3. records a pending order in domain_orders with the registrant + consent,
//   4. charges the merchant's ALREADY-SAVED Cardcom token for the price, issuing a
//      tax invoice in the same call (no hosted page / redirect), and only THEN
//   5. registers the domain (registerPaidDomainOrder) - so reseller balance is
//      never spent before we're paid.
// Requires a saved card (captured on the publish subscription); returns
// { needsCard:true } if the merchant has none yet.
import { createClient } from "npm:@supabase/supabase-js@2";
import { opCheckOne } from "../_shared/domains/openprovider.ts";
import { priceDomain } from "../_shared/domains/pricing.ts";
import { chargeToken, toMMYY } from "../_shared/cardcom/api.ts";
import { registerPaidDomainOrder } from "../_shared/domains/register.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Domain prices (priced.customerIls) are PRE-VAT, same convention as addon-subscribe.
// We charge gross = net * 1.18 and issue the invoice on the gross (vatFree:false).
const VAT_RATE = 0.18;
const gross = (net: number) => Math.round(net * (1 + VAT_RATE) * 100) / 100;

// TLDs we register through Openprovider. .co.il is intentionally excluded here
// (Openprovider is expensive for it - it gets a cheaper Israeli registrar later).
const ALLOWED_EXT = new Set(["com", "co", "net", "online", "shop", "store", "biz", "info"]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json({ ok: false, error: "Invalid session" }, 401);

  let body: {
    businessId?: string;
    domain?: string;
    autoRenew?: boolean;
    registrant?: { name?: string; email?: string; phone?: string; address?: string; city?: string; zip?: string };
    consentVersion?: string;
  };
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

  const businessId = body.businessId?.trim();
  const reg = body.registrant || {};
  if (!businessId) return json({ ok: false, error: "businessId required" }, 400);

  // Parse + validate the requested domain.
  const raw = String(body.domain || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const dot = raw.indexOf(".");
  if (dot < 1) return json({ ok: false, error: "שם דומיין לא תקין" }, 400);
  const name = raw.slice(0, dot);
  const extension = raw.slice(dot + 1);
  if (!/^[a-z0-9-]{1,63}$/.test(name)) return json({ ok: false, error: "שם דומיין לא תקין" }, 400);
  if (!ALLOWED_EXT.has(extension)) return json({ ok: false, error: `הסיומת .${extension} לא זמינה לרכישה אונליין כרגע` }, 400);

  // Registrant + consent are legally required (the domain is on the customer's name).
  const required = ["name", "email", "phone", "address", "city", "zip"] as const;
  for (const f of required) {
    if (!String((reg as Record<string, string>)[f] || "").trim()) {
      return json({ ok: false, error: "חסרים פרטי בעל הדומיין" }, 400);
    }
  }
  if (!body.consentVersion) return json({ ok: false, error: "נדרש אישור התנאים" }, 400);

  const admin = createClient(supabaseUrl, serviceKey);

  // Verify the caller owns this business (business.owner_id -> profiles.id -> user_id).
  const { data: biz } = await admin
    .from("businesses")
    .select("id, owner_id")
    .eq("id", businessId)
    .maybeSingle();
  if (!biz) return json({ ok: false, error: "Forbidden" }, 403);
  const { data: prof } = await admin
    .from("profiles")
    .select("user_id")
    .eq("id", biz.owner_id)
    .maybeSingle();
  if (!prof || prof.user_id !== user.id) return json({ ok: false, error: "Forbidden" }, 403);

  // Re-check availability + reseller cost at Openprovider (source of truth).
  const check = await opCheckOne(name, extension);
  if (!check.ok || !check.data) return json({ ok: false, error: "לא הצלחנו לבדוק את הדומיין כרגע, נסו שוב" }, 502);
  if (!check.data.available) return json({ ok: false, error: "הדומיין כבר תפוס" }, 409);
  if (check.data.costUsd == null) return json({ ok: false, error: "אין מחיר זמין לדומיין הזה" }, 502);

  // Authoritative price from admin settings.
  const { data: cfg } = await admin
    .from("domain_settings")
    .select("margin_percent, coupon_percent, usd_to_ils, max_price_ils")
    .eq("id", 1)
    .maybeSingle();
  const priced = priceDomain(check.data.costUsd, cfg || {});

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const domainFull = `${name}.${extension}`;

  // Idempotency: reuse an existing pending/failed order for the SAME
  // business+domain instead of always inserting a new one. Without this, a
  // double-click or client retry creates a fresh order each time, and since
  // the Cardcom idempotency key below is derived from the order's own id
  // (domain:${order.id}), each attempt gets a DIFFERENT key - Cardcom's own
  // dedup never catches it, so the merchant's card can be charged twice for
  // one domain. "paid"/"registered" orders are never reused - that domain is
  // already bought.
  const { data: existingOrder } = await admin
    .from("domain_orders")
    .select("id")
    .eq("business_id", businessId)
    .eq("domain", domainFull)
    .in("status", ["pending", "failed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const orderRow = {
    business_id: businessId,
    user_id: user.id,
    domain: domainFull,
    extension,
    price_ils: priced.customerIls,
    cost_usd: check.data.costUsd,
    status: "pending",
    auto_renew: body.autoRenew !== false,
    reg_name: reg.name,
    reg_email: reg.email,
    reg_phone: reg.phone,
    reg_address: reg.address,
    reg_city: reg.city,
    reg_zip: reg.zip,
    reg_country: "IL",
    consent_at: new Date().toISOString(),
    consent_ip: ip,
    consent_version: body.consentVersion,
  };

  let order: { id: string };
  if (existingOrder) {
    const { error: updErr } = await admin.from("domain_orders").update(orderRow).eq("id", existingOrder.id);
    if (updErr) {
      console.error("domain_orders reuse-update failed:", updErr);
      return json({ ok: false, error: "לא הצלחנו ליצור את ההזמנה" }, 500);
    }
    order = existingOrder;
  } else {
    const sessionToken = crypto.randomUUID();
    const { data: newOrder, error: insErr } = await admin
      .from("domain_orders")
      .insert({ ...orderRow, session_token: sessionToken })
      .select("id")
      .single();
    if (insErr || !newOrder) {
      console.error("domain_orders insert failed:", insErr);
      return json({ ok: false, error: "לא הצלחנו ליצור את ההזמנה" }, 500);
    }
    order = newOrder;
  }

  // The merchant's saved Cardcom token + card expiry (captured on the publish sub).
  const { data: tok } = await admin.from("billing_tokens")
    .select("cc_token_id, cc_exp_month, cc_exp_year").eq("user_id", user.id).eq("provider", "cardcom")
    .not("cc_token_id", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const ccTokenId = (tok as { cc_token_id?: string } | null)?.cc_token_id;
  const expMonth = (tok as { cc_exp_month?: number } | null)?.cc_exp_month;
  const expYear = (tok as { cc_exp_year?: number } | null)?.cc_exp_year;
  if (!ccTokenId || !expMonth || !expYear) {
    await admin.from("domain_orders").update({ status: "failed", error: "no_card", updated_at: new Date().toISOString() }).eq("id", order.id);
    return json({ ok: false, needsCard: true, message: "אין כרטיס שמור. יש לפרסם אתר (מנוי) כדי לשמור כרטיס תחילה." });
  }

  // Charge the token for the domain price. customerIls is PRE-VAT (the dialog shows
  // it as "+ מע\"מ"), so we gross it up by VAT and issue the tax invoice on the gross
  // in the SAME call. Idempotent per order.
  const amount = gross(priced.customerIls);
  const idem = `domain:${order.id}`;
  const isTest = Deno.env.get("BILLING_TEST_MODE") === "true";
  const chargeRow = {
    user_id: user.id, business_id: businessId, amount_ils: amount, status: "pending",
    is_test: isTest, idempotency_key: idem, payment_description: `רכישת דומיין ${name}.${extension}`,
  };
  // Insert-or-update rather than a bare insert: idem is now stable across
  // retries for the same order (see the order-reuse fix above), so a retry
  // would otherwise crash on the idempotency_key unique constraint. The
  // actual charge below is still safe to re-send - Cardcom de-dupes on the
  // same externalUniqId, so a genuinely-completed charge can't double.
  const { data: existingCharge } = await admin.from("billing_charges").select("status").eq("idempotency_key", idem).maybeSingle();
  if (existingCharge) {
    await admin.from("billing_charges").update(chargeRow).eq("idempotency_key", idem);
  } else {
    await admin.from("billing_charges").insert(chargeRow);
  }

  const charge = await chargeToken({
    token: ccTokenId, expMMYY: toMMYY(expMonth, expYear), amountIls: amount, externalUniqId: idem,
    doc: {
      docType: "TaxInvoiceAndReceipt", email: reg.email || undefined, sendByEmail: true, vatFree: false,
      products: [{ description: `רכישת דומיין ${name}.${extension} (שנה)`, quantity: 1, unitCost: amount }],
    },
  });
  if (!charge.ok) {
    const errCode = charge.error || (charge.data as { Description?: string })?.Description || "declined";
    await admin.from("billing_charges").update({ status: "failed", error_code: String(errCode) }).eq("idempotency_key", idem);
    await admin.from("domain_orders").update({ status: "failed", error: `charge: ${errCode}`, updated_at: new Date().toISOString() }).eq("id", order.id);
    return json({ ok: false, declined: true, error: "התשלום נדחה. בדקו את הכרטיס ונסו שוב." });
  }

  const confirmation = (charge.data as { ApprovalNumber?: string }).ApprovalNumber ?? null;
  const invoiceUrl = (charge.data as { DocumentUrl?: string; DocumentInfo?: { DocumentUrl?: string } })?.DocumentUrl
    ?? (charge.data as { DocumentInfo?: { DocumentUrl?: string } })?.DocumentInfo?.DocumentUrl ?? null;
  await admin.from("billing_charges").update({ status: "success", confirmation_code: confirmation, invoice_url: invoiceUrl }).eq("idempotency_key", idem);
  await admin.from("domain_orders").update({ status: "paid", updated_at: new Date().toISOString() }).eq("id", order.id);

  // Payment confirmed -> register the domain (spends reseller balance).
  const result = await registerPaidDomainOrder(admin, {
    id: order.id, business_id: businessId, user_id: user.id,
    domain: `${name}.${extension}`, extension,
    price_ils: amount, cost_usd: check.data.costUsd, auto_renew: body.autoRenew !== false,
    reg_name: reg.name ?? null, reg_email: reg.email ?? null, reg_phone: reg.phone ?? null,
    reg_address: reg.address ?? null, reg_city: reg.city ?? null, reg_zip: reg.zip ?? null, reg_country: "IL",
  });
  if (!result.ok) {
    // Paid, but registration needs manual handling (admin already alerted).
    return json({ ok: true, paid: true, registrationPending: true, domain: `${name}.${extension}`, invoiceUrl });
  }
  return json({ ok: true, domain: result.domain, orderId: result.orderId, invoiceUrl });
});
