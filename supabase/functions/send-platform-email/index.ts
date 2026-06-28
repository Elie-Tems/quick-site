// Sends a platform lifecycle email by template name via Resend.
// Called from the app (e.g. welcome after sign-up). Requires a valid JWT
// (verify_jwt=true) so it can't be abused anonymously to send from our domain.
// No-ops gracefully if RESEND_API_KEY is not configured yet.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PLATFORM_EMAILS, orderConfirmationCustomer } from "../_shared/email/platformEmails.ts";
import { sendViaResend } from "../_shared/email/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Marketing/nudge emails (suppressed if the recipient unsubscribed from Siango).
// Transactional emails (receipts, freeze/deletion, order, domain alerts) are
// service messages and always send, as permitted under Chok HaSpam.
const MARKETING_TYPES = new Set([
  "accountWelcome",
  "onboardingAbandoned1",
  "onboardingAbandoned2",
  "siteReady",
  "siteReactivated",
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
    const { type, to, ctx, fromName, replyTo, merchant, order, businessId } = await req.json();
    if (!to) {
      return new Response(JSON.stringify({ ok: false, error: "to is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        },
      );
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
      // Embed the recipient address so the email's unsubscribe link is one-click.
      const b = builder({ ...(ctx || {}), recipientEmail: to });
      subject = b.subject;
      html = b.html;
    }

    const result = await sendViaResend({ to, subject, html, fromName: sendFromName, replyTo: sendReplyTo });

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
