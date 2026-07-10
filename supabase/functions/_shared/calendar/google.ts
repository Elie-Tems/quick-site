// Minimal Google Calendar API client for two-way sync.
//   OAuth: authorization-code + refresh-token (offline access).
//   Inbound  : events.list (singleEvents) -> busy blocks.
//   Outbound : events.insert / events.delete for our appointments.
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI.

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "openid", "email",
].join(" ");

export function googleAuthUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
    redirect_uri: Deno.env.get("GOOGLE_REDIRECT_URI") ?? "",
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent", // force a refresh_token on every (re)connect
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  id_token?: string;
}

export async function exchangeCode(code: string): Promise<GoogleTokens> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      redirect_uri: Deno.env.get("GOOGLE_REDIRECT_URI") ?? "",
      grant_type: "authorization_code",
    }),
  });
  if (!r.ok) throw new Error(`google token exchange failed: ${r.status} ${await r.text()}`);
  return await r.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) throw new Error(`google token refresh failed: ${r.status} ${await r.text()}`);
  return await r.json();
}

/** Decode the email claim from an id_token without verifying (informational only). */
export function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(atob(idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.email ?? null;
  } catch { return null; }
}

export interface GBusyEvent {
  id: string;
  start: string; // ISO
  end: string;   // ISO
  allDay: boolean;
  etag?: string;
}

/** List events in [timeMin,timeMax) as busy blocks (skips transparent/free). */
export async function listBusy(accessToken: string, calendarId: string, timeMin: string, timeMax: string): Promise<GBusyEvent[]> {
  const p = new URLSearchParams({
    timeMin, timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "2500",
    showDeleted: "false",
  });
  const r = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${p}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!r.ok) throw new Error(`google events.list failed: ${r.status} ${await r.text()}`);
  const j = await r.json();
  const out: GBusyEvent[] = [];
  for (const e of j.items ?? []) {
    if (e.status === "cancelled" || e.transparency === "transparent") continue;
    const allDay = !!e.start?.date;
    const start = e.start?.dateTime ?? (e.start?.date ? `${e.start.date}T00:00:00Z` : null);
    const end = e.end?.dateTime ?? (e.end?.date ? `${e.end.date}T00:00:00Z` : null);
    if (!start || !end) continue;
    out.push({ id: e.id, start, end, allDay, etag: e.etag });
  }
  return out;
}

/** Create an event for one of our appointments; returns the Google event id. */
export async function insertEvent(accessToken: string, calendarId: string, ev: {
  summary: string; description?: string; startIso: string; endIso: string; timezone: string;
}): Promise<string> {
  const r = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: ev.summary,
        description: ev.description ?? "",
        start: { dateTime: ev.startIso, timeZone: ev.timezone },
        end: { dateTime: ev.endIso, timeZone: ev.timezone },
      }),
    },
  );
  if (!r.ok) throw new Error(`google events.insert failed: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.id as string;
}

export async function deleteEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
  const r = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  // 404/410 = already gone; treat as success (idempotent).
  if (!r.ok && r.status !== 404 && r.status !== 410) {
    throw new Error(`google events.delete failed: ${r.status} ${await r.text()}`);
  }
}
