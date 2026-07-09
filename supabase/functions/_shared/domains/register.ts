// Register a PAID domain order at Openprovider on the customer's name, point its
// DNS at the store, record it, and email the buyer. Extracted so both the Cardcom
// token-charge flow (domain-purchase) and the legacy iCount IPN (domain-purchase-
// webhook) share ONE registration path - registration (which spends reseller
// balance) must only ever run after a confirmed payment.
//
// On insufficient reseller funds (customer already paid) it flags the order
// failed_funds + fires an urgent admin alert; the caller should surface handled=true.

import { PLATFORM_EMAILS } from "../email/platformEmails.ts";
import { sendViaResend } from "../email/resend.ts";
import { opCreateCustomer, opRegisterDomain, opSetDnsToHost } from "./openprovider.ts";

const APP_URL = () => Deno.env.get("VITE_APP_URL") || "https://siango.app";
const ALERT_RECIPIENTS = ["moti4384@gmail.com", "furmand713@gmail.com"];
const FALLBACK_EMAIL = "office@siango.app";

export interface PaidDomainOrder {
  id: string;
  business_id: string | null;
  user_id: string | null;
  domain: string;
  extension: string | null;
  price_ils: number;
  cost_usd: number | null;
  auto_renew: boolean;
  reg_name: string | null;
  reg_email: string | null;
  reg_phone: string | null;
  reg_address: string | null;
  reg_city: string | null;
  reg_zip: string | null;
  reg_country: string | null;
}

// deno-lint-ignore no-explicit-any
type Admin = any;

export async function registerPaidDomainOrder(
  admin: Admin,
  order: PaidDomainOrder,
): Promise<{ ok: boolean; handled?: boolean; domain?: string; orderId?: string }> {
  const [name, ...rest] = order.domain.split(".");
  const extension = order.extension || rest.join(".");

  const fail = async (status: "failed_funds" | "failed", reason: string) => {
    await admin.from("domain_orders").update({ status, error: reason, updated_at: new Date().toISOString() }).eq("id", order.id);
    let businessName: string | undefined;
    if (order.business_id) {
      const { data: b } = await admin.from("businesses").select("name").eq("id", order.business_id).maybeSingle();
      businessName = (b as { name?: string })?.name;
    }
    const alert = PLATFORM_EMAILS.domainFundsAlert({ domainName: order.domain, businessName, amountIls: order.price_ils, reason });
    await sendViaResend({ to: ALERT_RECIPIENTS, subject: alert.subject, html: alert.html, fromName: "Siango" });
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
    return { ok: false, handled: true };
  }

  // Register the domain (1 year). Insufficient funds -> urgent alert, no retry.
  const reg = await opRegisterDomain({ name, extension, ownerHandle: cust.data.handle, period: 1 });
  if (!reg.ok || !reg.data) {
    await fail(reg.insufficientFunds ? "failed_funds" : "failed", reg.error || "register failed");
    return { ok: false, handled: true };
  }

  // Point DNS at the store host (best-effort).
  let siteHost: string | undefined;
  if (order.business_id) {
    const { data: b } = await admin.from("businesses").select("slug").eq("id", order.business_id).maybeSingle();
    const slug = (b as { slug?: string })?.slug;
    if (slug) {
      siteHost = `${slug}.siango.app`;
      try { await opSetDnsToHost(name, extension, siteHost); } catch (e) { console.error("DNS set failed (non-fatal):", e); }
    }
  }

  const now = new Date().toISOString();
  const expiresAt = reg.data.expiresAt || new Date(Date.now() + 365 * 86400000).toISOString();

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
      businessName = (b as { name?: string })?.name;
    }
    let lang = "he";
    if (order.user_id) {
      const { data: u } = await admin.auth.admin.getUserById(order.user_id);
      lang = (u?.user?.user_metadata?.preferred_language as string) || "he";
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
      lang: lang as "he" | "en" | "ar" | "fr" | "ru",
    });
    await sendViaResend({ to: order.reg_email, subject: mail.subject, html: mail.html, fromName: "Siango" });
  }

  return { ok: true, domain: order.domain, orderId: reg.data.orderId };
}
