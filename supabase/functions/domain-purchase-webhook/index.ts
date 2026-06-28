// Step 2 of the domain buy flow: iCount IPN. Called by iCount after the customer
// pays on the hosted payment page. Identifies the order by session_token (sent in
// the IPN URL), and only THEN registers the domain at Openprovider on the
// customer's name, points its DNS at the store, records it, and emails the buyer.
//
// Money safety: registration (which spends reseller balance) happens strictly
// after iCount confirms payment. If the reseller balance is empty the order is
// flagged failed_funds and an urgent admin alert is sent - the customer already
// paid, so it needs manual handling (top up + register, or refund).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PLATFORM_EMAILS } from "../_shared/email/platformEmails.ts";
import { sendViaResend } from "../_shared/email/resend.ts";
import { opCreateCustomer, opRegisterDomain, opSetDnsToHost } from "../_shared/domains/openprovider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Constant-time string comparison (avoids leaking the secret via timing).
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const APP_URL = () => Deno.env.get("VITE_APP_URL") || "https://siango.app";
// Urgent admin alerts go to both founders (same list as report-error / uptime-check).
const ALERT_RECIPIENTS = ["moti4384@gmail.com", "furmand713@gmail.com"];
const FALLBACK_EMAIL = "office@siango.app";

interface DomainOrder {
  id: string;
  business_id: string | null;
  user_id: string | null;
  domain: string;
  extension: string | null;
  price_ils: number;
  cost_usd: number | null;
  status: string;
  auto_renew: boolean;
  reg_name: string | null;
  reg_email: string | null;
  reg_phone: string | null;
  reg_address: string | null;
  reg_city: string | null;
  reg_zip: string | null;
  reg_country: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const secret = Deno.env.get("ICOUNT_WEBHOOK_SECRET") ?? "";
  if (!secret) return json({ error: "Server misconfigured" }, 500);

  // Accept the secret via header or ?secret= query (iCount IPN can only send query params).
  const url = new URL(req.url);
  const headerSecret =
    req.headers.get("x-webhook-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("secret") ??
    "";
  if (!safeEqual(headerSecret, secret)) return json({ error: "Unauthorized" }, 401);

  // Identify the order. session_token is the reliable key (we put it in the IPN URL).
  let sessionToken = url.searchParams.get("session_token");
  let externalId = url.searchParams.get("transaction_id") || url.searchParams.get("tran_id");
  if (req.method === "POST") {
    try {
      const ct = req.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const b = await req.json().catch(() => ({}));
        sessionToken = sessionToken || b?.session_token || null;
        externalId = externalId || b?.transaction_id || b?.tran_id || b?.id || null;
      } else {
        const text = await req.text();
        const params = new URLSearchParams(text);
        sessionToken = sessionToken || params.get("session_token");
        externalId = externalId || params.get("transaction_id") || params.get("tran_id") || params.get("id");
      }
    } catch { /* tolerate empty/odd bodies - query params are the source of truth */ }
  }
  if (!sessionToken) return json({ error: "session_token required" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: order } = await admin
    .from("domain_orders").select("*").eq("session_token", sessionToken).maybeSingle() as { data: DomainOrder | null };
  if (!order) return json({ error: "Order not found" }, 404);

  // Idempotent: already done.
  if (order.status === "registered") return json({ ok: true, duplicate: true });
  if (order.status === "failed_funds" || order.status === "failed") {
    // A prior attempt failed; don't auto-retry charges. Acknowledge.
    return json({ ok: true, alreadyHandled: order.status });
  }

  // Verify the amount iCount reports (when present) is at least the order price,
  // so a forged/low IPN can't trigger a paid registration that drains balance.
  const ipnAmount = Number(
    url.searchParams.get("sum") || url.searchParams.get("amount") ||
    url.searchParams.get("total") || url.searchParams.get("paid") || 0,
  );
  if (ipnAmount > 0 && ipnAmount + 0.5 < Number(order.price_ils)) {
    await admin.from("domain_orders").update({
      status: "failed", error: `amount mismatch: ${ipnAmount} < ${order.price_ils}`, updated_at: new Date().toISOString(),
    }).eq("id", order.id);
    return json({ error: "amount mismatch" }, 400);
  }

  const now = new Date().toISOString();
  await admin.from("domain_orders").update({ status: "paid", external_transaction_id: externalId, updated_at: now }).eq("id", order.id);

  const [name, ...rest] = order.domain.split(".");
  const extension = order.extension || rest.join(".");

  const fail = async (status: "failed_funds" | "failed", reason: string) => {
    await admin.from("domain_orders").update({ status, error: reason, updated_at: new Date().toISOString() }).eq("id", order.id);
    // Look up business name for the alert.
    let businessName: string | undefined;
    if (order.business_id) {
      const { data: b } = await admin.from("businesses").select("name").eq("id", order.business_id).maybeSingle();
      businessName = (b as any)?.name;
    }
    const alert = PLATFORM_EMAILS.domainFundsAlert({ domainName: order.domain, businessName, amountIls: order.price_ils, reason });
    await sendViaResend({ to: ALERT_RECIPIENTS, subject: alert.subject, html: alert.html, fromName: "Siango" });
    // Reassure the customer their money is safe and we're on it.
    if (order.reg_email) {
      await sendViaResend({
        to: order.reg_email,
        subject: `אנחנו משלימים את רישום הדומיין ${order.domain}`,
        html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#222">היי,<br/>קיבלנו את התשלום על הדומיין <b>${order.domain}</b> 🙏. נתקלנו בעיכוב טכני קצר בהשלמת הרישום - הצוות שלנו כבר מטפל בזה ידנית, והכסף שלכם בטוח. נעדכן אתכם ברגע שהדומיין מוכן. מצטערים על אי הנוחות!<br/><br/>צוות Siango</div>`,
        fromName: "Siango",
      });
    }
  };

  // Register on the customer's name: create an Openprovider customer handle.
  const cust = await opCreateCustomer({
    name: order.reg_name || "Siango Customer",
    email: order.reg_email || FALLBACK_EMAIL,
    phone: order.reg_phone || "+972500000000",
    address: order.reg_address || "-",
    city: order.reg_city || "-",
    zip: order.reg_zip || "0000000",
    country: order.reg_country || "IL",
  });
  if (!cust.ok || !cust.data) {
    await fail("failed", `customer handle: ${cust.error || "unknown"}`);
    return json({ ok: false, handled: true });
  }

  // Register the domain (1 year). Insufficient funds -> urgent alert, no retry.
  const reg = await opRegisterDomain({ name, extension, ownerHandle: cust.data.handle, period: 1 });
  if (!reg.ok || !reg.data) {
    await fail(reg.insufficientFunds ? "failed_funds" : "failed", reg.error || "register failed");
    return json({ ok: false, handled: true });
  }

  // Point DNS at the store host (best-effort; serving via Cloudflare is finalised separately).
  let siteHost: string | undefined;
  if (order.business_id) {
    const { data: b } = await admin.from("businesses").select("slug").eq("id", order.business_id).maybeSingle();
    const slug = (b as any)?.slug;
    if (slug) {
      siteHost = `${slug}.siango.app`;
      try { await opSetDnsToHost(name, extension, siteHost); } catch (e) { console.error("DNS set failed (non-fatal):", e); }
    }
  }

  const expiresAt = reg.data.expiresAt || new Date(Date.now() + 365 * 86400000).toISOString();

  // Record the live domain.
  await admin.from("domains").insert({
    business_id: order.business_id,
    domain: order.domain,
    status: "active",
    registered_at: now,
    expires_at: expiresAt,
    price_ils: order.price_ils,
    cost_usd: order.cost_usd,
    auto_renew: order.auto_renew,
    op_order_id: reg.data.orderId,
    op_owner_handle: cust.data.handle,
    order_id: order.id,
  });
  await admin.from("domain_orders").update({
    status: "registered", op_order_id: reg.data.orderId, op_owner_handle: cust.data.handle, updated_at: new Date().toISOString(),
  }).eq("id", order.id);

  // Email the buyer: ownership + connection guide + renewal.
  if (order.reg_email) {
    let businessName: string | undefined;
    if (order.business_id) {
      const { data: b } = await admin.from("businesses").select("name").eq("id", order.business_id).maybeSingle();
      businessName = (b as any)?.name;
    }
    // Send in the buyer's signup language (captured in user_metadata).
    let lang: any = "he";
    if (order.user_id) {
      const { data: u } = await admin.auth.admin.getUserById(order.user_id);
      lang = (u?.user?.user_metadata?.preferred_language as any) || "he";
    }
    const localeMap: Record<string, string> = { he: "he-IL", en: "en-US", ar: "ar", fr: "fr-FR", ru: "ru-RU" };
    const mail = PLATFORM_EMAILS.domainPurchased({
      businessName,
      domainName: order.domain,
      registrantName: order.reg_name || undefined,
      expiryDate: new Date(expiresAt).toLocaleDateString(localeMap[lang] || "he-IL"),
      autoRenew: order.auto_renew,
      siteHost,
      dashboardUrl: `${APP_URL()}/dashboard`,
      lang,
    });
    await sendViaResend({ to: order.reg_email, subject: mail.subject, html: mail.html, fromName: "Siango" });
  }

  return json({ ok: true, domain: order.domain, orderId: reg.data.orderId });
});
