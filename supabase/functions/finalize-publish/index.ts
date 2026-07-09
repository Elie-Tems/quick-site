import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { sessionToken?: string; approvalNum?: string; businessId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sessionToken = body.sessionToken?.trim();
  const approvalNum = body.approvalNum?.trim();
  const businessIdFromBody = body.businessId?.trim();
  
  if (!sessionToken && !approvalNum) {
    return new Response(JSON.stringify({ error: "sessionToken or approvalNum required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  let session: { id: string; user_id: string; business_id: string; status: string; payment_verified_at: string | null } | null = null;
  let sErr: any = null;

  // If approval number provided, find business_id
  if (approvalNum) {
    // Approval number provided by the merchant from their iCount receipt.
    // We need businessId to know which business to publish. It can come from:
    // 1. An existing pending session for this user (most common path)
    // 2. businessIdFromBody (if supplied explicitly)
    // 3. The approval_num table (if the IPN webhook already stored it)

    // First check if this approval number was already stored by the IPN webhook
    const { data: storedApproval } = await admin
      .from("approval_num")
      .select("number, business_id")
      .eq("number", approvalNum)
      .maybeSingle();

    // Determine target business_id
    let targetBusinessId: string | null = storedApproval?.business_id ?? businessIdFromBody ?? null;

    // If we still don't have a business_id, find the most recent pending session for this user
    if (!targetBusinessId) {
      const { data: pendingSession } = await admin
        .from("publish_checkout_sessions")
        .select("business_id")
        .eq("user_id", user.id)
        .in("status", ["pending", "paid"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      targetBusinessId = pendingSession?.business_id ?? null;
    }

    if (!targetBusinessId) {
      return new Response(JSON.stringify({ error: "Could not determine business for this approval number. Please contact support." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save the approval number to approval_num table (idempotent)
    await admin.from("approval_num").upsert({
      number: approvalNum,
      business_id: targetBusinessId,
    }, { onConflict: "number" });

    // Find or create session for this business
    const { data: existingSession, error: sessionErr } = await admin
      .from("publish_checkout_sessions")
      .select("id, user_id, business_id, status, payment_verified_at")
      .eq("business_id", targetBusinessId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sessionErr) {
      sErr = sessionErr;
    } else if (existingSession) {
      session = existingSession;
      // Mark as paid since approval number was provided
      const now = new Date().toISOString();
      await admin
        .from("publish_checkout_sessions")
        .update({
          status: "paid",
          payment_verified_at: now,
          external_transaction_id: approvalNum,
          updated_at: now
        })
        .eq("id", existingSession.id);
      session.payment_verified_at = now;
    } else {
      // Create new session
      const now = new Date().toISOString();
      const { data: newSession, error: createErr } = await admin
        .from("publish_checkout_sessions")
        .insert({
          user_id: user.id,
          business_id: targetBusinessId,
          session_token: crypto.randomUUID(),
          status: "paid",
          payment_verified_at: now,
          external_transaction_id: approvalNum,
          amount_ils: 69,
          provider: "icount",
        })
        .select("id, user_id, business_id, status, payment_verified_at")
        .single();

      if (createErr) {
        sErr = createErr;
      } else {
        session = newSession;
      }
    }
  } else {
    // Use sessionToken
    const { data: tokenSession, error: tokenErr } = await admin
      .from("publish_checkout_sessions")
      .select("id, user_id, business_id, status, payment_verified_at")
      .eq("session_token", sessionToken)
      .maybeSingle();

    session = tokenSession;
    sErr = tokenErr;
  }

  if (sErr || !session) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (session.user_id !== user.id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Paid gate restored (2026-07-09): Cardcom is live. This legacy path (approval-
  // number / sessionToken finalize) only publishes once a payment is verified. The
  // primary Cardcom flow publishes via billing-cardcom-webhook, not here.
  const paid = session.payment_verified_at != null;

  if (!paid) {
    return new Response(
      JSON.stringify({
        ok: false,
        pendingPayment: true,
        message: "Payment not confirmed yet",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const now = new Date().toISOString();

  // Get business details for webhook
  const { data: business } = await admin
    .from("businesses")
    .select("slug, name, legal_approved_at")
    .eq("id", session.business_id)
    .single();

  // Legal gate: the terms + privacy policy must be explicitly approved by the
  // merchant before the store can go live. This does NOT block building the site
  // (editing/saving stays open) - only the final publish step.
  if (!business?.legal_approved_at) {
    return new Response(
      JSON.stringify({
        ok: false,
        legalNotApproved: true,
        message: "צריך לאשר את המסמכים המשפטיים (תקנון ומדיניות פרטיות) לפני פרסום האתר.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { error: pubErr } = await admin
    .from("businesses")
    .update({ is_published: true, updated_at: now })
    .eq("id", session.business_id);

  if (pubErr) {
    console.error(pubErr);
    return new Response(JSON.stringify({ error: "Publish failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await admin
    .from("publish_checkout_sessions")
    .update({ status: "completed", updated_at: now })
    .eq("id", session.id);

  // Tell the merchant their site is live. Route through send-platform-email
  // (service-role) so the send is audited in platform_email_log and honors
  // unsubscribe - identical to the paid-publish path in billing-icount-ipn.
  try {
    if (user.email && business) {
      const appUrl = Deno.env.get("VITE_APP_URL") || "https://siango.app";
      // Send in the language the merchant signed up in (captured in user_metadata).
      const lang = (user.user_metadata?.preferred_language as any) || "he";
      await fetch(`${supabaseUrl}/functions/v1/send-platform-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
        body: JSON.stringify({
          type: "siteReady",
          to: user.email,
          ctx: {
            businessName: business.name,
            siteUrl: `${appUrl}/store/${business.slug}`,
            dashboardUrl: `${appUrl}/dashboard`,
            recipientEmail: user.email,
            lang,
          },
        }),
      });
    }
  } catch (err) {
    console.error("site-ready email failed (non-fatal):", err);
  }

  // Send webhook after successful publish
  const webhookUrl = Deno.env.get("VITE_BUSINESS_WEBHOOK_URL");
  if (webhookUrl && business) {
    const siteUrl = `${Deno.env.get("VITE_APP_URL") || "https://siango.app"}/store/${business.slug}`;
    
    const payload = {
      type: "business_published",
      publishStatus: "published",
      businessId: session.business_id,
      slug: business.slug,
      businessName: business.name,
      siteUrl,
      publishedAt: now,
      userId: session.user_id,
    };

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      console.log(`✅ Webhook sent for business ${session.business_id}`);
    } catch (err) {
      console.error("❌ Webhook failed:", err);
      // Don't fail the publish if webhook fails
    }
  }

  return new Response(
    JSON.stringify({ ok: true, businessId: session.business_id }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
