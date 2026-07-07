// Public: compute REAL free appointment slots server-side. The client renders,
// the server decides (mirrors orders-create's server-authoritative stance).
// Subtracts existing appointments, blackouts and cached external busy from the
// staff's working hours, applying the service's buffers / notice window.
// verify_jwt = false (storefront visitors are anonymous).

import { createClient } from "npm:@supabase/supabase-js@2";
import { generateSlots, localMinutesToUtc, type Interval } from "../_shared/booking/availability.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface ReqBody {
  businessId: string;
  serviceId: string;
  staffId?: string;
  fromDate: string; // YYYY-MM-DD (inclusive)
  toDate: string;   // YYYY-MM-DD (inclusive)
}

const DAY = 86_400_000;
const ymd = (ms: number) => new Date(ms).toISOString().slice(0, 10);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: ReqBody;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const { businessId, serviceId, staffId, fromDate, toDate } = body;
  if (!businessId || !serviceId || !fromDate || !toDate) {
    return json({ error: "businessId, serviceId, fromDate, toDate are required" }, 400);
  }

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Service (validate it belongs to a published business + is active)
  const { data: service } = await admin
    .from("booking_services")
    .select("id, business_id, duration_minutes, buffer_before_minutes, buffer_after_minutes, min_notice_minutes, max_advance_days, active")
    .eq("id", serviceId).eq("business_id", businessId).maybeSingle();
  if (!service || !service.active) return json({ error: "Service not found" }, 404);

  // Which staff can perform it (optionally narrowed to one)
  let staffQ = admin.from("booking_service_staff").select("staff_id").eq("service_id", serviceId);
  if (staffId) staffQ = staffQ.eq("staff_id", staffId);
  const { data: staffLinks } = await staffQ;
  const staffIds = (staffLinks ?? []).map((r: { staff_id: string }) => r.staff_id);
  if (staffIds.length === 0) return json({ slotsByStaff: {}, slots: [] });

  const { data: staffRows } = await admin
    .from("booking_staff").select("id, timezone, active").in("id", staffIds);
  const staff = (staffRows ?? []).filter((s: { active: boolean }) => s.active);

  // Window bounds (clamp to now+minNotice .. now+maxAdvance)
  const now = Date.now();
  const minStart = now + (service.min_notice_minutes ?? 0) * 60_000;
  const maxStart = now + (service.max_advance_days ?? 60) * DAY;
  const fromMs = Date.parse(`${fromDate}T00:00:00Z`);
  const toMs = Date.parse(`${toDate}T00:00:00Z`) + DAY;

  const slotsByStaff: Record<string, number[]> = {};

  for (const st of staff) {
    const tz = st.timezone || "Asia/Jerusalem";

    const [{ data: hours }, { data: appts }, { data: blackouts }, { data: busy }] = await Promise.all([
      admin.from("booking_working_hours").select("weekday, start_minute, end_minute").eq("staff_id", st.id),
      admin.from("booking_appointments").select("starts_at, ends_at")
        .eq("staff_id", st.id).in("status", ["pending", "confirmed"])
        .lt("starts_at", new Date(toMs).toISOString()).gt("ends_at", new Date(fromMs).toISOString()),
      admin.from("booking_blackouts").select("starts_at, ends_at")
        .or(`staff_id.eq.${st.id},staff_id.is.null`).eq("business_id", businessId)
        .lt("starts_at", new Date(toMs).toISOString()).gt("ends_at", new Date(fromMs).toISOString()),
      admin.from("calendar_busy_blocks").select("starts_at, ends_at").eq("staff_id", st.id)
        .lt("starts_at", new Date(toMs).toISOString()).gt("ends_at", new Date(fromMs).toISOString()),
    ]);

    // Resolve weekly local hours -> concrete UTC working intervals per date in window
    const workingIntervals: Interval[] = [];
    for (let d = fromMs; d < toMs; d += DAY) {
      const date = ymd(d);
      const weekday = new Date(d).getUTCDay(); // window days are UTC midnights; weekday stable enough for IL
      for (const h of hours ?? []) {
        if (h.weekday !== weekday) continue;
        workingIntervals.push({
          start: localMinutesToUtc(date, h.start_minute, tz),
          end: localMinutesToUtc(date, h.end_minute, tz),
        });
      }
    }

    const toIv = (rows: { starts_at: string; ends_at: string }[] | null): Interval[] =>
      (rows ?? []).map((r) => ({ start: Date.parse(r.starts_at), end: Date.parse(r.ends_at) }));
    const busyAll = [...toIv(appts), ...toIv(blackouts), ...toIv(busy)];

    slotsByStaff[st.id] = generateSlots(workingIntervals, busyAll, {
      durationMin: service.duration_minutes,
      bufferBeforeMin: service.buffer_before_minutes,
      bufferAfterMin: service.buffer_after_minutes,
      granularityMin: Math.min(30, service.duration_minutes),
      minStart, maxStart,
    });
  }

  // Merged unique slot list (any staff) for a simple UI, plus per-staff for assignment.
  const merged = Array.from(new Set(Object.values(slotsByStaff).flat())).sort((a, b) => a - b);
  return json({
    serviceId,
    slots: merged.map((ms) => new Date(ms).toISOString()),
    slotsByStaff: Object.fromEntries(
      Object.entries(slotsByStaff).map(([k, v]) => [k, v.map((ms) => new Date(ms).toISOString())]),
    ),
  });
});
