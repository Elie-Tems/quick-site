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
