import { supabase } from "@/integrations/supabase/client";

// First-touch UTM attribution for SIANGO's own acquisition marketing. When a
// visitor lands on the Siango site from an ad (?utm_source=facebook&...), we:
//   1. remember the FIRST-touch UTM in localStorage (so it survives until they
//      sign up, even days later), and
//   2. record an ad "visit" (the click) in siango_ad_visits for the admin funnel.
// At signup the stored UTM is attached to the user so signups can be attributed
// back to the channel/campaign that produced them.

const UTM_KEY = "siango-utm";
const VISITOR_KEY = "siango-visitor";
const VISIT_SENT_KEY = "siango-utm-visit-sent";

export interface StoredUtm {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
}

function visitorId(): string {
  try {
    let v = localStorage.getItem(VISITOR_KEY);
    if (!v) {
      v = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(VISITOR_KEY, v);
    }
    return v;
  } catch {
    return "anon";
  }
}

/** Read the stored first-touch UTM (for attaching to a signup). */
export function getStoredUtm(): StoredUtm {
  try {
    const raw = localStorage.getItem(UTM_KEY);
    return raw ? (JSON.parse(raw) as StoredUtm) : {};
  } catch {
    return {};
  }
}

/**
 * Capture UTM params from the current URL. Stores first-touch (never overwrites)
 * and records one ad-visit per UTM signature per session. Safe to call on every
 * app load - it no-ops when there are no utm params.
 */
export function captureUtm(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: StoredUtm = {
      utm_source: params.get("utm_source") || undefined,
      utm_medium: params.get("utm_medium") || undefined,
      utm_campaign: params.get("utm_campaign") || undefined,
      utm_content: params.get("utm_content") || undefined,
    };
    if (!utm.utm_source) return; // nothing to attribute

    // First-touch wins: only store if we don't already have one.
    if (!localStorage.getItem(UTM_KEY)) {
      localStorage.setItem(UTM_KEY, JSON.stringify(utm));
    }

    // Record the ad click/visit once per UTM signature per session.
    const sig = `${utm.utm_source}|${utm.utm_campaign || ""}|${utm.utm_content || ""}`;
    const sent = sessionStorage.getItem(VISIT_SENT_KEY);
    if (sent !== sig) {
      sessionStorage.setItem(VISIT_SENT_KEY, sig);
      void (supabase as any).from("siango_ad_visits").insert({
        visitor_id: visitorId(),
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium || null,
        utm_campaign: utm.utm_campaign || null,
        utm_content: utm.utm_content || null,
        path: window.location.pathname,
      });
    }
  } catch {
    /* non-fatal - attribution is best-effort */
  }
}
