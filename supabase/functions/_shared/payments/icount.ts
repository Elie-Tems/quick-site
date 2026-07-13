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

// The merchant may paste either the numeric paypage id ("123456"), the short URL
// slug ("31ff3"), or the full paypage URL ("app.icount.co.il/m/31ff3/abc...").
// Extract the raw token (the path after /m/ if a URL).
function normalizePaypageId(raw: string): string {
  const s = (raw || "").trim();
  const m = s.match(/\/m\/([^?#]+)/i);
  return m ? m[1].replace(/\/+$/, "") : s;
}

function isNumericId(s: string): boolean {
  return /^\d+$/.test((s || "").trim());
}

// generate_sale needs the NUMERIC internal paypage_id (an Integer), NOT the short
// public URL slug like "31ff3" - iCount rejects the slug with missing_paypage_id.
// Per iCount support: get the numeric id from paypage/get_list (each entry's `id`).
// We resolve lazily and backward-compatibly: a pure-integer value is used as-is; a
// slug/URL is matched against the account's paypage list; a single-page account
// falls back to its only page.
async function resolvePaypageId(token: string, rawPageUid: string): Promise<{ id: number | null; error?: string }> {
  const val = normalizePaypageId(rawPageUid);
  if (isNumericId(val)) return { id: Number(val) };

  const list = await icall(token, "paypage/get_list", {});
  if (!list.ok) return { id: null, error: "לא הצלחנו לשלוף את רשימת עמודי הסליקה מ-iCount" };
  const container = list.data?.paypages ?? list.data?.pages ?? list.data?.list ?? list.data?.data ?? list.data;
  const items: Record<string, unknown>[] = Array.isArray(container)
    ? container
    : (container && typeof container === "object"
        ? (Object.values(container).filter((v) => v && typeof v === "object") as Record<string, unknown>[])
        : []);
  if (!items.length) return { id: null, error: "לא נמצאו עמודי סליקה בחשבון iCount" };

  const slug = val.toLowerCase();
  const match = items.find((p) =>
    Object.values(p).some((v) => typeof v === "string" && v.toLowerCase().includes(slug)),
  );
  const chosen = match ?? (items.length === 1 ? items[0] : null);
  if (!chosen) {
    return { id: null, error: "לא זיהינו את עמוד הסליקה לפי המזהה שהוזן - הזינו את מזהה העמוד המספרי (paypage id) מרשימת עמודי הסליקה ב-iCount" };
  }
  const rawId = chosen.id ?? chosen.paypage_id ?? chosen.page_id;
  if (rawId == null || !isNumericId(String(rawId))) return { id: null, error: "עמוד הסליקה שנמצא חסר מזהה מספרי תקין" };
  return { id: Number(rawId) };
}

export const icount: PaymentProvider = {
  id: "icount",

  async createPaymentPage(c: ProviderCredentials, input: CreatePageInput, _env: PaymentEnv): Promise<CreatePageResult> {
    const token = c.api_key ?? "";
    if (!token || !(c.page_uid ?? "").trim()) return { ok: false, error: "iCount לא מחובר (חסר API token או מזהה עמוד סליקה)" };

    const resolved = await resolvePaypageId(token, c.page_uid ?? "");
    if (resolved.id == null) return { ok: false, error: resolved.error || "מזהה עמוד הסליקה של iCount לא תקין" };
    const paypageId = resolved.id;

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
    if (!(c.page_uid ?? "").trim()) return { ok: false, error: "חסר מזהה עמוד סליקה (paypage id) של iCount" };
    // 1) Validate the token (a harmless authenticated call, a ref that won't exist).
    const res = await icall(token, "doc/search", { custom_client_id: "siango-connection-test-000" });
    if (res.status === 401 || res.status === 403) return { ok: false, error: "ה-API token של iCount נדחה" };
    // 2) Validate the ACTUAL paypage exists in the account. Without this we would
    // report "connected" for a wrong/missing paypage id and every checkout would
    // fail later with missing_paypage_id. Resolve the numeric id, then confirm it
    // with paypage/info (per iCount: validates the page without creating a sale).
    const resolved = await resolvePaypageId(token, c.page_uid ?? "");
    if (resolved.id == null) return { ok: false, error: resolved.error || "מזהה עמוד הסליקה לא נמצא בחשבון iCount" };
    const info = await icall(token, "paypage/info", { paypage_id: resolved.id });
    if (!info.ok) return { ok: false, error: "עמוד הסליקה לא נמצא או לא תקין בחשבון iCount (בדקו את מזהה העמוד)" };
    return { ok: true };
  },
};
