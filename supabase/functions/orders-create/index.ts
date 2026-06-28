// COD order creation. Recomputes prices server-side from the DB so the client
// can never submit a manipulated price. Mirrors the price logic in payments-create.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    .select("id, name, delivery_fee")
    .eq("id", businessId)
    .single();
  if (!business) return json({ error: "Business not found" }, 404);

  // Re-fetch canonical prices from DB — never trust client-supplied prices
  const { data: products } = await admin
    .from("products")
    .select("id, name, price, sale_price, is_on_sale, active")
    .eq("business_id", businessId)
    .in("id", items.map((i) => i.product_id));
  if (!products?.length) return json({ error: "Products not found" }, 400);

  const priceOf = (p: any) => (p.is_on_sale && p.sale_price != null ? Number(p.sale_price) : Number(p.price));
  let subtotal = 0;
  const orderItems: { product_id: string; product_name: string; price_at_order: number; quantity: number }[] = [];

  for (const line of items) {
    const p = products.find((x) => x.id === line.product_id);
    if (!p || p.active !== true) continue;
    const qty = Math.max(1, Math.floor(Number(line.quantity) || 1));
    const unit = priceOf(p);
    subtotal += unit * qty;
    orderItems.push({ product_id: p.id, product_name: p.name, price_at_order: unit, quantity: qty });
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
      couponId = coupon.id;
      discount = coupon.discount_type === "percent"
        ? Math.round(subtotal * (Number(coupon.discount_value) / 100))
        : Number(coupon.discount_value);
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
