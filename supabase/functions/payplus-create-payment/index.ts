// Creates a real order (status pending) and returns a PayPlus hosted payment
// page link. Called from the PUBLIC storefront by anonymous end-customers, so
// verify_jwt = false. Security: the amount is RECOMPUTED server-side from the
// product prices in the DB — the client-supplied total is never trusted.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface CartLine { product_id: string; quantity: number }
interface Customer { fullName: string; phone: string; email: string }
interface ReqBody {
  businessId: string;
  items: CartLine[];
  customer: Customer;
  notes?: string;
  deliveryMethod?: "pickup" | "delivery";
  deliveryAddress?: string;
  couponCode?: string;
  couponId?: string;
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
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // ── Load business + verify it has PayPlus enabled ──
  const { data: business } = await admin
    .from("businesses")
    .select("id, name, slug, payment_enabled, delivery_fee")
    .eq("id", businessId)
    .single();
  if (!business || !business.payment_enabled) {
    return json({ error: "Online payment is not enabled for this store" }, 400);
  }

  const { data: creds } = await admin
    .from("payment_credentials")
    .select("api_key, secret_key, page_uid, mode")
    .eq("business_id", businessId)
    .eq("provider", "payplus")
    .maybeSingle();
  if (!creds?.api_key || !creds?.secret_key || !creds?.page_uid) {
    return json({ error: "Store payment is not configured" }, 400);
  }

  // ── Recompute the amount server-side (never trust the client) ──
  const productIds = items.map((i) => i.product_id);
  const { data: products } = await admin
    .from("products")
    .select("id, name, price, sale_price, is_on_sale, active")
    .eq("business_id", businessId)
    .in("id", productIds);
  if (!products || products.length === 0) return json({ error: "Products not found" }, 400);

  const priceOf = (p: any): number =>
    p.is_on_sale && p.sale_price != null ? Number(p.sale_price) : Number(p.price);

  let subtotal = 0;
  const payplusItems: { name: string; quantity: number; price: number }[] = [];
  const orderItems: { product_id: string; product_name: string; price_at_order: number; quantity: number }[] = [];
  for (const line of items) {
    const product = products.find((p) => p.id === line.product_id);
    if (!product || product.active === false) continue;
    const qty = Math.max(1, Math.floor(Number(line.quantity) || 1));
    const unit = priceOf(product);
    subtotal += unit * qty;
    payplusItems.push({ name: product.name, quantity: qty, price: unit });
    orderItems.push({ product_id: product.id, product_name: product.name, price_at_order: unit, quantity: qty });
  }
  if (orderItems.length === 0) return json({ error: "No valid items" }, 400);

  // Coupon (re-validated against the DB)
  let discount = 0;
  let couponId: string | null = null;
  if (body.couponId || body.couponCode) {
    let q = admin
      .from("coupons")
      .select("id, code, active, discount_type, discount_value, min_order_amount, start_date, end_date, max_uses, current_uses")
      .eq("business_id", businessId);
    q = body.couponId ? q.eq("id", body.couponId) : q.eq("code", body.couponCode!.toUpperCase());
    const { data: coupon } = await q.maybeSingle();
    const now = new Date();
    const valid =
      coupon && coupon.active &&
      (!coupon.start_date || new Date(coupon.start_date) <= now) &&
      (!coupon.end_date || new Date(coupon.end_date) >= now) &&
      (!coupon.min_order_amount || subtotal >= Number(coupon.min_order_amount)) &&
      (coupon.max_uses == null || Number(coupon.current_uses) < Number(coupon.max_uses));
    if (valid) {
      couponId = coupon!.id;
      discount = coupon!.discount_type === "percent"
        ? Math.round(subtotal * (Number(coupon!.discount_value) / 100))
        : Number(coupon!.discount_value);
    }
  }

  const isDelivery = body.deliveryMethod === "delivery";
  const shipping = isDelivery ? Number(business.delivery_fee ?? 0) : 0;
  const amount = Math.max(0, subtotal - discount + shipping);
  if (amount <= 0) return json({ error: "Order total must be greater than zero" }, 400);

  // ── Create the order (pending) + items ──
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      business_id: businessId,
      customer_name: customer.fullName,
      customer_phone: customer.phone,
      customer_email: customer.email,
      notes: body.notes || null,
      total_price: amount,
      delivery_method: body.deliveryMethod ?? null,
      delivery_fee: isDelivery ? shipping : null,
      delivery_address: isDelivery ? (body.deliveryAddress || null) : null,
      status: "pending",
      payment_status: "pending",
    })
    .select("id")
    .single();
  if (orderErr || !order) return json({ error: "Could not create order" }, 500);

  await admin.from("order_items").insert(orderItems.map((it) => ({ ...it, order_id: order.id })));
  await admin.from("payments").insert({
    business_id: businessId,
    order_id: order.id,
    amount,
    currency: "ILS",
    customer_name: customer.fullName,
    customer_email: customer.email,
    customer_phone: customer.phone,
    payment_provider: "payplus",
    status: "pending",
    metadata: { coupon_id: couponId, discount, shipping, subtotal },
  });

  // ── Ask PayPlus for a hosted payment page ──
  const apiBase = Deno.env.get("PAYPLUS_API_BASE") || "https://restapidev.payplus.co.il/api/v1.0";
  const siteUrl = (Deno.env.get("VITE_APP_URL") || "https://siango.app").replace(/\/$/, "");
  const slug = body.slug || business.slug;
  const storeUrl = `${siteUrl}/store/${slug}`;
  const callbackUrl = `${supabaseUrl}/functions/v1/payplus-callback`;

  const payplusBody = {
    payment_page_uid: creds.page_uid,
    charge_method: 1,
    amount,
    currency_code: "ILS",
    sendEmailApproval: true,
    sendEmailFailure: false,
    initial_invoice: true,
    refURL_success: `${storeUrl}?payment=success&order=${order.id}`,
    refURL_failure: `${storeUrl}?payment=failed&order=${order.id}`,
    refURL_cancel: `${storeUrl}?payment=cancelled&order=${order.id}`,
    refURL_callback: callbackUrl,
    customer: { customer_name: customer.fullName, email: customer.email, phone: customer.phone },
    items: payplusItems,
  };

  let payplusJson: any;
  try {
    const res = await fetch(`${apiBase}/PaymentPages/generateLink`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": creds.api_key,
        "secret-key": creds.secret_key,
      },
      body: JSON.stringify(payplusBody),
    });
    payplusJson = await res.json();
  } catch (err) {
    await admin.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
    return json({ error: "Payment provider unreachable", detail: String(err) }, 502);
  }

  const link = payplusJson?.data?.payment_page_link;
  const pageRequestUid = payplusJson?.data?.page_request_uid;
  const ok = payplusJson?.results?.status === "success" && link;
  if (!ok) {
    await admin.from("orders").update({ payment_status: "failed" }).eq("id", order.id);
    return json({ error: "Could not create payment page", provider: payplusJson?.results }, 502);
  }

  await admin.from("orders").update({ payment_page_request_uid: pageRequestUid }).eq("id", order.id);
  await admin.from("payments").update({ provider_transaction_id: pageRequestUid }).eq("order_id", order.id);

  return json({ ok: true, payment_page_link: link, order_id: order.id });
});
