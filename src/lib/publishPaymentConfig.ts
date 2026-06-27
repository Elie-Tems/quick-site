/** מחיר לפרסום (הצגה + שמירה ב־publish_checkout_sessions). ברירת מחדל 69 ₪/חודש. */
export function getPublishFeeIls(): number {
  const n = Number(import.meta.env.VITE_PUBLISH_FEE_ILS);
  return Number.isFinite(n) && n > 0 ? n : 69;
}

/** iframe (ברירת מחדל) או קישור חיצוני - אם iCount חוסמים iframe, הגדרו VITE_ICOUNT_PAYMENT_EMBED_MODE=link */
export function getIcountEmbedMode(): "iframe" | "link" {
  const m = (import.meta.env.VITE_ICOUNT_PAYMENT_EMBED_MODE || "iframe").toLowerCase();
  return m === "link" ? "link" : "iframe";
}

export function buildIcountCheckoutUrl(baseUrl: string, sessionToken: string, businessId?: string): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) return "";
  try {
    const u = trimmed.includes("://") ? new URL(trimmed) : new URL(`https://${trimmed}`);
    u.searchParams.set("session_token", sessionToken);
    if (businessId) {
      u.searchParams.set("business_id", businessId);
    }
    return u.toString();
  } catch {
    let url = `${trimmed}${trimmed.includes("?") ? "&" : "?"}session_token=${encodeURIComponent(sessionToken)}`;
    if (businessId) {
      url += `&business_id=${encodeURIComponent(businessId)}`;
    }
    return url;
  }
}

/** Base URL of the iCount payment page used for domain purchases (variable amount).
 *  Configure the page in iCount to take the amount from the `sum` URL parameter. */
export function getDomainPaymentBaseUrl(): string {
  return (import.meta.env.VITE_ICOUNT_DOMAIN_PAYMENT_BASE_URL || "").trim();
}

/** Build the iCount domain checkout URL: appends the order identifiers + amount so
 *  the IPN (domain-purchase-webhook) can match the payment to the order. */
export function buildIcountDomainCheckoutUrl(
  baseUrl: string,
  opts: { sessionToken: string; orderId: string; businessId?: string; sumIls?: number },
): string {
  const trimmed = baseUrl.trim();
  if (!trimmed) return "";
  try {
    const u = trimmed.includes("://") ? new URL(trimmed) : new URL(`https://${trimmed}`);
    u.searchParams.set("session_token", opts.sessionToken);
    u.searchParams.set("order_id", opts.orderId);
    if (opts.businessId) u.searchParams.set("business_id", opts.businessId);
    if (opts.sumIls != null) u.searchParams.set("sum", String(opts.sumIls));
    return u.toString();
  } catch {
    let url = `${trimmed}${trimmed.includes("?") ? "&" : "?"}session_token=${encodeURIComponent(opts.sessionToken)}&order_id=${encodeURIComponent(opts.orderId)}`;
    if (opts.businessId) url += `&business_id=${encodeURIComponent(opts.businessId)}`;
    if (opts.sumIls != null) url += `&sum=${encodeURIComponent(String(opts.sumIls))}`;
    return url;
  }
}

/** One-time ₪149 payment page for the "marketing tags" add-on (iCount). */
export function getTagsPaymentUrl(): string {
  return (import.meta.env.VITE_ICOUNT_TAGS_PAYMENT_URL || "").trim();
}

/** Price of the marketing-tags add-on (one-time, pre-VAT). */
export const TAGS_ADDON_PRICE_ILS = 149;

/** Get AI credit payment URL by package ID */
export function getAICreditPaymentUrl(packageId: string): string {
  switch (packageId) {
    case "starter":
      return (import.meta.env.VITE_AI_CREDITS_STARTER_PAYMENT_URL || "").trim();
    case "business":
      return (import.meta.env.VITE_AI_CREDITS_BUSINESS_PAYMENT_URL || "").trim();
    case "pro":
      return (import.meta.env.VITE_AI_CREDITS_PRO_PAYMENT_URL || "").trim();
    default:
      return "";
  }
}
