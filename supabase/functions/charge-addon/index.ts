// Merchant-initiated add-on purchase, charged on the merchant's ALREADY-SAVED
// card token via iCount cc/bill - NO hosted page, NO redirect. This is the
// generic "charge the token for X" engine: the client only names the product,
// the price + what it grants are decided SERVER-SIDE (never client-trusted), the
// charge is idempotent per requestId, and the entitlement is granted only AFTER
// a confirmed charge. Requires a saved token (captured on the publish
// subscription); returns { needsCard:true } if the merchant has none yet.
//
// Why this exists: once a card is tokenized we control every future charge via
// the API, so add-ons (AI credits, tags, reviews, domains) do NOT each need their
// own iCount hosted page - one saved token covers them all.
//
// verify_jwt=true: only the authenticated merchant can charge their own token.

import { createClient } from "npm:@supabase/supabase-js@2";
import { chargeToken, toMMYY } from "../_shared/cardcom/api.ts";

const VAT_RATE = 0.18;
const gross = (net: number) => Math.round(net * (1 + VAT_RATE) * 100) / 100;

// Server-authoritative product registry. Prices are PRE-VAT ILS (VAT added
// below), mirroring src/lib/pricingConfig.ts. `grant` is applied only after a
// confirmed charge. Add reviews/domains here once their entitlement grant is
// wired - do NOT charge for something we can't yet deliver.
const PRODUCTS: Record<string, {
  netIls: number;
  description: string;
  grant: { kind: "credits"; credits: number } | { kind: "flag"; table: string; column: string };
}> = {
  ai_credits_starter:  { netIls: 80,  description: "קרדיטים ל-AI - Starter (100 קרדיטים)", grant: { kind: "credits", credits: 100 } },
  ai_credits_business: { netIls: 150, description: "קרדיטים ל-AI - Business (200 קרדיטים)", grant: { kind: "credits", credits: 200 } },
  ai_credits_pro:      { netIls: 300, description: "קרדיטים ל-AI - Pro (500 קרדיטים)",     grant: { kind: "credits", credits: 500 } },
  marketing_tags:      { netIls: 149, description: "תגי שיווק ומעקב (חד-פעמי)",           grant: { kind: "flag", table: "businesses", column: "tracking_paid" } },
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: uErr } = await userClient.auth.getUser();
  if (uErr || !user) return json({ ok: false, error: "invalid session" }, 401);

  let body: { product?: string; businessId?: string; requestId?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: "bad json" }, 400); }

  const product = body.product ? PRODUCTS[body.product] : undefined;
  if (!product) return json({ ok: false, error: "unknown product" }, 400);
  const businessId = (body.businessId || "").trim();
  const requestId = (body.requestId || "").trim();     // client-generated uuid; the idempotency anchor
  if (!businessId || !requestId) return json({ ok: false, error: "businessId + requestId required" }, 400);

  const admin = createClient(url, service);

  // Ownership: the target business must belong to this user (via their profile).
  const { data: prof } = await admin.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
  const { data: biz } = await admin.from("businesses").select("id, owner_id").eq("id", businessId).maybeSingle();
  if (!biz || !prof || (biz as { owner_id?: string }).owner_id !== (prof as { id?: string }).id) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  // Idempotency: exactly one charge per requestId. Already-succeeded => no-op.
  const idem = `addon:${requestId}`;
  const { data: existing } = await admin.from("billing_charges").select("status").eq("idempotency_key", idem).maybeSingle();
  if (existing && (existing as { status?: string }).status === "success") return json({ ok: true, alreadyDone: true });

  // The merchant's saved Cardcom token + card expiry (captured on the publish
  // subscription). One saved token covers every add-on - no hosted page needed.
  const { data: tok } = await admin.from("billing_tokens")
    .select("cc_token_id, cc_exp_month, cc_exp_year").eq("user_id", user.id).eq("provider", "cardcom")
    .not("cc_token_id", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const ccTokenId = (tok as { cc_token_id?: string } | null)?.cc_token_id;
  const expMonth = (tok as { cc_exp_month?: number } | null)?.cc_exp_month;
  const expYear = (tok as { cc_exp_year?: number } | null)?.cc_exp_year;
  if (!ccTokenId || !expMonth || !expYear) {
    return json({ ok: false, needsCard: true, message: "אין כרטיס שמור. יש לפרסם אתר (מנוי) כדי לשמור כרטיס תחילה." });
  }

  const { data: u } = await admin.auth.admin.getUserById(user.id);
  const email = u?.user?.email ?? undefined;

  const amount = gross(product.netIls);              // VAT-inclusive total actually charged
  const isTest = Deno.env.get("BILLING_TEST_MODE") === "true";

  // Reserve the charge row first - the unique idempotency_key blocks a concurrent double-click.
  const { error: insErr } = await admin.from("billing_charges").insert({
    user_id: user.id, business_id: businessId, amount_ils: amount, status: "pending",
    is_test: isTest, idempotency_key: idem, payment_description: product.description,
  });
  if (insErr) return json({ ok: false, error: "duplicate request in flight" }, 409);

  // Charge the stored Cardcom token; the tax invoice/receipt is issued in the SAME
  // call (Document). unitCost is the GROSS amount - Cardcom treats it VAT-inclusive
  // and requires the document total == the charge. Idempotent via ExternalUniqTranId.
  const res = await chargeToken({
    token: ccTokenId, expMMYY: toMMYY(expMonth, expYear), amountIls: amount, externalUniqId: idem,
    doc: {
      docType: "TaxInvoiceAndReceipt", email, sendByEmail: true, vatFree: false,
      products: [{ description: product.description, quantity: 1, unitCost: amount }],
    },
  });
  if (!res.ok) {
    const errCode = res.error || (res.data as { Description?: string })?.Description || "declined";
    await admin.from("billing_charges").update({ status: "failed", error_code: String(errCode) }).eq("idempotency_key", idem);
    return json({ ok: false, declined: true, error: String(errCode) });
  }

  const confirmation = (res.data as { ApprovalNumber?: string }).ApprovalNumber ?? null;
  const invoiceUrl = (res.data as { DocumentUrl?: string; DocumentInfo?: { DocumentUrl?: string } })?.DocumentUrl
    ?? (res.data as { DocumentInfo?: { DocumentUrl?: string } })?.DocumentInfo?.DocumentUrl ?? null;
  await admin.from("billing_charges").update({ status: "success", confirmation_code: confirmation, invoice_url: invoiceUrl }).eq("idempotency_key", idem);

  // Grant the entitlement ONLY after a confirmed charge.
  if (product.grant.kind === "credits") {
    const { error: grantErr } = await admin.rpc("add_ai_credits", { p_business_id: businessId, p_amount: product.grant.credits });
    if (grantErr) console.error("charge-addon: add_ai_credits failed (charge succeeded!)", businessId, grantErr);
  } else if (product.grant.kind === "flag") {
    const { error: grantErr } = await admin.from(product.grant.table)
      .update({ [product.grant.column]: true, updated_at: new Date().toISOString() }).eq("id", businessId);
    if (grantErr) console.error("charge-addon: flag grant failed (charge succeeded!)", businessId, grantErr);
  }

  return json({ ok: true, confirmation, invoiceUrl });
});
