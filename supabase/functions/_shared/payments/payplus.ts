import {
  CallbackParse, CreatePageInput, CreatePageResult, hmacBase64,
  PaymentEnv, PaymentProvider, ProviderCredentials,
} from "./provider.ts";

const apiBase = (env: PaymentEnv) =>
  env.get("PAYPLUS_API_BASE") || "https://restapidev.payplus.co.il/api/v1.0";

const authHeaders = (c: ProviderCredentials) => ({
  "Content-Type": "application/json",
  "api-key": c.api_key ?? "",
  "secret-key": c.secret_key ?? "",
});

export const payplus: PaymentProvider = {
  id: "payplus",

  async createPaymentPage(c, input, env): Promise<CreatePageResult> {
    const body = {
      payment_page_uid: c.page_uid,
      charge_method: 1,
      amount: input.amount,
      currency_code: input.currency,
      sendEmailApproval: true,
      sendEmailFailure: false,
      initial_invoice: true,
      refURL_success: input.successUrl,
      refURL_failure: input.failureUrl,
      refURL_cancel: input.cancelUrl,
      refURL_callback: input.callbackUrl,
      customer: { customer_name: input.customer.name, email: input.customer.email, phone: input.customer.phone },
      items: input.items,
    };
    try {
      const res = await fetch(`${apiBase(env)}/PaymentPages/generateLink`, {
        method: "POST", headers: authHeaders(c), body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json?.results?.status !== "success" || !json?.data?.payment_page_link) {
        return { ok: false, error: json?.results?.description || "generateLink failed", raw: json };
      }
      return { ok: true, link: json.data.payment_page_link, pageRequestUid: json.data.page_request_uid };
    } catch (err) {
      return { ok: false, error: "PayPlus unreachable: " + String(err) };
    }
  },

  parseCallback(payload): CallbackParse {
    const t = payload?.transaction ?? payload?.data ?? payload ?? {};
    const statusCode = String(t.status_code ?? payload?.status_code ?? "");
    return {
      pageRequestUid:
        t.payment_page_request_uid || t.page_request_uid || payload?.page_request_uid || null,
      approved: statusCode === "000" || t.status === "approved",
      transactionUid: t.uid || t.transaction_uid || null,
      amount: Number(t.amount ?? payload?.amount ?? 0),
    };
  },

  // Per docs "Validate Requests Received from PayPlus": user-agent == "PayPlus"
  // and hash == HMAC-SHA256(secret, body) base64. Match raw body (== PayPlus's
  // own JSON.stringify output) with a re-stringify fallback.
  async verifyCallbackSignature(c, rawBody, headers, payload): Promise<boolean> {
    if (!c.secret_key) return false;
    if ((headers.get("user-agent") || "") !== "PayPlus") return false;
    const sent = headers.get("hash") || "";
    const a = await hmacBase64(c.secret_key, rawBody);
    const b = await hmacBase64(c.secret_key, JSON.stringify(payload));
    return sent === a || sent === b;
  },

  async verifyCredentials(c, env): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(`${apiBase(env)}/PaymentPages/generateLink`, {
        method: "POST", headers: authHeaders(c),
        body: JSON.stringify({
          payment_page_uid: c.page_uid, charge_method: 1, amount: 1, currency_code: "ILS",
          customer: { customer_name: "Connection test", email: "test@siango.app" },
          items: [{ name: "בדיקת חיבור", quantity: 1, price: 1 }],
        }),
      });
      const json = await res.json();
      return json?.results?.status === "success"
        ? { ok: true }
        : { ok: false, error: json?.results?.description || "Credentials rejected by PayPlus" };
    } catch (err) {
      return { ok: false, error: "Could not reach PayPlus: " + String(err) };
    }
  },
};
