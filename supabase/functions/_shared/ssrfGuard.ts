// Shared SSRF guard for edge functions that fetch user-supplied URLs.
// Only allows public http(s) URLs; blocks loopback, link-local (cloud metadata),
// private and CGNAT ranges. Closes integer/hex IP encodings, DNS-rebinding
// (resolves the host and checks the real IPs), and redirects (each hop is
// re-validated by safeFetch). Mirrors the guard originally in analyze-website.

export function ipIsBlocked(ipRaw: string): boolean {
  const ip = ipRaw.replace(/^\[|\]$/g, "").toLowerCase();
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10 || a === 127 || a === 0 || a >= 224) return true;
    if (a === 169 && b === 254) return true;       // link-local / metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  return ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80") || ip.startsWith("::ffff:");
}

export async function isSafePublicUrl(raw: string): Promise<boolean> {
  let u: URL;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return false;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return false;
  if (/^\d+$/.test(host) || /^0x/i.test(host)) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":")) return !ipIsBlocked(host);
  if (typeof (Deno as { resolveDns?: unknown }).resolveDns === "function") {
    try {
      const ips: string[] = [];
      for (const t of ["A", "AAAA"] as const) {
        try { ips.push(...(await Deno.resolveDns(host, t))); } catch { /* no record of this type */ }
      }
      if (ips.length && ips.some((ip) => ipIsBlocked(ip))) return false;
    } catch { /* resolution unavailable -> rely on string checks + redirect validation */ }
  }
  return true;
}

// fetch that re-validates every redirect hop against the SSRF guard.
export async function safeFetch(target: string, init?: RequestInit, maxRedirects = 3): Promise<Response> {
  let current = target;
  for (let i = 0; i <= maxRedirects; i++) {
    if (!(await isSafePublicUrl(current))) throw new Error("blocked or disallowed URL");
    const res = await fetch(current, { ...init, redirect: "manual" });
    const loc = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!loc) return res;
    current = new URL(loc, current).toString();
  }
  throw new Error("too many redirects");
}
