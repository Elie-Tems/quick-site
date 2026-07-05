// Thin wrapper over the iCount v3 API (https://apiv3.icount.co.il/).
// Auth: Bearer ICOUNT_API_TOKEN (a long-lived API token). Every call is a POST
// with a JSON body to {BASE}/{module}/{action}.
//
// Endpoints we use (verified against the v3 docs):
//   paypage/generate_sale  - create a hosted-page sale (dynamic sum + our ipn_url);
//                            returns sale_url. The page (configured to store the
//                            card) tokenizes it -> we get a cc_token_id.
//   cc/bill                - charge a stored token (cc_token_id) for a custom sum.
//                            Merchant-initiated; supports is_test.
//   cc_storage/token_info  - look up a stored token's details (last4 / expiry).
//   cc/refund              - refund a charge.
//
// We NEVER handle raw card data: the first capture is on iCount's hosted page,
// and afterwards we only ever pass the token reference.

const ICOUNT_BASE = "https://api.icount.co.il/api/v3.php";

export interface IcountResult<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
}

async function icountCall<T = Record<string, unknown>>(
  path: string,
  payload: Record<string, unknown>,
): Promise<IcountResult<T>> {
  const token = Deno.env.get("ICOUNT_API_TOKEN");
  if (!token) {
    return { ok: false, status: 0, data: {} as T, error: "ICOUNT_API_TOKEN not set" };
  }
  try {
    const r = await fetch(`${ICOUNT_BASE}/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    let data: T;
    try {
      data = (await r.json()) as T;
    } catch {
      data = {} as T;
    }
    // iCount signals failure both via HTTP status and a body-level flag.
    const bodyOk = (data as Record<string, unknown>)?.success !== false &&
      (data as Record<string, unknown>)?.status !== false;
    return { ok: r.ok && bodyOk, status: r.status, data };
  } catch (e) {
    return { ok: false, status: 0, data: {} as T, error: String(e) };
  }
}

export interface GenerateSaleOpts {
  paypageId: string | number;
  sumIls: number;
  description: string;
  ipnUrl: string;
  successUrl?: string;
  failureUrl?: string;
  cancelUrl?: string;
  xOrderId?: string | number;        // our reference (session token / order id)
  email?: string;
  clientName?: string;
  isIframe?: boolean;
}

/** Create a hosted-page sale. Returns the sale_url to send the customer to. */
export function generateSale(o: GenerateSaleOpts) {
  return icountCall<{ sale_uniqid?: string; sale_sid?: string; sale_url?: string }>(
    "paypage/generate_sale",
    {
      paypage_id: o.paypageId,
      sum: o.sumIls,
      description: o.description,
      ipn_url: o.ipnUrl,
      ...(o.successUrl ? { success_url: o.successUrl } : {}),
      ...(o.failureUrl ? { failure_url: o.failureUrl } : {}),
      ...(o.cancelUrl ? { cancel_url: o.cancelUrl } : {}),
      ...(o.xOrderId != null ? { x_order_id: o.xOrderId } : {}),
      ...(o.email ? { email: o.email } : {}),
      ...(o.clientName ? { client_name: o.clientName } : {}),
      ...(o.isIframe ? { is_iframe: 1 } : {}),
    },
  );
}

export interface BillTokenOpts {
  ccTokenId: string | number;
  sumIls: number;
  description: string;
  clientId?: string | number;        // iCount client id (per iCount: required alongside the token)
  customClientId?: string;           // our own stable client ref, as a fallback
  email?: string;
  clientName?: string;
  isTest?: boolean;
}

/**
 * Charge a stored card token for a custom amount (subscription charge).
 * Per iCount: pass cc_token_id + the client id (client_id / custom_client_id), and
 * `sum` in shekels (float). We do NOT send use_j5_if_available, so this is a real
 * J4 capture (not a J5 auth-only hold). A genuine charge returns success:true +
 * confirmation_code; a failure returns an `error` (e.g. bad_token / cc_expired).
 */
export function billToken(o: BillTokenOpts) {
  return icountCall<{ success?: boolean; confirmation_code?: string; cc_type?: string; error?: string }>(
    "cc/bill",
    {
      cc_token_id: o.ccTokenId,
      sum: o.sumIls,
      payment_description: o.description,
      ...(o.clientId != null ? { client_id: o.clientId } : {}),
      ...(o.customClientId ? { custom_client_id: o.customClientId } : {}),
      ...(o.email ? { email: o.email } : {}),
      ...(o.clientName ? { client_name: o.clientName } : {}),
      ...(o.isTest ? { is_test: true } : {}),
    },
  );
}

/** Look up a stored token's non-sensitive details (last4 / type / expiry). */
export function tokenInfo(ccTokenId: string | number) {
  return icountCall<{
    token_id?: string; cc_type?: string; cc_last4?: string;
    cc_exp_year?: number; cc_exp_month?: number;
  }>("cc_storage/token_info", { cc_token_id: ccTokenId });
}

/**
 * List a client's stored card tokens (by client_id / custom_client_id / email).
 * iCount confirmed the cc_token_id arrives directly in the IPN; this is the
 * proactive fallback (per iCount: use client/get_cc_tokens, NOT token_info,
 * which needs the token id itself). Response shape varies, so callers should
 * probe the returned list defensively.
 */
export function getCcTokens(client: { clientId?: string | number; customClientId?: string; email?: string }) {
  return icountCall<Record<string, unknown>>("client/get_cc_tokens", {
    ...(client.clientId != null ? { client_id: client.clientId } : {}),
    ...(client.customClientId ? { custom_client_id: client.customClientId } : {}),
    ...(client.email ? { email: client.email } : {}),
  });
}

/** Refund a previously successful charge (edge cases / goodwill). */
export function refundCharge(payload: Record<string, unknown>) {
  return icountCall("cc/refund", payload);
}
