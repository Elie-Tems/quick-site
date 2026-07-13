// Cardcom v11 API helpers. Verified against the official Swagger + the Step 1/2/3
// developer articles (secure.cardcom.solutions/swagger/v11 + cardcomapi.zendesk.com).
//
// Auth: TerminalNumber + ApiName (+ ApiPassword, only needed for refunds/cancels),
// all from Supabase secrets - NEVER hardcoded. Success is signalled by
// ResponseCode === 0 across every endpoint.
//
// The three calls we use:
//   LowProfile/Create   - hosted page that CHARGES a dynamic amount AND saves a
//                         card token in ONE transaction ("ChargeAndCreateToken"),
//                         and issues a tax invoice+receipt (Document). Returns Url.
//   LowProfile/GetLpResult - server-to-server verification of a finished deal
//                         (never trust the webhook body alone). Returns TokenInfo
//                         (Token + expiry) and DocumentInfo (invoice).
//   Transactions/Transaction - charge a stored Token for an arbitrary amount
//                         (recurring). Needs the card expiry (MMYY);
//                         ExternalUniqTranId makes it idempotent (dup -> err 608).

const BASE = "https://secure.cardcom.solutions/api/v11";

interface Creds { terminal: number; apiName: string; apiPassword: string; }
function creds(): Creds | null {
  const terminal = Number(Deno.env.get("CARDCOM_TERMINAL"));
  const apiName = Deno.env.get("CARDCOM_API_NAME") || "";
  const apiPassword = Deno.env.get("CARDCOM_API_PASSWORD") || "";
  if (!terminal || !apiName) return null;
  return { terminal, apiName, apiPassword };
}

export interface CardcomResult<T = Record<string, unknown>> {
  ok: boolean;          // true iff HTTP ok AND ResponseCode === 0
  data: T;
  error?: string;       // Description when ResponseCode !== 0
}

async function call<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
): Promise<CardcomResult<T>> {
  try {
    const r = await fetch(`${BASE}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await r.json().catch(() => ({}))) as T;
    const rc = (data as Record<string, unknown>)?.["ResponseCode"];
    const ok = r.ok && rc === 0;
    return { ok, data, error: ok ? undefined : String((data as Record<string, unknown>)?.["Description"] ?? `HTTP ${r.status} / RC ${rc}`) };
  } catch (e) {
    return { ok: false, data: {} as T, error: String(e) };
  }
}

// Tax-invoice/receipt document (issued with the charge). unitCost is per line.
export interface DocInput {
  docType?: string;      // default "TaxInvoiceAndReceipt"
  name?: string;
  taxId?: string;
  email?: string;
  sendByEmail?: boolean;
  vatFree?: boolean;     // false => 18% VAT
  products: { description: string; quantity?: number; unitCost: number }[];
}
function buildDoc(d?: DocInput): Record<string, unknown> | undefined {
  if (!d) return undefined;
  return {
    DocumentTypeToCreate: d.docType || "TaxInvoiceAndReceipt",
    ...(d.name ? { Name: d.name } : {}),
    ...(d.taxId ? { TaxId: d.taxId } : {}),
    ...(d.email ? { Email: d.email, IsSendByEmail: d.sendByEmail ?? true } : {}),
    IsVatFree: d.vatFree ?? false,
    Products: d.products.map((p) => ({ Description: p.description, Quantity: p.quantity ?? 1, UnitCost: p.unitCost })),
  };
}

// Refund (full or partial) a completed transaction by its Cardcom TranzactionId.
// Per Cardcom "Refund By Transaction Id": required = ApiName + ApiPassword +
// TransactionId; PartialSum (optional) makes it a partial refund (omit = full).
// ResponseCode === 0 means success; NewTranzactionId is the refund transaction.
export function refundByTransactionId(o: {
  transactionId: number | string;
  partialSum?: number;      // omit / <=0 for a full refund
}): Promise<CardcomResult<{ ResponseCode: number; Description: string; NewTranzactionId?: number }>> {
  const c = creds();
  if (!c) return Promise.resolve({ ok: false, data: {} as never, error: "CARDCOM creds not set" });
  if (!c.apiPassword) return Promise.resolve({ ok: false, data: {} as never, error: "CARDCOM_API_PASSWORD חסר (נדרש לזיכוי)" });
  return call("Transactions/RefundByTransactionId", {
    TerminalNumber: c.terminal,
    ApiName: c.apiName,
    ApiPassword: c.apiPassword,
    TransactionId: Number(o.transactionId),
    ...(o.partialSum && o.partialSum > 0 ? { PartialSum: o.partialSum } : {}),
  });
}

/** Format a stored expiry (month 1-12, year 2027 or 27) as Cardcom's MMYY. */
export function toMMYY(month: number | string, year: number | string): string {
  const mm = String(Number(month)).padStart(2, "0");
  const y = String(year);
  const yy = y.length >= 4 ? y.slice(2) : y.padStart(2, "0");
  return `${mm}${yy}`;
}

// Step 1: create the payment page that charges `amountIls` AND saves a token, in
// one transaction, issuing a tax invoice/receipt. Returns { LowProfileId, Url }.
export function createLowProfile(o: {
  amountIls: number;
  returnValue: string;      // our reference (e.g. the checkout session token) - echoed back
  webhookUrl: string;       // our server-to-server result callback
  successUrl: string;
  failureUrl: string;
  productName?: string;
  doc?: DocInput;
}): Promise<CardcomResult<{ ResponseCode: number; Description: string; LowProfileId: string; Url: string }>> {
  const c = creds();
  if (!c) return Promise.resolve({ ok: false, data: {} as never, error: "CARDCOM creds not set" });
  return call("LowProfile/Create", {
    TerminalNumber: c.terminal,
    ApiName: c.apiName,
    Operation: "ChargeAndCreateToken",
    Amount: o.amountIls,
    ISOCoinId: 1,               // ILS
    Language: "he",
    ReturnValue: o.returnValue,
    SuccessRedirectUrl: o.successUrl,
    FailedRedirectUrl: o.failureUrl,
    WebHookUrl: o.webhookUrl,
    ...(o.productName ? { ProductName: o.productName } : {}),
    ...(o.doc ? { Document: buildDoc(o.doc) } : {}),
  });
}

export interface LpResult {
  ResponseCode: number;
  Description: string;
  LowProfileId: string;
  TranzactionId: number;
  ReturnValue: string;
  Operation: string;
  TokenInfo?: { Token: string; TokenExDate: string; CardYear: number; CardMonth: number; TokenApprovalNumber?: string };
  DocumentInfo?: { ResponseCode: number; DocumentType: string; DocumentNumber: number; DocumentUrl: string | null };
  TranzactionInfo?: { ResponseCode: number; Amount: number; ApprovalNumber: string; Token: string; Last4CardDigitsString?: string; CardName?: string };
}

// Step 2: verify a finished low-profile deal server-to-server (authoritative).
export function getLpResult(lowProfileId: string): Promise<CardcomResult<LpResult>> {
  const c = creds();
  if (!c) return Promise.resolve({ ok: false, data: {} as never, error: "CARDCOM creds not set" });
  return call("LowProfile/GetLpResult", { TerminalNumber: c.terminal, ApiName: c.apiName, LowProfileId: lowProfileId });
}

// Step 3: charge a stored token for an arbitrary amount (recurring). expMMYY comes
// from the saved CardMonth/CardYear (use toMMYY). externalUniqId must be unique per
// intended charge - a repeat returns the ORIGINAL result instead of double-charging.
export function chargeToken(o: {
  token: string;
  expMMYY: string;
  amountIls: number;
  externalUniqId: string;
  doc?: DocInput;
}): Promise<CardcomResult<{ ResponseCode: number; Description: string; TranzactionId: number; ApprovalNumber: string; Token: string; DocumentUrl?: string }>> {
  const c = creds();
  if (!c) return Promise.resolve({ ok: false, data: {} as never, error: "CARDCOM creds not set" });
  return call("Transactions/Transaction", {
    TerminalNumber: c.terminal,
    ApiName: c.apiName,
    Amount: o.amountIls,
    Token: o.token,
    CardExpirationMMYY: o.expMMYY,
    ExternalUniqTranId: o.externalUniqId,
    ExternalUniqTranIdResponse: true,   // dup id -> return original result, don't recharge
    NumOfPayments: 1,
    ...(o.doc ? { Document: buildDoc(o.doc) } : {}),
    ...(c.apiPassword ? { Advanced: { ApiPassword: c.apiPassword } } : {}),
  });
}
