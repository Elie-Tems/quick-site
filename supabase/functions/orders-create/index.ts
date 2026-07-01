// COD order creation. Recomputes prices server-side from the DB so the client
// can never submit a manipulated price. Mirrors the price logic in payments-create.
// (deploy trigger: GitHub Actions auto-deploy enabled 2026-06-30)

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendViaResend } from "../_shared/email/resend.ts";
import { newOrderMerchant } from "../_shared/email/platformEmails.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface ReqBody {
  businessId: string;
  items: { product_id: string; quantity: number }[];
  customer: { fullName: string; phone: string; email: string };
  notes?: string;
  deliveryMethod?: "pickup" | "delivery";
  deliveryAddress?: string;
  couponId?: string;
  couponCode?: string;
  slug?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: ReqBody;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const { businessId, items, customer } = body;
  if (!businessId || !Array.isArray(items) || items.length === 0 || !customer?.email) {
    return json({ error: "businessId, items and customer are required" }, 400);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

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

  const priceOf = (p: any) => (p.is_on_sale && p.sale_price != null ? Number(p.sale_price) : Number(p.price));
  let subtotal = 0;
  const orderItems: { product_id: string; product_name: string; price_at_order: number; quantity: number; cost_at_order: number | null }[] = [];

  for (const line of items) {
    const p = products.find((x) => x.id === line.product_id);
    if (!p || p.active !== true) continue;
    const qty = Math.max(1, Math.floor(Number(line.quantity) || 1));
    const unit = priceOf(p);
    subtotal += unit * qty;
    // Snapshot the cost so historical profit stays accurate if cost changes later.
    const cost = (p as any).cost_price != null ? Number((p as any).cost_price) : null;
    orderItems.push({ product_id: p.id, product_name: p.name, price_at_order: unit, quantity: qty, cost_at_order: cost });
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
        discount = coupon.discount_type === "percent"
          ? Math.round(subtotal * (Number(coupon.discount_value) / 100))
          : Number(coupon.discount_value);
        discount = Math.min(discount, subtotal);
      }
    }
  }

  const isDelivery = body.deliveryMethod === "delivery";
  const shipping = isDelivery ? Number(business.delivery_fee ?? 0) : 0;
  const totalPrice = Math.max(0, subtotal - discount + shipping);

  const { data: order, error: orderErr } = await admin.from("orders").insert({
    business_id: businessId,
    customer_name: customer.fullName,
    customer_phone: customer.phone,
    customer_email: customer.email,
    notes: body.notes || null,
    total_price: totalPrice,
    delivery_method: body.deliveryMethod ?? null,
    delivery_fee: isDelivery ? shipping : null,
    delivery_address: isDelivery ? (body.deliveryAddress || null) : null,
    status: "pending",
    payment_status: "not_required",
    coupon_id: couponId,
    discount_amount: discount > 0 ? discount : null,
  }).select("id, total_price").single();

  if (orderErr || !order) return json({ error: "Could not create order" }, 500);

  const { error: itemsErr } = await admin.from("order_items").insert(
    orderItems.map((it) => ({ ...it, order_id: order.id }))
  );
  if (itemsErr) return json({ error: "Could not save order items" }, 500);

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
      await sendViaResend({ to: merchantEmail, subject: mail.subject, html: mail.html, fromName: "Siango" });
    } catch (e) {
      console.warn("merchant order email failed:", e);
    }
  }

  const webhookUrl = Deno.env.get("VITE_ORDER_WEBHOOK_URL");
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order: { ...order, customer_name: customer.fullName, customer_email: customer.email, customer_phone: customer.phone, payment_status: "not_required" },
        items: orderItems.map((it) => ({ ...it, line_total: it.price_at_order * it.quantity })),
        businessName: business.name,
        totalItems: orderItems.reduce((s, i) => s + i.quantity, 0),
      }),
    }).catch((e) => console.warn("order webhook failed:", e));
  }

  return json({ ok: true, order_id: order.id, total_price: order.total_price });
});
