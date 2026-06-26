// Twilio WhatsApp helper (BSP for Siango's WhatsApp Business Platform).
// Pay-per-use, no upfront cost. Secrets (set before go-live, NOT yet):
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and either a per-business sender
//   (whatsapp_accounts.phone_number) or TWILIO_WHATSAPP_FROM for the platform bot.
//
// BUILD-ONLY: this module is ready to deploy but the WhatsApp feature is not
// activated until Moti approves (see [[siango-whatsapp]] deploy rule).

const TWILIO_BASE = "https://api.twilio.com/2010-04-01";

export interface TwilioCreds {
  accountSid: string;
  authToken: string;
}

export function twilioCreds(): TwilioCreds | null {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!accountSid || !authToken) return null;
  return { accountSid, authToken };
}

const wa = (phone: string) => (phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`);

export interface SendResult {
  ok: boolean;
  sid?: string;
  status?: string;
  error?: string;
  skipped?: boolean;
}

/** Send a freeform WhatsApp message (only valid inside the 24h service window).
 *  Pass mediaUrl to attach an image/video/document (publicly reachable URL). */
export async function sendWhatsAppText(
  creds: TwilioCreds,
  from: string,
  to: string,
  body: string,
  mediaUrl?: string,
): Promise<SendResult> {
  const params: Record<string, string> = { From: wa(from), To: wa(to) };
  if (body) params.Body = body;
  if (mediaUrl) params.MediaUrl = mediaUrl;
  return await postMessage(creds, params);
}

/** Send a pre-approved template (Twilio Content API) - required outside the 24h window. */
export async function sendWhatsAppTemplate(
  creds: TwilioCreds,
  from: string,
  to: string,
  contentSid: string,
  variables?: Record<string, string>,
): Promise<SendResult> {
  const params: Record<string, string> = { From: wa(from), To: wa(to), ContentSid: contentSid };
  if (variables && Object.keys(variables).length) params.ContentVariables = JSON.stringify(variables);
  return await postMessage(creds, params);
}

async function postMessage(creds: TwilioCreds, params: Record<string, string>): Promise<SendResult> {
  // Status callbacks let whatsapp-webhook update delivered/read/failed + cost.
  const statusCb = Deno.env.get("TWILIO_STATUS_CALLBACK");
  if (statusCb) params.StatusCallback = statusCb;
  try {
    const res = await fetch(`${TWILIO_BASE}/Accounts/${creds.accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${creds.accountSid}:${creds.authToken}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: j?.message || `Twilio HTTP ${res.status}`, status: String(j?.status || res.status) };
    return { ok: true, sid: j?.sid, status: j?.status };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "twilio error" };
  }
}

/** Strip the "whatsapp:" prefix from an inbound number -> E.164. */
export const toE164 = (waNumber: string): string => (waNumber || "").replace(/^whatsapp:/, "").trim();
