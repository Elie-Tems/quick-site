// Resend email sender (server-side). Requires the RESEND_API_KEY secret.
// Sending domain: send.siango.app (verified in Resend, region eu-west-1).
// Keep the From on the verified subdomain; Reply-To is the public office address.

export interface OutgoingEmail {
  to: string | string[];
  subject: string;
  html: string;
  fromName?: string;   // display name, default "סיאנגו"
  fromEmail?: string;  // must be on a verified domain, default noreply@send.siango.app
  replyTo?: string;    // default office@siango.app
}

export interface SendResult { ok: boolean; id?: string; error?: string; skipped?: boolean }

export async function sendViaResend(email: OutgoingEmail): Promise<SendResult> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("[resend] RESEND_API_KEY not set — skipping send to", email.to);
    return { ok: false, skipped: true };
  }
  const from = `${email.fromName || "סיאנגו"} <${email.fromEmail || "noreply@send.siango.app"}>`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: Array.isArray(email.to) ? email.to : [email.to],
        subject: email.subject,
        html: email.html,
        reply_to: email.replyTo || "office@siango.app",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: (data as any)?.message || `HTTP ${res.status}` };
    return { ok: true, id: (data as any)?.id };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
