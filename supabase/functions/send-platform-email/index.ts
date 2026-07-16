// Sends a platform lifecycle email by template name via Resend.
// Called from the app (e.g. welcome after sign-up). Requires a valid JWT
// (verify_jwt=true) so it can't be abused anonymously to send from our domain.
// No-ops gracefully if RESEND_API_KEY is not configured yet.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PLATFORM_EMAILS, orderConfirmationCustomer, orderStatusCustomer } from "../_shared/email/platformEmails.ts";
import { sendViaResend } from "../_shared/email/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Read the Supabase role claim from the bearer JWT (anon / authenticated /
// service_role). Used to keep anonymous callers from triggering platform
// lifecycle emails to arbitrary inboxes.
function jwtRole(authHeader: string | null): string {
  try {
    const tok = (authHeader || "").replace(/^Bearer\s+/i, "");
    const part = tok.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(part));
    return payload.role || "anon";
  } catch {
    return "anon";
  }
}

// Marketing/nudge emails (suppressed if the recipient unsubscribed from Siango).
// Transactional emails (receipts, "your site is live", payment-failed/dunning,
// freeze/deletion, order, domain alerts) are service messages and ALWAYS send, as
// permitted under Chok HaSpam - a paying customer must get the confirmation of the
// service they paid for even if they opted out of promotional email.
// Only genuine promotion/re-engagement stays here.
const MARKETING_TYPES = new Set([
  "accountWelcome",
  "onboardingAbandoned1",
  "onboardingAbandoned2",
]);

// Fail-open suppression check via the anon-callable, SECURITY DEFINER RPC.
async function isPlatformUnsubscribed(email: string): Promise<boolean> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !key) return false;
    const r = await fetch(`${url}/rest/v1/rpc/is_platform_unsubscribed`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ p_email: email }),
    });
    if (!r.ok) return false;
    return (await r.json()) === true;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, to, ctx, fromName, replyTo, merchant, order, businessId, orderId } = await req.json();
    // For orderStatusCustomer: the DB order resolved (and ownership-verified) in the
    // anti-phishing gate, reused in the send section so branding/total come from the
    // trusted row - never from client-supplied fields.
    let resolvedOrder: { business_id: string; customer_email: string | null; total_price: number | string | null } | null = null;
    if (!to) {
      return new Response(JSON.stringify({ ok: false, error: "to is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Anti-spam gate. The only legitimately-anonymous email is the customer order
    // confirmation, and it must correspond to a REAL, recent order (so this
    // endpoint can't be used to blast arbitrary inboxes). All other (platform
    // lifecycle) emails require an authenticated / service-role caller.
    const authToken = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    // Detect server-to-server (cron/webhook) callers by a DIRECT match against the
    // service-role secret - NOT by decoding the JWT. Supabase's service key can be a
    // non-JWT ("sb_secret_...") that jwtRole() can't parse; it then returns "anon"
    // and every siteReady / paymentReceipt / recovery email (all sent with the
    // service key) silently 403s on the "recipient must be your own address" check
    // below. That is exactly why paid merchants got no "your site is live" email.
    const role = jwtRole(req.headers.get("Authorization"));
    const isServiceRole = role === "service_role" ||
      (!!authToken && authToken === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    if (type === "orderConfirmationCustomer") {
      if (!businessId) {
        return new Response(JSON.stringify({ ok: false, error: "businessId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const admin0 = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { count } = await admin0
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("customer_email", to)
        .gte("created_at", new Date(Date.now() - 30 * 60_000).toISOString());
      if (!count) {
        return new Response(JSON.stringify({ ok: false, error: "no recent matching order" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (type === "orderStatusCustomer") {
      // Customer-facing ORDER STATUS email FROM the merchant, triggered when the
      // merchant marks an order completed/cancelled in the dashboard. Anti-phishing
      // gate: look up the order by id, then require BOTH (a) the recipient equals
      // that order's own customer_email, and (b) the authenticated caller OWNS the
      // order's business. This stops a signed-in user from wearing another store's
      // identity to mail arbitrary inboxes. Service-role callers (cron/webhook) are
      // exempt from the ownership check but still bound to the real order/recipient.
      const oid = orderId || (ctx as any)?.orderNumber || (order as any)?.id;
      if (!oid) {
        return new Response(JSON.stringify({ ok: false, error: "orderId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const admin0 = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: ord } = await admin0
        .from("orders")
        .select("id, business_id, customer_email, total_price")
        .eq("id", oid)
        .maybeSingle();
      const target = String(Array.isArray(to) ? to[0] : to).toLowerCase();
      if (!ord || (ord.customer_email || "").toLowerCase() !== target) {
        return new Response(JSON.stringify({ ok: false, error: "recipient does not match the order" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!isServiceRole) {
        // businesses.owner_id references profiles.id (NOT auth.uid) - resolve the
        // caller's profile first, then confirm they own the order's business.
        const { data: { user } } = await admin0.auth.getUser(authToken);
        const { data: profile } = user
          ? await admin0.from("profiles").select("id").eq("user_id", user.id).maybeSingle()
          : { data: null };
        const { data: ownsBiz } = profile
          ? await admin0.from("businesses").select("id").eq("id", ord.business_id).eq("owner_id", profile.id).maybeSingle()
          : { data: null };
        if (!ownsBiz) {
          return new Response(JSON.stringify({ ok: false, error: "not your order" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      resolvedOrder = ord as typeof resolvedOrder;
    } else if (!isServiceRole) {
      // Authenticated (non service-role) callers may only send a platform
      // lifecycle email to THEIR OWN address. This stops any signed-up user from
      // using our DKIM-signed domain to send Siango-branded mail (with
      // ctx-supplied button links) to an arbitrary victim - i.e. phishing.
      // Bulk lifecycle sends (onboarding/dunning/recovery) run as the service
      // role via cron and are exempt. anon tokens resolve to no user -> blocked.
      const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: { user } } = await authClient.auth.getUser(authToken);
      const callerEmail = user?.email?.toLowerCase();
      const target = String(Array.isArray(to) ? to[0] : to).toLowerCase();
      if (!callerEmail || callerEmail !== target) {
        return new Response(JSON.stringify({ ok: false, error: "recipient must be your own address" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Honor unsubscribe for marketing emails (transactional ones always send).
    if (MARKETING_TYPES.has(type) && (await isPlatformUnsubscribed(to))) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "unsubscribed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject: string;
    let html: string;
    let sendFromName = fromName;
    let sendReplyTo = replyTo;

    if (type === "orderConfirmationCustomer") {
      // Customer-facing order email FROM the merchant. Derive the merchant
      // identity from the DB (by businessId) so a caller can't spoof another
      // store's name/email (anti-phishing). Fall back to the request only for
      // legacy callers that don't send businessId yet.
      let storeName = "החנות";
      let storeEmail: string | undefined;
      let storeUrl = "https://siango.app";
      let brandColor: string | undefined;
      let logoUrl: string | undefined;
      if (businessId) {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data: biz } = await admin
          .from("businesses")
          .select("name, email, slug, primary_color, logo_url")
          .eq("id", businessId)
          .maybeSingle();
        if (biz) {
          storeName = (biz as any).name || storeName;
          storeEmail = (biz as any).email || undefined;
          brandColor = (biz as any).primary_color || undefined;
          logoUrl = (biz as any).logo_url || undefined;
          if ((biz as any).slug) storeUrl = `https://siango.app/store/${(biz as any).slug}`;
        }
      } else {
        const m = merchant || {};
        storeName = m.storeName || storeName;
        storeEmail = m.email;
        storeUrl = m.storeUrl || storeUrl;
        brandColor = m.brandColor;
        logoUrl = m.logoUrl;
      }
      const built = orderConfirmationCustomer(
        {
          businessName: storeName,
          email: storeEmail,
          brandColor,
          logoUrl,
          unsubscribeUrl: `${storeUrl}/unsubscribe?email=${encodeURIComponent(to)}`,
        },
        {
          firstName: order?.firstName,
          storeName,
          orderTotal: order?.orderTotal,
          storeUrl,
          items: order?.items,
          orderNumber: order?.orderNumber,
          lang: ["he", "en", "ar", "fr", "ru"].includes(order?.lang) ? order.lang : "he",
        },
      );
      subject = built.subject;
      html = built.html;
      sendFromName = storeName;            // shown as the sender
      sendReplyTo = storeEmail || replyTo; // replies go to the merchant
    } else if (type === "orderStatusCustomer") {
      // Merchant-branded order status update. Derive the store identity (and the
      // order total) from the DB - the order was verified in the gate above, so we
      // trust resolvedOrder.business_id over any client-supplied businessId.
      const bId = resolvedOrder?.business_id || businessId;
      let storeName = "החנות";
      let storeEmail: string | undefined;
      let storeUrl = "https://siango.app";
      let brandColor: string | undefined;
      let logoUrl: string | undefined;
      if (bId) {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const { data: bizRow } = await admin
          .from("businesses")
          .select("name, email, slug, primary_color, logo_url")
          .eq("id", bId)
          .maybeSingle();
        if (bizRow) {
          storeName = (bizRow as any).name || storeName;
          storeEmail = (bizRow as any).email || undefined;
          brandColor = (bizRow as any).primary_color || undefined;
          logoUrl = (bizRow as any).logo_url || undefined;
          if ((bizRow as any).slug) storeUrl = `https://siango.app/store/${(bizRow as any).slug}`;
        }
      }
      const rawTotal = resolvedOrder?.total_price;
      const orderTotal = rawTotal != null && rawTotal !== "" ? Number(rawTotal) : undefined;
      const recipient = Array.isArray(to) ? to[0] : to;
      const built = orderStatusCustomer({
        businessName: storeName,
        status: (ctx as any)?.status,
        orderTotal: Number.isFinite(orderTotal as number) ? (orderTotal as number) : undefined,
        storeUrl,
        brandColor,
        logoUrl,
        email: storeEmail,
        firstName: (ctx as any)?.firstName,
        recipientEmail: recipient,
      });
      subject = built.subject;
      html = built.html;
      sendFromName = storeName;            // shown as the sender
      sendReplyTo = storeEmail || replyTo; // replies go to the merchant
    } else {
      // Platform emails always send as Siango - never trust a client-supplied
      // sender name / reply-to (prevents spoofing e.g. "Bank ..." from our domain).
      sendFromName = undefined;
      sendReplyTo = undefined;
      const builder = (PLATFORM_EMAILS as Record<string, (c: unknown) => { subject: string; html: string }>)[type];
      if (!builder) {
        return new Response(JSON.stringify({ ok: false, error: "unknown type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Resolve the recipient's language so localized templates render in it.
      // Caller-provided ctx.lang wins; otherwise look it up from their account.
      const VALID_LANGS = ["he", "en", "ar", "fr", "ru"];
      let lang: string = (ctx && (ctx as any).lang) || "";
      if (!VALID_LANGS.includes(lang)) {
        try {
          const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
          const { data } = await admin.rpc("email_preferred_lang", { p_email: to });
          lang = typeof data === "string" && VALID_LANGS.includes(data) ? data : "he";
        } catch { lang = "he"; }
      }
      // Personalize the greeting: if the caller didn't supply a firstName, look
      // it up from the recipient's profile by email (best-effort) so platform
      // emails address the person by name instead of a generic "היי!".
      let ctxFirstName = (ctx && (ctx as any).firstName) || undefined;
      if (!ctxFirstName) {
        try {
          const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
          const toEmail = Array.isArray(to) ? to[0] : to;
          const { data: prof } = await admin.from("profiles").select("full_name").eq("email", toEmail).maybeSingle();
          const fn = ((prof as { full_name?: string } | null)?.full_name || "").trim().split(/\s+/)[0];
          if (fn) ctxFirstName = fn;
        } catch { /* best-effort personalization */ }
      }
      // Embed the recipient address so the email's unsubscribe link is one-click.
      const b = builder({ ...(ctx || {}), firstName: ctxFirstName, recipientEmail: to, lang });
      subject = b.subject;
      html = b.html;
    }

    const result = await sendViaResend({ to, subject, html, fromName: sendFromName, replyTo: sendReplyTo });

    // Audit trail: log every send so the admin has visibility (sent/failed now;
    // the Resend webhook later flips this row to delivered/opened/bounced). Best
    // effort - never fail the send because logging failed.
    try {
      const logDb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await logDb.from("platform_email_log").insert({
        email_type: type || "unknown",
        to_email: Array.isArray(to) ? to[0] : to,
        subject: subject ?? null,
        status: result.ok ? "sent" : (result.skipped ? "skipped" : "failed"),
        provider_id: result.id ?? null,
        error: result.error ?? null,
      });
    } catch (_) { /* logging is best-effort */ }

    return new Response(JSON.stringify(result), {
      status: result.ok || result.skipped ? 200 : 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
