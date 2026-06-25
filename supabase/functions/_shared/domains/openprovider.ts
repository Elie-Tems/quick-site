// Openprovider reseller helpers, shared by the domain edge functions.
// Provider-agnostic by intent: the domain flow talks to this module, so adding
// a second registrar (e.g. an Israeli .co.il registrar, OpenSRS) later means
// implementing the same shape behind a `provider` switch - the callers stay put.
//
// Auth: Openprovider mints a bearer token from the account username + password
// (Supabase secrets OPENPROVIDER_USERNAME / OPENPROVIDER_PASSWORD).

const OP_BASE = "https://api.openprovider.eu/v1beta";

export interface OpResult<T> {
  ok: boolean;
  data?: T;
  /** True when the failure is specifically "not enough reseller balance". */
  insufficientFunds?: boolean;
  error?: string;
  code?: number;
}

let cachedToken: { token: string; exp: number } | null = null;

export async function opToken(): Promise<string> {
  // Openprovider tokens last ~hours; cache within a single function invocation.
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
  const username = Deno.env.get("OPENPROVIDER_USERNAME");
  const password = Deno.env.get("OPENPROVIDER_PASSWORD");
  if (!username || !password) throw new Error("OPENPROVIDER credentials not set");
  const res = await fetch(`${OP_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const j = await res.json().catch(() => ({}));
  const token = j?.data?.token;
  if (!token) throw new Error(`Openprovider auth failed: ${j?.desc || res.status}`);
  cachedToken = { token, exp: Date.now() + 50 * 60_000 };
  return token;
}

async function opFetch(path: string, method: string, body?: unknown): Promise<{ status: number; json: any }> {
  const token = await opToken();
  const res = await fetch(`${OP_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

// Openprovider error codes that mean "your reseller balance is too low".
// 837 = "Not enough money on the balance"; we also string-match defensively.
function isInsufficientFunds(code: unknown, desc: unknown): boolean {
  const c = Number(code);
  if (c === 837) return true;
  const d = String(desc || "").toLowerCase();
  return d.includes("not enough money") || d.includes("insufficient") || d.includes("balance");
}

/** Single-domain availability + reseller price (server-side source of truth for the buy flow). */
export async function opCheckOne(name: string, extension: string): Promise<OpResult<{ available: boolean; costUsd: number | null }>> {
  const { status, json } = await opFetch("/domains/check", "POST", {
    domains: [{ name, extension }],
    with_price: true,
  });
  if (status >= 400) return { ok: false, error: json?.desc || `check failed (${status})`, code: json?.code };
  const r = (json?.data?.results || [])[0];
  if (!r) return { ok: false, error: "no result" };
  const costUsd = typeof r.price === "number" ? r.price : r?.price?.reseller?.price ?? null;
  return { ok: true, data: { available: r.status === "free", costUsd } };
}

export interface RegistrantInput {
  name: string;        // full name of the registrant (customer)
  email: string;
  phone: string;       // E.164-ish, e.g. +972501234567
  address: string;
  city: string;
  zip: string;
  country?: string;    // ISO-2, default IL
}

/** Create (or reuse) an Openprovider customer handle for the registrant. Returns the handle. */
export async function opCreateCustomer(reg: RegistrantInput): Promise<OpResult<{ handle: string }>> {
  const country = (reg.country || "IL").toUpperCase();
  // Split a full name into first/last; Openprovider requires both.
  const parts = reg.name.trim().split(/\s+/);
  const firstName = parts[0] || reg.name;
  const lastName = parts.slice(1).join(" ") || parts[0] || "-";
  // Normalise phone to country code + subscriber number (Openprovider wants parts).
  const phone = normalizePhone(reg.phone, country);

  const { status, json } = await opFetch("/customers", "POST", {
    company_name: "",
    name: { first_name: firstName, last_name: lastName },
    email: reg.email,
    phone,
    address: {
      street: reg.address || "-",
      number: "1",
      zipcode: reg.zip || "0000000",
      city: reg.city || "-",
      country,
    },
  });
  if (status >= 400) {
    return { ok: false, error: json?.desc || `customer create failed (${status})`, code: json?.code };
  }
  const handle = json?.data?.handle;
  if (!handle) return { ok: false, error: "no handle returned" };
  return { ok: true, data: { handle } };
}

export interface RegisterInput {
  name: string;
  extension: string;
  ownerHandle: string;
  period?: number;        // years, default 1
  nameServers?: string[]; // FQDNs; defaults to Openprovider DNS if omitted
}

/** Register a domain. Returns the Openprovider order id. Flags insufficient funds. */
export async function opRegisterDomain(input: RegisterInput): Promise<OpResult<{ orderId: string; expiresAt: string | null }>> {
  const body: Record<string, unknown> = {
    domain: { name: input.name, extension: input.extension },
    period: input.period ?? 1,
    owner_handle: input.ownerHandle,
    admin_handle: input.ownerHandle,
    tech_handle: input.ownerHandle,
    billing_handle: input.ownerHandle,
    autorenew: "default",
  };
  if (input.nameServers && input.nameServers.length) {
    body.name_servers = input.nameServers.map((ns) => ({ name: ns }));
  }
  const { status, json } = await opFetch("/domains", "POST", body);
  if (status >= 400) {
    const funds = isInsufficientFunds(json?.code, json?.desc);
    return { ok: false, error: json?.desc || `register failed (${status})`, code: json?.code, insufficientFunds: funds };
  }
  const orderId = String(json?.data?.id ?? "");
  const expiresAt = json?.data?.expiration_date ? new Date(json.data.expiration_date).toISOString() : null;
  return { ok: true, data: { orderId, expiresAt } };
}

/** Point the domain's DNS zone at the Siango store host (CNAME apex+www to the tenant subdomain). */
export async function opSetDnsToHost(name: string, extension: string, targetHost: string): Promise<OpResult<unknown>> {
  // Create a zone with A/CNAME records that resolve the domain to the store.
  // CNAME at apex isn't universally valid; we use Openprovider's "url forwarding"
  // friendly setup: www CNAME -> target, and apex via the provider's web forwarding.
  const { status, json } = await opFetch("/dns/zones", "POST", {
    name: `${name}.${extension}`,
    type: "master",
    records: [
      { type: "CNAME", name: "www", value: targetHost, ttl: 3600 },
      { type: "CNAME", name: "@", value: targetHost, ttl: 3600 },
    ],
  });
  if (status >= 400) return { ok: false, error: json?.desc || `dns zone failed (${status})`, code: json?.code };
  return { ok: true, data: json?.data };
}

/** Reseller account balance (for low-balance monitoring + the admin dashboard).
 *  The REST v1beta API does NOT expose balance, so we use the legacy XML API
 *  (retrieveResellerRequest), which returns <balance> + <currency>. Auth is the
 *  same account username + password. Best-effort: returns ok:false on any issue
 *  (e.g. legacy API disabled) without throwing, so monitoring degrades quietly. */
export async function opGetBalance(): Promise<OpResult<{ balance: number; currency: string }>> {
  const username = Deno.env.get("OPENPROVIDER_USERNAME");
  const password = Deno.env.get("OPENPROVIDER_PASSWORD");
  if (!username || !password) return { ok: false, error: "OPENPROVIDER credentials not set" };
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<openXML><credentials><username>${esc(username)}</username><password>${esc(password)}</password></credentials>` +
    `<retrieveResellerRequest></retrieveResellerRequest></openXML>`;
  let body = "";
  try {
    const res = await fetch("https://api.openprovider.eu/", {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=UTF-8" },
      body: xml,
    });
    body = await res.text();
  } catch (e) {
    return { ok: false, error: `legacy balance fetch failed: ${e instanceof Error ? e.message : e}` };
  }
  // Parse <balance> and <currency> out of the XML response.
  const pick = (tag: string) => {
    const m = body.match(new RegExp(`<${tag}>\\s*([^<]*)\\s*</${tag}>`, "i"));
    return m ? m[1].trim() : null;
  };
  const balanceStr = pick("balance");
  if (balanceStr == null) {
    const desc = pick("desc") || pick("error") || "balance not in response";
    return { ok: false, error: `legacy balance: ${desc}` };
  }
  const balance = Number(balanceStr);
  const currency = pick("currency") || "USD";
  if (!Number.isFinite(balance)) return { ok: false, error: "balance not numeric" };
  return { ok: true, data: { balance, currency } };
}

function normalizePhone(raw: string, country: string): { country_code: string; area_code: string; subscriber_number: string } {
  let p = (raw || "").replace(/[^\d+]/g, "");
  // Israeli local 0xx... -> +972xx...
  if (p.startsWith("0") && country === "IL") p = "+972" + p.slice(1);
  if (!p.startsWith("+")) p = "+972" + p.replace(/^0/, "");
  const m = p.match(/^(\+\d{1,3})(\d+)$/);
  const cc = m ? m[1] : "+972";
  const rest = m ? m[2] : p.replace(/\D/g, "");
  return {
    country_code: cc,
    area_code: rest.slice(0, 2),
    subscriber_number: rest.slice(2) || rest,
  };
}
