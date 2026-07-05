/**
 * iCount IPN (Instant Payment Notification) webhook for platform subscription.
 *
 * iCount calls this URL after a successful payment on the publish payment page.
 * Expected query/body params from iCount IPN:
 *   - session_token  (passed via the checkout URL we built)
 *   - business_id    (passed via the checkout URL we built)
 *   - approval_num   (iCount approval number)
 *   - sum            (amount paid)
 *   - status         (success / fail)
 *
 * Register this URL in the iCount payment page settings as the IPN/webhook URL:
 *   https://<project>.supabase.co/functions/v1/icount-publish-webhook
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { PLATFORM_EMAILS } from "../_shared/email/platformEmails.ts";
import { sendViaResend } from "../_shared/email/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // iCount sends IPN as form-encoded POST or as query params on GET/POST
  let params: URLSearchParams;
  if (req.method === "POST") {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      params = new URLSearchParams(text);
    } else {
      // JSON body
      try {
        const body = await req.json();
        params = new URLSearchParams(Object.entries(body).map(([k, v]) => [k, String(v)]));
      } catch {
        params = new URLSearchParams(new URL(req.url).search);
      }
    }
  } else {
    params = new URLSearchParams(new URL(req.url).search);
  }

  const sessionToken = params.get("session_token")?.trim();
  const businessId = params.get("business_id")?.trim();
  const approvalNum = params.get("approval_num")?.trim() || params.get("CreditCardApprovalNumber")?.trim();
  const status = (params.get("status") || params.get("Status") || "").toLowerCase();
  const sum = params.get("sum") || params.get("Sum") || "";

  console.log("iCount IPN received", { sessionToken, businessId, approvalNum, status, sum });

  // Only process successful payments
  if (status && status !== "success" && status !== "1" && status !== "ok") {
    return new Response(JSON.stringify({ ok: false, reason: "payment not successful", status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!sessionToken && !businessId) {
    return new Response(JSON.stringify({ error: "Missing session_token or business_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Find the session
  let query = admin
    .from("publish_checkout_sessions")
    .select("id, user_id, business_id, status, payment_verified_at");

  if (sessionToken) {
    query = query.eq("session_token", sessionToken);
  } else {
    query = query.eq("business_id", businessId!).order("created_at", { ascending: false }).limit(1);
  }

  const { data: session, error: sessionErr } = await query.maybeSingle();

  if (sessionErr || !session) {
    console.error("Session not found", { sessionToken, businessId, sessionErr });
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Idempotency: if already completed, return ok
  if (session.status === "completed") {
    return new Response(JSON.stringify({ ok: true, alreadyCompleted: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const now = new Date().toISOString();

  // Save approval number to approval_num table if provided
  if (approvalNum) {
    await admin.from("approval_num").upsert({
      number: approvalNum,
      business_id: session.business_id,
    }, { onConflict: "number" });
  }

  // Mark session as paid
  await admin
    .from("publish_checkout_sessions")
    .update({
      status: "paid",
      payment_verified_at: now,
      external_transaction_id: approvalNum || null,
      updated_at: now,
    })
    .eq("id", session.id);

  // Check legal gate
  const { data: business } = await admin
    .from("businesses")
    .select("slug, name, legal_approved_at")
    .eq("id", session.business_id)
    .single();

  if (!business?.legal_approved_at) {
    // Payment recorded but legal not approved - don't publish yet
    console.log("Payment recorded, but legal not approved for business", session.business_id);
    return new Response(JSON.stringify({ ok: true, legalPending: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Publish the site
  const { error: pubErr } = await admin
    .from("businesses")
    .update({ is_published: true, updated_at: now })
    .eq("id", session.business_id);

  if (pubErr) {
    console.error("Publish failed", pubErr);
    return new Response(JSON.stringify({ error: "Publish failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await admin
    .from("publish_checkout_sessions")
    .update({ status: "completed", updated_at: now })
    .eq("id", session.id);

  // Send site-ready email
  try {
    const { data: userData } = await admin.auth.admin.getUserById(session.user_id);
    const userEmail = userData?.user?.email;
    if (userEmail && business) {
      const appUrl = Deno.env.get("VITE_APP_URL") || "https://siango.app";
      const lang = (userData.user?.user_metadata?.preferred_language as string) || "he";
      const { subject, html } = PLATFORM_EMAILS.siteReady({
        businessName: business.name,
        siteUrl: `${appUrl}/store/${business.slug}`,
        dashboardUrl: `${appUrl}/dashboard`,
        lang,
      });
      await sendViaResend({ to: userEmail, subject, html });
    }
  } catch (err) {
    console.error("site-ready email failed (non-fatal):", err);
  }

  // Send webhook
  const webhookUrl = Deno.env.get("VITE_BUSINESS_WEBHOOK_URL");
  if (webhookUrl && business) {
    const appUrl = Deno.env.get("VITE_APP_URL") || "https://siango.app";
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "business_published",
          publishStatus: "published",
          businessId: session.business_id,
          slug: business.slug,
          businessName: business.name,
          siteUrl: `${appUrl}/store/${business.slug}`,
          publishedAt: now,
          userId: session.user_id,
        }),
      });
    } catch (err) {
      console.error("Webhook failed (non-fatal):", err);
    }
  }

  console.log(`✅ Business ${session.business_id} published via iCount IPN`);

  return new Response(JSON.stringify({ ok: true, businessId: session.business_id }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
