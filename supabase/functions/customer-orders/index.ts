// Customer self-service "my orders" via a magic link. Public (storefront) endpoint.
// action "request": {slug, email} -> if the shopper has orders in that store, emails
//   them a signed magic link (never reveals whether an email has orders otherwise).
// action "view": {token} -> validates the HMAC-signed, expiring token and returns
//   that email's orders for that store (read-only).
// Rate-limited per IP + per target email so it can't be used to email-bomb anyone.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { hmacBase64 } from "../_shared/payments/provider.ts";
import { sendViaResend } from "../_shared/email/resend.ts";
import { consumeRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "ip";

const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlDecode = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));
const SECRET = Deno.env.get("CRON_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TTL_MS = 30 * 60 * 1000; // magic link valid 30 minutes

const constEq = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

async function makeToken(businessId: string, email: string, exp: number): Promise<string> {
  const payload = b64url(JSON.stringify({ b: businessId, e: email, exp }));
  const sig = b64url(await hmacBase64(SECRET, payload));
  return `${payload}.${sig}`;
}
async function verifyToken(token: string): Promise<{ b: string; e: string } | null> {
  const [payload, sig] = (token || "").split(".");
  if (!payload || !sig) return null;
  const expected = b64url(await hmacBase64(SECRET, payload));
  if (!constEq(sig, expected)) return null;
  try {
    const p = JSON.parse(b64urlDecode(payload));
    if (!p.b || !p.e || !p.exp || Date.now() > p.exp) return null;
    return { b: p.b, e: p.e };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  if (!SECRET) return json({ error: "not configured" }, 500);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await req.json().catch(() => ({}));
  const action = body.action;

  if (action === "request") {
    const slug = String(body.slug || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    if (!slug || !email || !email.includes("@")) return json({ error: "bad request" }, 400);

    // Anti-abuse: cap per IP and per target email.
    const ip = clientIp(req);
    if (!(await consumeRateLimit(admin, `custorders:ip:${ip}`, 5, 3600))) return json({ ok: true });
    if (!(await consumeRateLimit(admin, `custorders:em:${email}`, 3, 3600))) return json({ ok: true });

    const { data: biz } = await admin
      .from("businesses").select("id, name, email, slug, primary_color").eq("slug", slug).maybeSingle();
    if (!biz) return json({ ok: true }); // don't reveal store existence

    const { data: orders } = await admin
      .from("orders").select("id").eq("business_id", (biz as any).id).eq("customer_email", email).limit(1);
    if (!orders || orders.length === 0) return json({ ok: true }); // no orders -> silently do nothing

    const token = await makeToken((biz as any).id, email, Date.now() + TTL_MS);
    const link = `https://siango.app/store/${slug}/my-orders?t=${encodeURIComponent(token)}`;
    const store = (biz as any).name || "החנות";
    await sendViaResend({
      to: email,
      fromName: store,
      subject: `ההזמנות שלך ב${store}`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;color:#111827">
        <h2 style="margin:0 0 12px">ההזמנות שלך ב${store}</h2>
        <p style="font-size:15px;color:#374151;line-height:1.7">לחצו על הכפתור כדי לצפות בהיסטוריית ההזמנות שלכם. הקישור בתוקף ל-30 דקות.</p>
        <p><a href="${link}" style="display:inline-block;background:${(biz as any).primary_color || "#0E9F6E"};color:#fff;text-decoration:none;font-weight:700;border-radius:10px;padding:12px 28px">צפייה בהזמנות שלי ↗</a></p>
        <p style="font-size:12px;color:#9ca3af">אם לא ביקשתם זאת, אפשר להתעלם מהמייל.</p></div>`,
    });
    return json({ ok: true });
  }

  if (action === "view") {
    const v = await verifyToken(String(body.token || ""));
    if (!v) return json({ error: "invalid or expired" }, 401);

    const { data: biz } = await admin
      .from("businesses").select("name, primary_color, slug").eq("id", v.b).maybeSingle();
    const { data: orders } = await admin
      .from("orders")
      .select("id, created_at, total_price, status")
      .eq("business_id", v.b).eq("customer_email", v.e)
      .order("created_at", { ascending: false }).limit(50);

    const ids = (orders || []).map((o: any) => o.id);
    let itemsByOrder: Record<string, any[]> = {};
    if (ids.length) {
      const { data: items } = await admin
        .from("order_items").select("order_id, product_name, quantity, price_at_order").in("order_id", ids);
      (items || []).forEach((it: any) => {
        (itemsByOrder[it.order_id] ||= []).push({ name: it.product_name, quantity: it.quantity, price: it.price_at_order });
      });
    }
    return json({
      ok: true,
      store: { name: (biz as any)?.name, slug: (biz as any)?.slug, color: (biz as any)?.primary_color },
      email: v.e,
      orders: (orders || []).map((o: any) => ({
        id: o.id, date: o.created_at, total: o.total_price, status: o.status, items: itemsByOrder[o.id] || [],
      })),
    });
  }

  return json({ error: "unknown action" }, 400);
});

