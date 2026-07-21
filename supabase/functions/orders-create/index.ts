// COD order creation. Recomputes prices server-side from the DB so the client
// can never submit a manipulated price. Mirrors the price logic in payments-create.
// (deploy trigger: GitHub Actions auto-deploy enabled 2026-06-30)

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendViaResend } from "../_shared/email/resend.ts";
import { emailItemsTable } from "../_shared/email/rtlEmail.ts";
import { sendLifecycleEmail } from "../_shared/email/lifecycle.ts";
import { newOrderMerchant } from "../_shared/email/platformEmails.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface ReqBody {
  businessId: string;
  items: { product_id: string; quantity: number; variant_id?: string | null; variant_color?: string | null; variant_size?: string | null }[];
  customer: { fullName?: string; name?: string; phone: string; email: string };
  notes?: string;
  deliveryMethod?: "pickup" | "delivery";
  deliveryAddress?: string;
  couponId?: string;
  couponCode?: string;
  slug?: string;
  // Lodging (vacation) booking path - present instead of `items` when booking a unit.
  unitProductId?: string;
  checkinDate?: string;   // "YYYY-MM-DD"
  checkoutDate?: string;  // "YYYY-MM-DD"
  numGuests?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: ReqBody;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { businessId, items, customer } = body;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Lodging (vacation) booking path ───────────────────────────────────────
  // Detected by unitProductId + check-in/out dates. Prices, nights and the total
  // are recomputed here from the DB (weekend-aware); the client never sends a price.
  if (body.unitProductId && body.checkinDate && body.checkoutDate) {
    return await handleLodging(admin, body);
  }

  if (!businessId || !Array.isArray(items) || items.length === 0 || !customer?.email) {
    return json({ error: "businessId, items and customer are required" }, 400);
  }

  const { data: business } = await admin
    .from("businesses")
    .select("id, name, delivery_fee, email")
    .eq("id", businessId)
    .single();
  if (!business) return json({ error: "Business not found" }, 404);

  // Order-spam guard (this endpoint is public). Cap rapid repeat orders from the
  // same email and overall burst per store in a short window. Best-effort, on top
  // of the server-authoritative pricing below.
  const windowStart = new Date(Date.now() - 60_000).toISOString();
  const { count: sameEmailCount } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("customer_email", customer.email)
    .gte("created_at", windowStart);
  if ((sameEmailCount ?? 0) >= 3) return json({ error: "rate_limited" }, 429);

  const { count: storeBurst } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .gte("created_at", windowStart);
  if ((storeBurst ?? 0) >= 30) return json({ error: "rate_limited" }, 429);

  // Re-fetch canonical prices from DB — never trust client-supplied prices
  const { data: products } = await admin
    .from("products")
    .select("id, name, price, sale_price, is_on_sale, active, cost_price")
    .eq("business_id", businessId)
    .in("id", items.map((i) => i.product_id));
  if (!products?.length) return json({ error: "Products not found" }, 400);

  // A client-supplied variant_id must actually belong to the product/business being
  // ordered from before it's trusted to decrement stock (this is a public,
  // unauthenticated endpoint - otherwise anyone could pass any variant_id and drain
  // another merchant's stock on an unrelated order).
  const requestedVariantIds = [...new Set(items.map((i) => i.variant_id).filter(Boolean))] as string[];
  const validVariants = new Map<string, { product_id: string; price_override: number | null }>();
  if (requestedVariantIds.length) {
    const { data: variants } = await admin
      .from("product_variants")
      .select("id, product_id, price_override")
      .eq("business_id", businessId)
      .in("id", requestedVariantIds);
    for (const v of variants ?? []) validVariants.set(v.id, { product_id: v.product_id, price_override: v.price_override });
  }

  const priceOf = (p: any) => (p.is_on_sale && p.sale_price != null ? Number(p.sale_price) : Number(p.price));
  let subtotal = 0;
  const orderItems: { product_id: string; product_name: string; price_at_order: number; quantity: number; cost_at_order: number | null; variant_id: string | null; variant_color: string | null; variant_size: string | null }[] = [];

  for (const line of items) {
    const p = products.find((x) => x.id === line.product_id);
    if (!p || p.active !== true) continue;
    const qty = Math.max(1, Math.floor(Number(line.quantity) || 1));
    const variant = line.variant_id ? validVariants.get(line.variant_id) : undefined;
    const verifiedVariantId = variant && variant.product_id === p.id ? line.variant_id! : null;
    const matchedVariant = verifiedVariantId ? variant : undefined;
    const unit = matchedVariant?.price_override != null ? Number(matchedVariant.price_override) : priceOf(p);
    subtotal += unit * qty;
    // Snapshot the cost so historical profit stays accurate if cost changes later.
    const cost = (p as any).cost_price != null ? Number((p as any).cost_price) : null;
    orderItems.push({
      product_id: p.id, product_name: p.name, price_at_order: unit, quantity: qty, cost_at_order: cost,
      variant_id: verifiedVariantId, variant_color: line.variant_color ?? null, variant_size: line.variant_size ?? null,
    });
  }
  if (!orderItems.length) return json({ error: "No valid items" }, 400);

  let discount = 0, couponId: string | null = null;
  if (body.couponId || body.couponCode) {
    let q = admin.from("coupons")
      .select("id, code, active, discount_type, discount_value, min_order_amount, start_date, end_date, max_uses, current_uses")
      .eq("business_id", businessId);
    q = body.couponId ? q.eq("id", body.couponId) : q.eq("code", body.couponCode!.toUpperCase());
    const { data: coupon } = await q.maybeSingle();
    const now = new Date();
    if (coupon && coupon.active &&
        (!coupon.start_date || new Date(coupon.start_date) <= now) &&
        (!coupon.end_date || new Date(coupon.end_date) >= now) &&
        (!coupon.min_order_amount || subtotal >= Number(coupon.min_order_amount)) &&
        (coupon.max_uses == null || Number(coupon.current_uses) < Number(coupon.max_uses))) {
      // Atomically claim one use (compare-and-set) so a max_uses coupon can't be
      // reused past its limit (mirrors payments-create). If max_uses is null we
      // still bump the counter for reporting, but never block.
      let claimed = true;
      if (coupon.max_uses != null) {
        const { data: rows } = await admin.from("coupons")
          .update({ current_uses: Number(coupon.current_uses) + 1 })
          .eq("id", coupon.id)
          .eq("current_uses", Number(coupon.current_uses))
          .select("id");
        claimed = !!(rows && rows.length);
      } else {
        await admin.from("coupons")
          .update({ current_uses: Number(coupon.current_uses) + 1 })
          .eq("id", coupon.id);
      }
      if (claimed) {
        couponId = coupon.id;
        // Storefront coupons use "percentage" - accept "percent" too (see payments-create).
        const isPercent = coupon.discount_type === "percentage" || coupon.discount_type === "percent";
        discount = isPercent
          ? Math.round(subtotal * (Number(coupon.discount_value) / 100))
          : Number(coupon.discount_value);
        discount = Math.min(discount, subtotal);
      }
    }
  }

  const isDelivery = body.deliveryMethod === "delivery";
  const shipping = isDelivery ? Number(business.delivery_fee ?? 0) : 0;
  const totalPrice = Math.max(0, subtotal - discount + shipping);

  // Build insert conditionally — columns added outside migrations may not be in
  // PostgREST's schema cache on older projects; omit null optional columns to be safe.
  const orderInsert: Record<string, unknown> = {
    business_id: businessId,
    customer_name: customer.fullName,
    customer_phone: customer.phone,
    customer_email: customer.email,
    notes: body.notes || null,
    total_price: totalPrice,
    status: "pending",
  };
  if (body.deliveryMethod) orderInsert.delivery_method = body.deliveryMethod;
  if (isDelivery) { orderInsert.delivery_fee = shipping; orderInsert.delivery_address = body.deliveryAddress || null; }
  if (couponId) orderInsert.coupon_id = couponId;
  if (discount > 0) orderInsert.discount_amount = discount;
  // payment_status added in payplus migration — include only if expected to exist
  try { orderInsert.payment_status = "not_required"; } catch { /* ignore */ }

  const { data: order, error: orderErr } = await admin.from("orders").insert(orderInsert).select("id, total_price").single();

  if (orderErr || !order) return json({ error: "Could not create order", detail: orderErr?.message, code: orderErr?.code }, 500);

  const { error: itemsErr } = await admin.from("order_items").insert(
    orderItems.map((it) => ({ ...it, order_id: order.id }))
  );
  if (itemsErr) return json({ error: "Could not save order items" }, 500);

  // Decrement stock for any purchased variant (atomic, never below 0). The order
  // itself is never blocked on stock (no cart-side stock cap exists yet to
  // prevent this at the source) - but an oversell should be loud, not silent,
  // so a merchant can restock/reconcile instead of finding out from an angry
  // customer.
  for (const it of orderItems) {
    if (it.variant_id) {
      const { data: before } = await admin.from("product_variants").select("stock").eq("id", it.variant_id).maybeSingle();
      const priorStock = (before as { stock?: number } | null)?.stock ?? null;
      await admin.rpc("decrement_variant_stock", { p_variant_id: it.variant_id, p_qty: it.quantity }).catch(() => {});
      if (priorStock != null && it.quantity > priorStock) {
        console.error("orders-create: oversold variant - order", order.id, "variant", it.variant_id, "requested", it.quantity, "available", priorStock);
      }
    }
  }

  // Notify the merchant by email - money-first subject ("הידד! נכנסה הזמנה על ₪X").
  // Works for every order, including COD / no-payment-configured. Best-effort.
  const merchantEmail = (business as any).email;
  if (merchantEmail) {
    try {
      const siteUrl = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");
      const mail = newOrderMerchant({
        businessName: business.name,
        amountIls: totalPrice,
        dashboardUrl: `${siteUrl}/dashboard`,
        recipientEmail: merchantEmail,
      });
      const res = await sendViaResend({ to: merchantEmail, subject: mail.subject, html: mail.html, fromName: "Siango" });
      if (!res.ok) console.error("merchant order email failed - order", order.id, "error", res.error);
    } catch (e) {
      console.warn("merchant order email failed:", e);
    }
  } else {
    // No fallback and nothing observable when this happens - the merchant would
    // never learn an order came in unless they happen to check the dashboard.
    console.warn("orders-create: business has no email configured, merchant notification skipped - business", businessId, "order", order.id);
  }

  // Customer order confirmation - a merchant-editable lifecycle email (can be turned
  // off or reworded in the dashboard). Best-effort; never blocks the order.
  try {
    const siteUrl = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");
    const itemsHtml = emailItemsTable(
      orderItems.map((it) => ({ name: it.product_name, quantity: it.quantity, price: it.price_at_order })),
      totalPrice,
    );
    const res = await sendLifecycleEmail(admin, {
      businessId, key: "order_confirm", to: customer.email, name: customer.fullName,
      extraHtml: itemsHtml,
      buttonUrl: body.slug ? `${siteUrl}/store/${body.slug}` : undefined,
    });
    if (!res.ok) console.error("customer order confirmation email failed - order", order.id, "error", res.error);
  } catch (e) {
    console.warn("customer order confirmation email failed:", e);
  }

  // (The customer confirmation + merchant "new order" emails are already sent
  // above via Resend. The old Make.com order webhook was removed - it only
  // duplicated those notifications and leaked customer PII to a third party.)

  return json({ ok: true, order_id: order.id, total_price: order.total_price });
});

// ── Lodging booking handler ──────────────────────────────────────────────────
// Server-authoritative: looks up the unit, recomputes nights + total (Fri/Sat
// nights bill at price_weekend if set, else price_per_night), validates
// min_nights / max_guests, and inserts a 'pending' COD order carrying the stay
// details. Mirrors the merchant + customer email sends of the product-cart path.
async function handleLodging(admin: any, body: ReqBody): Promise<Response> {
  const { businessId, unitProductId, checkinDate, checkoutDate } = body;
  const customer = body.customer || ({} as ReqBody["customer"]);
  const customerName = (customer.name || customer.fullName || "").trim();
  if (!businessId || !unitProductId || !checkinDate || !checkoutDate || !customer.email) {
    return json({ error: "businessId, unit, dates and customer email are required" }, 400);
  }

  const parseDate = (s: string): Date | null => {
    const [y, m, d] = String(s).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d));
  };
  const ci = parseDate(checkinDate);
  const co = parseDate(checkoutDate);
  if (!ci || !co) return json({ error: "Invalid dates" }, 400);
  const nights = Math.round((co.getTime() - ci.getTime()) / 86_400_000);
  if (nights <= 0) return json({ error: "checkout must be after checkin" }, 400);

  const { data: business } = await admin
    .from("businesses")
    .select("id, name, email")
    .eq("id", businessId)
    .single();
  if (!business) return json({ error: "Business not found" }, 404);

  // Order-spam guard - same window/caps as the product path (public endpoint).
  const windowStart = new Date(Date.now() - 60_000).toISOString();
  const { count: sameEmailCount } = await admin
    .from("orders").select("id", { count: "exact", head: true })
    .eq("business_id", businessId).eq("customer_email", customer.email).gte("created_at", windowStart);
  if ((sameEmailCount ?? 0) >= 3) return json({ error: "rate_limited" }, 429);
  const { count: storeBurst } = await admin
    .from("orders").select("id", { count: "exact", head: true })
    .eq("business_id", businessId).gte("created_at", windowStart);
  if ((storeBurst ?? 0) >= 30) return json({ error: "rate_limited" }, 429);

  // Canonical unit from the DB - never trust client-sent pricing.
  const { data: unit } = await admin
    .from("products")
    .select("id, name, active, price_per_night, price_weekend, max_guests, min_nights")
    .eq("business_id", businessId)
    .eq("id", unitProductId)
    .maybeSingle();
  if (!unit || unit.active !== true) return json({ error: "Unit not found" }, 400);
  if (unit.price_per_night == null) return json({ error: "Unit is not bookable" }, 400);

  const nightly = Number(unit.price_per_night) || 0;
  const weekend = unit.price_weekend != null ? Number(unit.price_weekend) : nightly;
  const minNights = unit.min_nights != null ? Number(unit.min_nights) : 1;
  const maxGuests = unit.max_guests != null ? Number(unit.max_guests) : null;

  if (nights < minNights) return json({ error: `מינימום ${minNights} לילות להזמנה` }, 400);
  const numGuests = Math.max(1, Math.floor(Number(body.numGuests) || 1));
  if (maxGuests != null && numGuests > maxGuests) return json({ error: `עד ${maxGuests} אורחים ביחידה זו` }, 400);

  // Weekend-aware total: iterate each night (checkin .. checkout-1) in UTC.
  let totalPrice = 0;
  const d = new Date(ci);
  for (let i = 0; i < nights; i++) {
    const day = d.getUTCDay(); // 5 = Fri, 6 = Sat
    totalPrice += (day === 5 || day === 6) ? weekend : nightly;
    d.setUTCDate(d.getUTCDate() + 1);
  }

  const { data: order, error: orderErr } = await admin.from("orders").insert({
    business_id: businessId,
    customer_name: customerName,
    customer_phone: customer.phone || null,
    customer_email: customer.email,
    notes: body.notes || null,
    total_price: totalPrice,
    status: "pending",
    payment_status: "not_required",
    checkin_date: checkinDate,
    checkout_date: checkoutDate,
    num_guests: numGuests,
    unit_name: unit.name,
  }).select("id, total_price").single();

  if (orderErr || !order) return json({ error: "Could not create order" }, 500);

  // Without this, useOrders' `order_items(*)` join is always empty for a lodging
  // booking, so the dashboard order list/detail (which reads order.items) shows
  // "0 לילות" and an empty units section even though the stay itself saved fine.
  const { error: lodgingItemsErr } = await admin.from("order_items").insert({
    order_id: order.id, product_id: unitProductId, product_name: unit.name,
    price_at_order: nightly, quantity: nights, cost_at_order: null,
    variant_id: null, variant_color: null, variant_size: null,
  });
  // Unlike the main product-cart path (which fails the whole order on this same
  // insert error), the reservation itself is already safely recorded on the
  // `orders` row above (unit_name/num_guests/dates) - failing the whole booking
  // here would strand a guest with a valid stay and no confirmation. Loud
  // logging (not a silent warn) so this is at least flagged for reconciliation.
  if (lodgingItemsErr) console.error("lodging order_items insert failed - order", order.id, "needs manual reconciliation:", lodgingItemsErr.message);

  // Notify the merchant - money-first subject, works for COD. Best-effort.
  const merchantEmail = (business as any).email;
  if (merchantEmail) {
    try {
      const siteUrl = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");
      const mail = newOrderMerchant({
        businessName: business.name,
        amountIls: totalPrice,
        dashboardUrl: `${siteUrl}/dashboard`,
        recipientEmail: merchantEmail,
      });
      const res = await sendViaResend({ to: merchantEmail, subject: mail.subject, html: mail.html, fromName: "Siango" });
      if (!res.ok) console.error("merchant lodging email failed - order", order.id, "error", res.error);
    } catch (e) {
      console.warn("merchant lodging email failed:", e);
    }
  } else {
    console.warn("orders-create (lodging): business has no email configured, merchant notification skipped - business", businessId, "order", order.id);
  }

  // Customer confirmation - merchant-editable lifecycle email. Best-effort.
  try {
    const stayHtml =
      `<div dir="rtl" style="font-size:15px;line-height:1.9">` +
      `<strong>${unit.name}</strong><br/>` +
      `כניסה: ${checkinDate} · יציאה: ${checkoutDate}<br/>` +
      `${nights} לילות · ${numGuests} אורחים<br/>` +
      `סה״כ לתשלום מול המארח: <strong>₪${totalPrice.toLocaleString()}</strong>` +
      `</div>`;
    const res = await sendLifecycleEmail(admin, {
      businessId, key: "order_confirm", to: customer.email, name: customerName,
      extraHtml: stayHtml,
    });
    if (!res.ok) console.error("customer lodging confirmation email failed - order", order.id, "error", res.error);
  } catch (e) {
    console.warn("customer lodging confirmation email failed:", e);
  }

  return json({ ok: true, order_id: order.id, total_price: order.total_price });
}
