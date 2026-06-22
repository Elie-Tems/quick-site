/**
 * Email send abstraction — the single seam where an ESP plugs in later.
 *
 * IMPORTANT: real sending must happen SERVER-SIDE (a Supabase edge function),
 * never from the browser, so the ESP API key is never exposed. This module
 * defines the provider CONTRACT and a safe no-op default. When an ESP is chosen
 * (Smoove / ActiveTrail / Resend …), implement an `EmailProvider` inside the
 * edge function and call sendEmail there — the rest of the codebase (templates,
 * sequences) stays unchanged.
 */

export interface OutgoingEmail {
  to: string;
  subject: string;
  /** Full RTL HTML from renderEmail(). */
  html: string;
  fromName: string;
  fromEmail?: string;
  replyTo?: string;
  /** RFC 8058 one-click unsubscribe header value (HTTPS endpoint). */
  listUnsubscribe?: string;
}

export interface SendResult {
  ok: boolean;
  id?: string;
  skipped?: boolean;
  error?: string;
}

export interface EmailProvider {
  name: string;
  send(email: OutgoingEmail): Promise<SendResult>;
}

let provider: EmailProvider | null = null;

/** Wire the chosen ESP (called once, inside the edge function). */
export const setEmailProvider = (p: EmailProvider): void => {
  provider = p;
};

export const getEmailProvider = (): EmailProvider | null => provider;

/**
 * Send an email through the configured provider. If none is configured yet
 * (current state — no ESP chosen), it safely no-ops and reports skipped, so the
 * rest of the system can be built and tested without a live provider.
 */
export async function sendEmail(email: OutgoingEmail): Promise<SendResult> {
  if (!provider) {
    console.warn(`[email] no ESP configured — skipped send to ${email.to} ("${email.subject}")`);
    return { ok: false, skipped: true };
  }
  try {
    return await provider.send(email);
  } catch (err) {
    console.error("[email] provider send failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "send failed" };
  }
}
