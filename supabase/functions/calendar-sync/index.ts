// Two-way Google Calendar sync. verify_jwt=false; authenticated EITHER by the
// CRON_SECRET header (scheduled full sync of every active connection) OR by a
// merchant JWT + connectionId they own ("sync now" from the dashboard).
//
//   INBOUND : Google events -> calendar_busy_blocks (so external commitments block
//             our availability). Replaced per-connection each run within the window.
//   OUTBOUND: our confirmed/pending appointments without a google_event_id ->
//             events.insert, storing google_event_id + sync_state='synced'.
//
// Idempotent: re-running only fills gaps. Microsoft connections are skipped for now.

import { createClient } from "npm:@supabase/supabase-js@2";
import { refreshAccessToken, listBusy, insertEvent } from "../_shared/calendar/google.ts";
import { decryptToken, encryptToken } from "../_shared/calendar/crypto.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const WINDOW_DAYS = 60;

// deno-lint-ignore no-explicit-any
async function syncConnection(admin: any, conn: any): Promise<{ inbound: number; outbound: number; error?: string }> {
  try {
    // Fresh access token (refresh if expiring within 2 min).
    let accessToken: string;
    const expMs = conn.token_expires_at ? Date.parse(conn.token_expires_at) : 0;
    if (expMs - Date.now() < 120_000) {
      if (!conn.refresh_token_enc) throw new Error("no refresh token; needs reauth");
      const refreshed = await refreshAccessToken(await decryptToken(conn.refresh_token_enc));
      accessToken = refreshed.access_token;
      await admin.from("calendar_connections").update({
        access_token_enc: await encryptToken(refreshed.access_token),
        token_expires_at: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000).toISOString(),
      }).eq("id", conn.id);
    } else {
      accessToken = await decryptToken(conn.access_token_enc);
    }

    const calId = conn.primary_calendar_id || "primary";
    const now = Date.now();
    const timeMin = new Date(now).toISOString();
    const timeMax = new Date(now + WINDOW_DAYS * 86_400_000).toISOString();

    // ---- INBOUND: refresh busy blocks for this connection in the window ----
    const busy = await listBusy(accessToken, calId, timeMin, timeMax);
    await admin.from("calendar_busy_blocks").delete()
      .eq("connection_id", conn.id).gte("starts_at", timeMin).lte("starts_at", timeMax);
    if (busy.length) {
      await admin.from("calendar_busy_blocks").insert(busy.map((e) => ({
        connection_id: conn.id, business_id: conn.business_id, staff_id: conn.staff_id,
        external_event_id: e.id, starts_at: e.start, ends_at: e.end, is_all_day: e.allDay, etag: e.etag ?? null,
      })));
    }

    // ---- OUTBOUND: push our appointments that aren't on Google yet ----
    const { data: appts } = await admin.from("booking_appointments")
      .select("id, service_id, starts_at, ends_at, customer_name, status, google_event_id")
      .eq("staff_id", conn.staff_id)
      .in("status", ["pending", "confirmed"])
      .is("google_event_id", null)
      .gte("starts_at", timeMin).lte("starts_at", timeMax);

    let outbound = 0;
    for (const a of appts ?? []) {
      try {
        const { data: svc } = await admin.from("booking_services").select("name").eq("id", a.service_id).maybeSingle();
        const eventId = await insertEvent(accessToken, calId, {
          summary: `${svc?.name || "תור"} - ${a.customer_name}`,
          description: "נקבע דרך Siango",
          startIso: a.starts_at, endIso: a.ends_at, timezone: "Asia/Jerusalem",
        });
        await admin.from("booking_appointments")
          .update({ google_event_id: eventId, sync_state: "synced" }).eq("id", a.id);
        await admin.from("calendar_sync_log").insert({
          connection_id: conn.id, direction: "outbound", action: "insert",
          external_event_id: eventId, appointment_id: a.id, result: "ok",
        });
        outbound++;
      } catch (e) {
        await admin.from("calendar_sync_log").insert({
          connection_id: conn.id, direction: "outbound", action: "insert",
          appointment_id: a.id, result: "error", detail: String(e).slice(0, 500),
        });
      }
    }

    await admin.from("calendar_connections")
      .update({ last_synced_at: new Date().toISOString(), status: "active" }).eq("id", conn.id);
    return { inbound: busy.length, outbound };
  } catch (e) {
    const msg = String(e);
    const needsReauth = msg.includes("reauth") || msg.includes("invalid_grant");
    await admin.from("calendar_connections")
      .update({ status: needsReauth ? "needs_reauth" : "error" }).eq("id", conn.id);
    return { inbound: 0, outbound: 0, error: msg.slice(0, 300) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, svc);

  const cronSecret = req.headers.get("x-cron-secret");
  const isCron = cronSecret && cronSecret === Deno.env.get("CRON_SECRET");

  let body: { connectionId?: string } = {};
  try { body = await req.json(); } catch { /* empty body ok for cron */ }

  if (isCron) {
    const { data: conns } = await admin.from("calendar_connections")
      .select("*").eq("provider", "google").in("status", ["active", "error"]);
    const results = [];
    for (const c of conns ?? []) results.push(await syncConnection(admin, c));
    return json({ ok: true, synced: results.length, results });
  }

  // Merchant "sync now": require JWT + ownership of the connection.
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ") || !body.connectionId) return json({ error: "unauthorized" }, 401);
  const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "invalid session" }, 401);

  const { data: conn } = await admin.from("calendar_connections").select("*").eq("id", body.connectionId).maybeSingle();
  if (!conn) return json({ error: "connection not found" }, 404);
  const { data: biz } = await admin.from("businesses").select("owner_id").eq("id", conn.business_id).maybeSingle();
  const { data: prof } = await admin.from("profiles").select("user_id").eq("id", biz?.owner_id).maybeSingle();
  if (prof?.user_id !== user.id) return json({ error: "forbidden" }, 403);

  const result = await syncConnection(admin, conn);
  return json({ ok: !result.error, ...result });
});
