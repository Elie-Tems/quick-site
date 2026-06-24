// Sends a platform lifecycle email by template name via Resend.
// Called from the app (e.g. welcome after sign-up). Requires a valid JWT
// (verify_jwt=true) so it can't be abused anonymously to send from our domain.
// No-ops gracefully if RESEND_API_KEY is not configured yet.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PLATFORM_EMAILS, orderConfirmationCustomer } from "../_shared/email/platformEmails.ts";
import { sendViaResend } from "../_shared/email/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, to, ctx, fromName, replyTo, merchant, order } = await req.json();
    if (!to) {
      return new Response(JSON.stringify({ ok: false, error: "to is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject: string;
    let html: string;
    let sendFromName = fromName;
    let sendReplyTo = replyTo;

    if (type === "orderConfirmationCustomer") {
      // Customer-facing order email: FROM the merchant, reply-to the merchant.
      const m = merchant || {};
      const storeName = m.storeName || "החנות";
      const storeUrl = m.storeUrl || "https://siango.app";
      const built = orderConfirmationCustomer(
        {
          businessName: storeName,
          email: m.email,
          brandColor: m.brandColor,
          logoUrl: m.logoUrl,
          unsubscribeUrl: `${storeUrl}/unsubscribe`,
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
      sendReplyTo = m.email || replyTo;    // replies go to the merchant
    } else {
      const builder = (PLATFORM_EMAILS as Record<string, (c: unknown) => { subject: string; html: string }>)[type];
      if (!builder) {
        return new Response(JSON.stringify({ ok: false, error: "unknown type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const b = builder(ctx || {});
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
