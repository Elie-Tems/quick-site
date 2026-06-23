/**
 * Tenant subdomain detection.
 *
 * Each published store can be served from a short subdomain of the platform
 * domain, e.g. `aurora.siango.app` instead of `siango.app/store/aurora`.
 *
 * Security model (why this is safe):
 *  - We never create a DNS record per store. A single wildcard `*.siango.app`
 *    points at the app, and this helper maps the Host header → store slug at
 *    runtime. There is no dangling record to take over (no subdomain takeover).
 *  - System names (app, admin, api, mail…) are reserved and can never resolve to
 *    a tenant store, so a tenant can't impersonate platform infrastructure.
 *  - Auth/session cookies must be scoped to the dedicated app host (see
 *    `app.siango.app`), NOT to the apex, so a tenant subdomain can never read
 *    a logged-in platform session.
 */

// System subdomains that can never be a tenant store slug.
export const RESERVED_SUBDOMAINS = new Set<string>([
  "www", "app", "api", "admin", "dashboard", "auth", "login", "account",
  "mail", "email", "smtp", "imap", "ftp", "ns", "ns1", "ns2",
  "cdn", "assets", "static", "img", "images", "media", "files", "uploads",
  "blog", "help", "support", "docs", "status", "about", "contact",
  "dev", "staging", "stage", "test", "demo", "sandbox", "preview",
  "manage", "internal", "billing", "pay", "payments", "checkout", "store",
  "go", "link", "links", "track", "analytics", "metrics",
]);

// The platform apex domain. Tenant stores live exactly one label below it.
// Overridable per environment (e.g. a staging apex) via VITE_BASE_DOMAIN.
const BASE_DOMAIN = (import.meta.env.VITE_BASE_DOMAIN as string | undefined) || "siango.app";

/**
 * Returns the tenant store slug for a hostname, or null when the host is the
 * apex, a reserved/system subdomain, localhost, a raw IP, or anything that
 * isn't a single-label subdomain of the base domain.
 *
 *   aurora.siango.app   -> "aurora"
 *   siango.app          -> null   (apex)
 *   app.siango.app      -> null   (reserved)
 *   a.b.siango.app      -> null   (multi-level)
 *   localhost               -> null   (dev)
 */
export function getTenantSlug(hostname: string = window.location.hostname): string | null {
  const host = hostname.toLowerCase().replace(/\.$/, "");

  // Local development and raw-IP hosts never carry a tenant subdomain.
  if (host === "localhost" || host.endsWith(".localhost") || /^[\d.]+$/.test(host)) {
    return null;
  }

  const suffix = "." + BASE_DOMAIN;
  if (!host.endsWith(suffix)) return null;

  const label = host.slice(0, -suffix.length);
  if (!label) return null;              // the apex itself
  if (label.includes(".")) return null; // multi-level subdomain — not a tenant
  if (RESERVED_SUBDOMAINS.has(label)) return null;

  return label;
}

/** True when the current (or given) hostname is a tenant store subdomain. */
export function isTenantSubdomain(hostname?: string): boolean {
  return getTenantSlug(hostname) !== null;
}
