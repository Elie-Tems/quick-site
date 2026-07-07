// Public: create an appointment. Server-authoritative: re-validates the service,
// staff and that the slot is still free (the DB `no_staff_overlap` gist exclusion
// constraint is the hard backstop against concurrent double-booking). Creates a
// short-lived soft HOLD (pending) when a deposit is due, or a confirmed booking
// when it isn't. Deposit payment reuses the store's existing order/payment flow.
// verify_jwt = false (storefront visitors are anonymous).
//
// NOTE: customer confirmation email/WhatsApp are intentionally NOT sent here yet -
// the per-vertical email designs are pending Moti's approval. Wire notifications
// once approved (reuse _shared/email + whatsapp-send).

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface ReqBody {
  businessId: string;
  serviceId: string;
  staffId: string;
  startsAt: string; // ISO
  customer: { fullName: string; phone: string; email?: string };
  notes?: string;
}

const HOLD_MS = 10 * 60_000;

async function hmac(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: ReqBody;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const { businessId, serviceId, staffId, startsAt, customer, notes } = body;
  if (!businessId || !serviceId || !staffId || !startsAt || !customer?.fullName || !customer?.phone) {
    return json({ error: "businessId, serviceId, staffId, startsAt and customer (name+phone) are required" }, 400);
  }

  const startMs = Date.parse(startsAt);
  if (!Number.isFinite(startMs)) return json({ error: "Invalid startsAt" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Validate service (belongs to business, active) and compute price/deposit server-side.
  const { data: service } = await admin
    .from("booking_services")
    .select("id, business_id, name, duration_minutes, price, deposit_type, deposit_value, min_notice_minutes, max_advance_days, active")
    .eq("id", serviceId).eq("business_id", businessId).maybeSingle();
  if (!service || !service.active) return json({ error: "Service not found" }, 404);

  // staff performs this service?
  const { data: link } = await admin.from("booking_service_staff")
    .select("staff_id").eq("service_id", serviceId).eq("staff_id", staffId).maybeSingle();
  if (!link) return json({ error: "Staff cannot perform this service" }, 400);

  // Window guards (recompute, don't trust client)
  const now = Date.now();
  if (startMs < now + (service.min_notice_minutes ?? 0) * 60_000) return json({ error: "Too soon to book" }, 400);
  if (startMs > now + (service.max_advance_days ?? 60) * 86_400_000) return json({ error: "Too far in advance" }, 400);

  const endMs = startMs + service.duration_minutes * 60_000;

  // Server-computed deposit.
  const price = Number(service.price) || 0;
  let deposit = 0;
  if (service.deposit_type === "fixed") deposit = Number(service.deposit_value) || 0;
  else if (service.deposit_type === "percent") deposit = Math.round(price * (Number(service.deposit_value) || 0)) / 100;
  const needsDeposit = deposit > 0;

  // Insert. The gist exclusion constraint rejects an overlapping active appointment
  // for this staff -> a race for the same slot fails here with 23P01.
  const insertRes = await admin.from("booking_appointments").insert({
    business_id: businessId,
    service_id: serviceId,
    staff_id: staffId,
    starts_at: new Date(startMs).toISOString(),
    ends_at: new Date(endMs).toISOString(),
    status: needsDeposit ? "pending" : "confirmed",
    customer_name: customer.fullName,
    customer_phone: customer.phone,
    customer_email: customer.email || null,
    notes: notes || null,
    price_at_booking: price,
    deposit_amount: deposit,
    deposit_status: needsDeposit ? "pending" : "none",
    source: "storefront",
    hold_expires_at: needsDeposit ? new Date(now + HOLD_MS).toISOString() : null,
  }).select("id").single();

  if (insertRes.error) {
    const code = insertRes.error.code;
    // 23P01 = exclusion_violation (slot just taken); 23505 = unique
    if (code === "23P01" || code === "23505") return json({ error: "slot_taken" }, 409);
    return json({ error: "Could not create appointment", detail: insertRes.error.message }, 500);
  }
  const appointmentId = insertRes.data.id as string;

  // Self-cancel token (mirrors customer-orders magic-link pattern).
  const cancelSecret = Deno.env.get("BOOKING_CANCEL_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cancelToken = await hmac(cancelSecret, appointmentId);
  await admin.from("booking_appointments").update({ cancel_token: cancelToken }).eq("id", appointmentId);

  // Deposit payment: reuse the store's existing order/payment machinery. We return
  // the amount + appointment id; the storefront initiates payment via the existing
  // flow, and the payment callback confirms the appointment + clears the hold.
  // (Exact payment wiring verified during the joint deploy/test.)
  return json({
    ok: true,
    appointmentId,
    status: needsDeposit ? "pending" : "confirmed",
    needsDeposit,
    depositAmount: deposit,
    cancelToken,
  });
});
