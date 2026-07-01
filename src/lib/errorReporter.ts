import { supabase } from "@/integrations/supabase/client";

// Lightweight client error reporter: forwards uncaught errors to the
// report-error edge function, which emails the admins. Throttled and
// deduped so a broken page can't trigger an email storm. Production only.

const seen = new Set<string>();
let sentCount = 0;
const MAX_PER_SESSION = 8;

// Common browser/extension noise that is not actionable.
const IGNORE = [
  "ResizeObserver loop",
  "Script error.",
  "Non-Error promise rejection captured",
  "Load failed",
  "Failed to fetch dynamically imported module",
  // Cloudflare's analytics beacon calls Array.prototype.at() which doesn't exist on
  // very old browsers (Chrome < 92) - it's their script, not ours.
  "this.i.at is not a function",
  // Benign aborts: a fetch/promise cancelled because the user navigated away,
  // backgrounded the tab, or an AbortController fired (common on mobile Safari).
  // Not a bug - just noise.
  "The operation was aborted",
  "AbortError",
  "The user aborted a request",
  "signal is aborted",
];

// Errors thrown inside third-party scripts (analytics beacons, tag managers, pixels)
// are not our bugs and not actionable - never email them.
const THIRD_PARTY_SOURCES = [
  "cloudflareinsights.com",
  "googletagmanager.com",
  "google-analytics.com",
  "connect.facebook.net",
  "static.hotjar.com",
  "analytics.tiktok.com",
];

const isProd = () => {
  const h = window.location.hostname;
  return h !== "localhost" && h !== "127.0.0.1" && !h.endsWith(".local");
};

export const reportError = (
  message: string,
  opts?: { stack?: string; kind?: string; context?: string },
) => {
  try {
    if (!message || !isProd()) return;
    if (sentCount >= MAX_PER_SESSION) return;
    if (IGNORE.some((p) => message.includes(p))) return;
    // Skip errors whose stack originates in a third-party script (not our code).
    if (opts?.stack && THIRD_PARTY_SOURCES.some((d) => opts.stack!.includes(d))) return;
    const sig = `${opts?.kind || "error"}:${message}`.slice(0, 300);
    if (seen.has(sig)) return;
    seen.add(sig);
    sentCount++;
    void supabase.functions.invoke("report-error", {
      body: {
        message: message.slice(0, 500),
        stack: opts?.stack?.slice(0, 6000),
        kind: opts?.kind || "error",
        context: opts?.context,
        url: window.location.href,
        userAgent: navigator.userAgent,
      },
    });
  } catch {
    /* reporting must never throw */
  }
};

let installed = false;
export const installGlobalErrorReporting = () => {
  if (installed) return;
  installed = true;
  window.addEventListener("error", (e) => {
    reportError(e.message || "window.error", {
      kind: "window.onerror",
      stack: (e.error && e.error.stack) || `${e.filename}:${e.lineno}:${e.colno}`,
    });
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason as { message?: string; stack?: string } | string | undefined;
    const msg = typeof reason === "string" ? reason : reason?.message || "unhandledrejection";
    reportError(msg, {
      kind: "unhandledrejection",
      stack: typeof reason === "object" ? reason?.stack : undefined,
    });
  });
};
