// Cloudflare for SaaS "custom hostnames" helper - lets a merchant's PURCHASED
// domain (e.g. myshop.co) serve their Siango store over HTTPS with an auto-issued
// SSL cert. The domain's DNS already CNAMEs to `${slug}.siango.app` (set at
// registration via Openprovider); Cloudflare additionally needs the hostname
// REGISTERED as a custom hostname on the siango.app zone, or its edge returns an
// SSL/host mismatch for the unknown domain.
//
// GATED + DORMANT until set up: returns { configured:false } unless BOTH
// CLOUDFLARE_API_TOKEN (scope: SSL and Certificates:Edit on the zone) and
// CLOUDFLARE_ZONE_ID (the siango.app zone id) are set, AND "Cloudflare for SaaS"
// is enabled on the account with a fallback origin configured. Verified shapes
// from Cloudflare API v4 docs; UNTESTED against the live account - run one real
// provision + check the returned ssl.status before relying on it.

const API = "https://api.cloudflare.com/client/v4";

export interface CfCustomHostname {
  id: string;
  hostname: string;
  sslStatus: string;                       // "pending_validation" | "active" | ...
  ownershipVerification?: { name?: string; value?: string; type?: string };
}

function creds(): { token: string; zoneId: string } | null {
  const token = Deno.env.get("CLOUDFLARE_API_TOKEN");
  const zoneId = Deno.env.get("CLOUDFLARE_ZONE_ID");
  if (!token || !zoneId) return null;
  return { token, zoneId };
}

async function cf(path: string, method: string, token: string, body?: unknown) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await r.json().catch(() => ({}));
  return { ok: r.ok && json?.success !== false, status: r.status, json };
}

/** Register a custom hostname (idempotent-ish: Cloudflare returns the existing one
 *  if already present). Returns { configured:false } when not set up. */
export async function cfAddCustomHostname(
  hostname: string,
): Promise<{ configured: boolean; ok?: boolean; error?: string; data?: CfCustomHostname }> {
  const c = creds();
  if (!c) return { configured: false };
  const { ok, json } = await cf(`/zones/${c.zoneId}/custom_hostnames`, "POST", c.token, {
    hostname,
    ssl: { method: "http", type: "dv", settings: { min_tls_version: "1.2" } },
  });
  if (!ok) return { configured: true, ok: false, error: json?.errors?.[0]?.message || "cloudflare_error" };
  const r = json.result;
  return {
    configured: true, ok: true,
    data: {
      id: r.id, hostname: r.hostname, sslStatus: r.ssl?.status || "pending",
      ownershipVerification: r.ownership_verification,
    },
  };
}

/** Check the SSL/validation status of an existing custom hostname. */
export async function cfGetCustomHostnameStatus(
  hostname: string,
): Promise<{ configured: boolean; ok?: boolean; data?: CfCustomHostname | null }> {
  const c = creds();
  if (!c) return { configured: false };
  const { ok, json } = await cf(`/zones/${c.zoneId}/custom_hostnames?hostname=${encodeURIComponent(hostname)}`, "GET", c.token);
  if (!ok) return { configured: true, ok: false };
  const r = Array.isArray(json.result) ? json.result[0] : null;
  return {
    configured: true, ok: true,
    data: r ? { id: r.id, hostname: r.hostname, sslStatus: r.ssl?.status || "pending", ownershipVerification: r.ownership_verification } : null,
  };
}
