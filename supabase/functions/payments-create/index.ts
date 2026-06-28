// Generic "start payment" endpoint. Creates an order (pending) and returns a
// hosted payment page link from whichever gateway the merchant configured.
// Public storefront → verify_jwt = false. Amount is recomputed server-side.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getProvider } from "../_shared/payments/registry.ts";

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: business } = await admin
    .from("businesses")
    .select("id, name, slug, payment_enabled, payment_provider, delivery_fee")
    .eq("id", businessId).single();
  if (!business || !business.payment_enabled) {
    return json({ error: "Online payment is not enabled for this store" }, 400);
  }

  const provider = getProvider(business.payment_provider);
  if (!provider) return json({ error: `Unsupported payment provider: ${business.payment_provider}` }, 400);

  const { data: creds } = await admin
    .from("payment_credentials")
    .select("api_key, secret_key, page_uid, mode, config")
    .eq("business_id", businessId).eq("provider", provider.id).maybeSingle();
  if (!creds) return json({ error: "Store payment is not configured" }, 400);

  // ── Recompute amount server-side ──
  const { data: products } = await admin
    .from("products").select("id, name, price, sale_price, is_on_sale, active")
    .eq("business_id", businessId).in("id", items.map((i) => i.product_id));
  if (!products?.length) return json({ error: "Products not found" }, 400);

  const priceOf = (p: any) => (p.is_on_sale && p.sale_price != null ? Number(p.sale_price) : Number(p.price));
  let subtotal = 0;
  const lineItems: { name: string; quantity: number; price: number }[] = [];
  const orderItems: { product_id: string; product_name: string; price_at_order: number; quantity: number }[] = [];
  for (const line of items) {
    const p = products.find((x) => x.id === line.product_id);
    if (!p || p.active !== true) continue;
    const qty = Math.max(1, Math.floor(Number(line.quantity) || 1));
    const unit = priceOf(p);
    subtotal += unit * qty;
    lineItems.push({ name: p.name, quantity: qty, price: unit });
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
      // Atomically claim one use (compare-and-set on current_uses): if another
      // request already consumed the last use, this matches 0 rows and we reject
      // the coupon - prevents infinite reuse of a max_uses coupon.
      const { data: claimed } = await admin.from("coupons")
        .update({ current_uses: Number(coupon.current_uses) + 1 })
        .eq("id", coupon.id)
        .eq("current_uses", Number(coupon.current_uses))
        .select("id");
      if (claimed && claimed.length) {
        couponId = coupon.id;
        discount = coupon.discount_type === "percent"
          ? Math.round(subtotal * (Number(coupon.discount_value) / 100))
          : Number(coupon.discount_value);
        discount = Math.min(discount, subtotal); // never discount below 0
      }
    }
  }

  const isDelivery = body.deliveryMethod === "delivery";
  const shipping = isDelivery ? Number(business.delivery_fee ?? 0) : 0;
  const amount = Math.max(0, subtotal - discount + shipping);
  if (amount <= 0) return json({ error: "Order total must be greater than zero" }, 400);

  const { data: order, error: orderErr } = await admin.from("orders").insert({
    business_id: businessId,
    customer_name: customer.fullName, customer_phone: customer.phone, customer_email: customer.email,
    notes: body.notes || null, total_price: amount,
    delivery_method: body.deliveryMethod ?? null,
    delivery_fee: isDelivery ? shipping : null,
    delivery_address: isDelivery ? (body.deliveryAddress || null) : null,
    status: "pending", payment_status: "pending",
  }).select("id").single();
  if (orderErr || !order) return json({ error: "Could not create order" }, 500);

  await admin.from("order_items").insert(orderItems.map((it) => ({ ...it, order_id: order.id })));
  await admin.from("payments").insert({
    business_id: businessId, order_id: order.id, amount, currency: "ILS",
    customer_name: customer.fullName, customer_email: customer.email, customer_phone: customer.phone,
    payment_provider: provider.id, status: "pending",
    metadata: { coupon_id: couponId, discount, shipping, subtotal },
  });

  const siteUrl = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");
  const storeUrl = `${siteUrl}/store/${body.slug || business.slug}`;
  const result = await provider.createPaymentPage(creds, {
    amount, currency: "ILS",
    customer: { name: customer.fullName, email: customer.email, phone: customer.phone },
    items: lineItems,
    successUrl: `${storeUrl}?payment=success&order=${order.id}`,
    failureUrl: `${storeUrl}?payment=failed&order=${order.id}`,
    cancelUrl: `${storeUrl}?payment=cancelled&order=${order.id}`,
    callbackUrl: `${supabaseUrl}/functions/v1/payments-callback?provider=${provider.id}`,
  }, Deno.env);

  if (!result.ok || !result.link) {
    await admin.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
    return json({ error: result.error || "Could not create payment page", provider: result.raw }, 502);
  }

  await admin.from("orders").update({ payment_page_request_uid: result.pageRequestUid }).eq("id", order.id);
  await admin.from("payments").update({ provider_transaction_id: result.pageRequestUid }).eq("order_id", order.id);
  return json({ ok: true, payment_page_link: result.link, order_id: order.id });
});
