// Unified payment-provider abstraction.
// Adding a new gateway (Cardcom, Meshulam, iCount, Tranzila...) = implement one
// PaymentProvider adapter (~50 lines) and register it in registry.ts. The
// generic edge functions (payments-create / payments-callback / payments-verify)
// stay untouched - they dispatch to the adapter by the business's payment_provider.

// The full payment_credentials row (provider-specific columns + the generic
// `config` jsonb for fields that don't fit the PayPlus-shaped columns).
export interface ProviderCredentials {
  api_key?: string | null;
  secret_key?: string | null;
  page_uid?: string | null;
  mode?: string | null;
  config?: Record<string, unknown> | null;
}

export interface CreatePageInput {
  amount: number;
  currency: string; // e.g. "ILS"
  customer: { name: string; email: string; phone?: string };
  items: { name: string; quantity: number; price: number }[];
  successUrl: string;
  failureUrl: string;
  cancelUrl: string;
  callbackUrl: string;
}

export interface CreatePageResult {
  ok: boolean;
  link?: string;
  pageRequestUid?: string;
  error?: string;
  raw?: unknown;
}

export interface CallbackParse {
  pageRequestUid: string | null;
  approved: boolean;
  transactionUid: string | null;
  amount: number;
}

export interface PaymentProvider {
  id: string;
  /** When true, verifyCallbackSignature RE-QUERIES the gateway and returns true only
   *  if the sale is genuinely paid (spoof-proof, e.g. iCount doc lookup). For such
   *  providers the callback/confirm paid-decision comes from verification, NOT from
   *  parseCallback().approved (which they leave false because the IPN body alone is
   *  not authoritative). PayPlus leaves this false: its verify is a pure HMAC/header
   *  authenticity check and the paid signal comes from parseCallback().approved. */
  verificationImpliesPaid?: boolean;
  /** Optional: re-query the gateway BY our payment reference and return true only if
   *  the sale is genuinely paid. Used by payments-confirm (on-return recovery) when a
   *  plain verifyCallbackSignature can't authenticate a synthetic/headerless request
   *  (PayPlus's verify is IPN-header HMAC only). Read-only status lookup - no charge. */
  verifyByReference?(creds: ProviderCredentials, ref: string, env: PaymentEnv): Promise<boolean>;
  /** Ask the gateway for a hosted payment page; return its link + a tracking id. */
  createPaymentPage(creds: ProviderCredentials, input: CreatePageInput, env: PaymentEnv): Promise<CreatePageResult>;
  /** Pull the tracking id + result out of a callback payload (no secrets needed). */
  parseCallback(payload: any): CallbackParse;
  /** Authenticate the callback came from the gateway (HMAC / signature check). */
  verifyCallbackSignature(creds: ProviderCredentials, rawBody: string, headers: Headers, payload: any): Promise<boolean>;
  /** Validate merchant credentials without charging anyone. May return the resolved
   *  numeric page id (e.g. iCount's paypage_id) so the UI can show/store it. */
  verifyCredentials(creds: ProviderCredentials, env: PaymentEnv): Promise<{ ok: boolean; error?: string; paypageId?: string | number }>;
}

export interface PaymentEnv {
  get(key: string): string | undefined;
}

export async function hmacBase64(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}
