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
