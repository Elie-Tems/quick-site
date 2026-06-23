// Validates a merchant's PayPlus credentials by asking PayPlus to generate a
// throwaway payment page (generating a link does NOT charge anyone). Called by
// the logged-in merchant from the dashboard, so verify_jwt = true.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Invalid session" }, 401);

  let body: { businessId?: string; api_key?: string; secret_key?: string; page_uid?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const { businessId, api_key, secret_key, page_uid } = body;
  if (!businessId || !api_key || !secret_key || !page_uid) {
    return json({ error: "businessId and all three keys are required" }, 400);
  }

  // Verify the caller actually owns this business.
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: business } = await admin
    .from("businesses").select("id, owner_id").eq("id", businessId).single();
  if (!business || business.owner_id !== user.id) return json({ error: "Forbidden" }, 403);

  const apiBase = Deno.env.get("PAYPLUS_API_BASE") || "https://restapidev.payplus.co.il/api/v1.0";
  try {
    const res = await fetch(`${apiBase}/PaymentPages/generateLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": api_key, "secret-key": secret_key },
      body: JSON.stringify({
        payment_page_uid: page_uid,
        charge_method: 1,
        amount: 1,
        currency_code: "ILS",
        customer: { customer_name: "Connection test", email: "test@siango.app" },
        items: [{ name: "בדיקת חיבור", quantity: 1, price: 1 }],
      }),
    });
    const data = await res.json();
    if (data?.results?.status === "success") return json({ ok: true });
    return json({ ok: false, error: data?.results?.description || "Credentials rejected by PayPlus" });
  } catch (err) {
    return json({ ok: false, error: "Could not reach PayPlus: " + String(err) });
  }
});
