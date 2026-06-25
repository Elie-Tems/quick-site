// Step 1 of the domain buy flow (payment-first). The customer fills the
// registrant details + consent and clicks buy; this function:
//   1. authenticates the user and verifies they own the business,
//   2. re-checks availability + price at Openprovider SERVER-SIDE (never trust
//      the client's price),
//   3. records a pending order in domain_orders with the registrant + consent,
//   4. returns a session_token + the authoritative price.
// The frontend then sends the customer to the iCount payment page. Only after
// iCount confirms (domain-purchase-webhook) do we actually register the domain,
// so we never spend reseller balance before being paid.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { opCheckOne } from "../_shared/domains/openprovider.ts";
import { priceDomain } from "../_shared/domains/pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  const sessionToken = crypto.randomUUID();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  const { data: order, error: insErr } = await admin
    .from("domain_orders")
    .insert({
      business_id: businessId,
      user_id: user.id,
      domain: `${name}.${extension}`,
      extension,
      price_ils: priced.customerIls,
      cost_usd: check.data.costUsd,
      status: "pending",
      session_token: sessionToken,
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
    })
    .select("id")
    .single();

  if (insErr || !order) {
    console.error("domain_orders insert failed:", insErr);
    return json({ ok: false, error: "לא הצלחנו ליצור את ההזמנה" }, 500);
  }

  return json({ ok: true, sessionToken, orderId: order.id, priceIls: priced.customerIls, domain: `${name}.${extension}` });
});
