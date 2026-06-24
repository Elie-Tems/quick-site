import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Always validate the approval number against the approval_num table.
    // The table is the source of truth - it records which business each
    // payment-approval number belongs to. Never trust a client-supplied
    // businessId on its own, otherwise any logged-in user could mark their
    // own business "paid" with an arbitrary approval number.
    const { data: approval, error: approvalErr } = await admin
      .from("approval_num")
      .select("number, business_id")
      .eq("number", approvalNum)
      .maybeSingle();

    if (approvalErr || !approval) {
      return new Response(JSON.stringify({ error: "Approval number not found in database" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetBusinessId = approval.business_id;

    // If the client also passed a businessId, it must match the approval's
    // business. A mismatch means the request is trying to apply someone
    // else's payment to a different business.
    if (businessIdFromBody && businessIdFromBody !== targetBusinessId) {
      return new Response(JSON.stringify({ error: "Approval number does not match business" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    .select("slug, name")
    .eq("id", session.business_id)
    .single();

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
