import {
  CallbackParse, CreatePageInput, CreatePageResult,
  PaymentEnv, PaymentProvider, ProviderCredentials,
} from "./provider.ts";

// iCount as a STOREFRONT gateway (the merchant's own iCount account charges their
// end-customers). Per iCount support: there is no direct status lookup by
// sale_uniqid, so we authenticate the payment the SECURE way, exactly like Cardcom -
// we never trust the IPN body. We tag the sale with our own order ref
// (custom_client_id), and on the callback we look the produced document up
// (doc/search by that ref) and pull its payments (doc/info get_payments=true) using
// the MERCHANT's API token. A spoofed IPN can't fake an authenticated iCount
// confirmation. Credentials: api_key = the merchant's iCount API token,
// page_uid = their paypage id.

const ICOUNT_BASE = "https://api.icount.co.il/api/v3.php";

// deno-lint-ignore no-explicit-any
async function icall(token: string, path: string, payload: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const r = await fetch(`${ICOUNT_BASE}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    let data: Record<string, unknown> = {};
    try { data = await r.json(); } catch { /* non-JSON */ }
    const bodyOk = data?.success !== false && data?.status !== false;
    return { ok: r.ok && bodyOk, status: r.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: { error: String(e) } };
  }
}

function refFromPayload(payload: Record<string, unknown> | undefined): string | null {
  const r = payload?.["custom_client_id"] ?? payload?.["x_order_id"] ?? payload?.["order_id"];
  return r != null ? String(r) : null;
}

// The merchant may paste either a bare paypage id ("123456") or the full paypage
// URL ("app.icount.co.il/m/31ff3/abc..."). Extract the id (the path after /m/).
function normalizePaypageId(raw: string): string {
  const s = (raw || "").trim();
  const m = s.match(/\/m\/([^?#]+)/i);
  return m ? m[1].replace(/\/+$/, "") : s;
}

export const icount: PaymentProvider = {
  id: "icount",

  async createPaymentPage(c: ProviderCredentials, input: CreatePageInput, _env: PaymentEnv): Promise<CreatePageResult> {
    const token = c.api_key ?? "";
    const paypageId = normalizePaypageId(c.page_uid ?? "");
    if (!token || !paypageId) return { ok: false, error: "iCount לא מחובר (חסר API token או מזהה עמוד סליקה)" };

    // Our unique order ref - echoed on the IPN AND used to look the sale up for the
    // authenticated verification.
    const orderRef = crypto.randomUUID();
    const description = (input.items.map((i) => i.name).join(", ") || "תשלום").slice(0, 120);

    const res = await icall(token, "paypage/generate_sale", {
      paypage_id: paypageId,
      sum: input.amount,
      description,
      ipn_url: input.callbackUrl,
      success_url: input.successUrl,
      failure_url: input.failureUrl,
      cancel_url: input.cancelUrl,
      x_order_id: orderRef,
      custom_client_id: orderRef,
      email: input.customer.email,
      client_name: input.customer.name,
    });
    const saleUrl = res.data?.sale_url;
    if (!res.ok || !saleUrl) return { ok: false, error: res.data?.error || "generate_sale נכשל", raw: res.data };
    return { ok: true, link: saleUrl, pageRequestUid: orderRef };
  },

  parseCallback(payload): CallbackParse {
    // approved is decided authoritatively in verifyCallbackSignature (re-query iCount).
    return {
      pageRequestUid: refFromPayload(payload),
      approved: false,
      transactionUid: payload?.confirmation_code ? String(payload.confirmation_code) : null,
      amount: Number(payload?.sum ?? payload?.amount ?? 0),
    };
  },

  // The real, spoof-proof check: authenticate the payment server-to-server with the
  // merchant's token. Safe-fail: returns true ONLY if iCount reports the sale paid.
  async verifyCallbackSignature(c: ProviderCredentials, _rawBody: string, _headers: Headers, payload): Promise<boolean> {
    const token = c.api_key ?? "";
    const ref = refFromPayload(payload);
    if (!token || !ref) return false;

    const search = await icall(token, "doc/search", { custom_client_id: ref });
    // Response shape varies by account - probe defensively, and log for the first
    // real test so we can pin the exact fields.
    console.log("icount verify: doc/search ->", JSON.stringify(search.data)?.slice(0, 800));
    const container = search.data?.docs || search.data?.results || search.data?.data || search.data?.doclist;
    const first = Array.isArray(container) ? container[0]
      : (container && typeof container === "object" ? Object.values(container)[0] : null);
    const docId = (first as Record<string, unknown>)?.doc_id ?? (first as Record<string, unknown>)?.docnum
      ?? (first as Record<string, unknown>)?.doc_number ?? search.data?.doc_id ?? search.data?.docnum;
    if (docId == null) { console.warn("icount verify: no doc found for ref", ref); return false; }

    const info = await icall(token, "doc/info", { doc_id: docId, get_payments: true });
    console.log("icount verify: doc/info ->", JSON.stringify(info.data)?.slice(0, 800));
    if (!info.ok) return false;
    const d = info.data;
    const payments = d?.payments || d?.doc?.payments || [];
    const paidSum = Number(d?.paid ?? d?.paid_sum ?? d?.doc?.paid ?? 0);
    const hasCcPayment = Array.isArray(payments)
      ? payments.some((p: Record<string, unknown>) => Number(p?.sum) > 0)
      : (payments && typeof payments === "object" && Object.keys(payments).length > 0);
    return paidSum > 0 || !!hasCcPayment;
  },

  async verifyCredentials(c: ProviderCredentials, _env: PaymentEnv): Promise<{ ok: boolean; error?: string }> {
    const token = c.api_key ?? "";
    if (!token) return { ok: false, error: "חסר API token של iCount" };
    if (!c.page_uid) return { ok: false, error: "חסר מזהה עמוד סליקה (paypage id) של iCount" };
    // Harmless authenticated call to validate the token (a ref that won't exist).
    const res = await icall(token, "doc/search", { custom_client_id: "siango-connection-test-000" });
    if (res.status === 401 || res.status === 403) return { ok: false, error: "ה-API token של iCount נדחה" };
    return { ok: true };
  },
};
