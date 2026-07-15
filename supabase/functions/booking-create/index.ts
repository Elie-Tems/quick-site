// Public: create an appointment. Server-authoritative: re-validates the service,
// staff and that the slot is still free (the DB `no_staff_overlap` gist exclusion
// constraint is the hard backstop against concurrent double-booking). Creates a
// short-lived soft HOLD (pending) when a deposit is due, or a confirmed booking
// when it isn't. Deposit payment reuses the store's existing order/payment flow.
// verify_jwt = false (storefront visitors are anonymous).
//
// Customer confirmation email is sent for CONFIRMED bookings via the merchant-editable
// "booking_confirm" lifecycle email (the merchant can disable/reword it). Deposit
// bookings are confirmed later by payments-callback, which sends it there.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getProvider } from "../_shared/payments/registry.ts";
import { sendLifecycleEmail } from "../_shared/email/lifecycle.ts";
import { sendViaResend } from "../_shared/email/resend.ts";
import { renderEmail, h1, p, emailButton, ltr } from "../_shared/email/rtlEmail.ts";
import { siangoSender } from "../_shared/email/platformEmails.ts";

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

  // Send the customer's booking confirmation - only for a CONFIRMED appointment.
  // Best-effort; never blocks the response.
  const emailBookingConfirm = async () => {
    if (!customer.email) return;
    // Self-cancel link (HMAC token) so the customer can cancel without an account,
    // exactly what the reminder email promises ("...דרך הקישור בהזמנה").
    const siteUrl = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");
    const cancelUrl = `${siteUrl}/booking/cancel?a=${appointmentId}&t=${encodeURIComponent(cancelToken)}`;
    try {
      await sendLifecycleEmail(admin, {
        businessId, key: "booking_confirm", to: customer.email, name: customer.fullName,
        vars: { service: service.name },
        extraHtml: `<p style="margin:16px 0 0;font-size:13px;color:#6b7280">צריך לבטל את התור? <a href="${cancelUrl}" style="color:#2e8b6a;font-weight:600">לחצו כאן לביטול</a></p>`,
      });
    } catch (e) { console.warn("booking confirm email failed:", appointmentId, String(e)); }
  };

  // Notify the MERCHANT of a newly-CONFIRMED appointment (best-effort, never blocks).
  // Fires on every confirm-at-booking-time path; NOT on the deposit-PENDING path -
  // that appointment is confirmed later by payments-callback when the deposit is paid.
  const emailMerchantNewBooking = async () => {
    try {
      const { data: biz } = await admin.from("businesses")
        .select("name, email").eq("id", businessId).maybeSingle();
      if (!biz?.email) return;
      const siteUrl = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");
      const when = new Date(startMs).toLocaleString("he-IL", {
        dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jerusalem",
      });
      const html = renderEmail({
        sender: siangoSender({ siteUrl, recipientEmail: biz.email }),
        previewText: `תור חדש: ${service.name}`,
        bodyHtml:
          h1("נקבע תור חדש 📅") +
          p(`שירות: <strong>${service.name}</strong>`) +
          p(`לקוח: ${customer.fullName} · ${ltr(customer.phone)}`) +
          p(`מועד: ${when}`) +
          emailButton("צפייה ביומן", `${siteUrl}/dashboard`),
      });
      await sendViaResend({
        to: biz.email,
        subject: `תור חדש: ${service.name} - ${customer.fullName}`,
        html, fromName: "Siango",
      });
    } catch (e) { console.warn("merchant booking notify failed:", appointmentId, String(e)); }
  };

  // Deposit payment: reuse the store's existing order/payment machinery. We create
  // a pending deposit ORDER, link it to the appointment (order_id), and return a
  // hosted payment link from the merchant's own gateway. payments-callback marks
  // the order paid AND confirms the linked appointment (clearing the hold).
  if (needsDeposit) {
    const { data: business } = await admin
      .from("businesses").select("id, slug, payment_enabled, payment_provider").eq("id", businessId).maybeSingle();
    const provider = business?.payment_enabled ? getProvider(business.payment_provider) : null;
    let creds: Record<string, unknown> | null = null;
    if (provider) {
      const { data } = await admin.from("payment_credentials")
        .select("api_key, secret_key, page_uid, mode, config")
        .eq("business_id", businessId).eq("provider", provider.id).maybeSingle();
      creds = data ?? null;
    }

    // Merchant configured a deposit but no working gateway -> waive it and confirm
    // the booking rather than trapping the customer on a dead payment step.
    if (!provider || !creds) {
      await admin.from("booking_appointments")
        .update({ status: "confirmed", deposit_status: "none", hold_expires_at: null })
        .eq("id", appointmentId);
      console.warn(`Deposit configured but payment not set up for business ${businessId}; booking confirmed without deposit`);
      await emailBookingConfirm();
      await emailMerchantNewBooking();
      return json({ ok: true, appointmentId, status: "confirmed", needsDeposit: false, depositAmount: 0, cancelToken });
    }

    const { data: order } = await admin.from("orders").insert({
      business_id: businessId,
      customer_name: customer.fullName, customer_phone: customer.phone, customer_email: customer.email || null,
      notes: `מקדמה לתור: ${service.name}`, total_price: deposit,
      status: "pending", payment_status: "pending",
    }).select("id").single();

    if (order) {
      await admin.from("booking_appointments").update({ order_id: order.id }).eq("id", appointmentId);

      const siteUrl = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");
      const storeUrl = `${siteUrl}/store/${business!.slug}`;
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const result = await provider.createPaymentPage(creds, {
        amount: deposit, currency: "ILS",
        customer: { name: customer.fullName, email: customer.email || "", phone: customer.phone },
        items: [{ name: `מקדמה: ${service.name}`, quantity: 1, price: deposit }],
        successUrl: `${storeUrl}?payment=success&order=${order.id}`,
        failureUrl: `${storeUrl}?payment=failed&order=${order.id}`,
        cancelUrl: `${storeUrl}?payment=cancelled&order=${order.id}`,
        callbackUrl: `${supabaseUrl}/functions/v1/payments-callback?provider=${provider.id}`,
      }, Deno.env);

      if (result.ok && result.link) {
        await admin.from("orders").update({ payment_page_request_uid: result.pageRequestUid }).eq("id", order.id);
        return json({
          ok: true, appointmentId, status: "pending", needsDeposit: true,
          depositAmount: deposit, paymentUrl: result.link, orderId: order.id, cancelToken,
        });
      }
      // Payment page failed to open: drop the dead order, waive, confirm.
      await admin.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
    }

    await admin.from("booking_appointments")
      .update({ status: "confirmed", deposit_status: "none", hold_expires_at: null })
      .eq("id", appointmentId);
    await emailBookingConfirm();
    await emailMerchantNewBooking();
    return json({ ok: true, appointmentId, status: "confirmed", needsDeposit: false, depositAmount: 0, cancelToken });
  }

  await emailBookingConfirm();
  await emailMerchantNewBooking();
  return json({
    ok: true,
    appointmentId,
    status: "confirmed",
    needsDeposit: false,
    depositAmount: 0,
    cancelToken,
  });
});
