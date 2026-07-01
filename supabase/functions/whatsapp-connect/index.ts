// Stores the result of the in-product Embedded Signup: the merchant connected
// their WhatsApp Business Account (WABA) via the Meta popup; the frontend posts
// the resulting ids here and we persist them on whatsapp_accounts.
// Auth: the logged-in merchant (verified to own the business).
// BUILD-ONLY: not deployed until approved.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ ok: false, error: "Unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: uErr } = await userClient.auth.getUser();
  if (uErr || !user) return json({ ok: false, error: "Invalid session" }, 401);

  let body: { businessId?: string; wabaId?: string; phoneNumberId?: string; phoneNumber?: string; displayName?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

  const businessId = body.businessId?.trim();
  if (!businessId || !body.phoneNumber) return json({ ok: false, error: "businessId + phoneNumber required" }, 400);

  const admin = createClient(url, service);

  // Verify ownership (business.owner_id -> profiles.id -> user_id).
  const { data: biz } = await admin.from("businesses").select("owner_id").eq("id", businessId).maybeSingle();
  if (!biz) return json({ ok: false, error: "Forbidden" }, 403);
  const { data: prof } = await admin.from("profiles").select("user_id").eq("id", biz.owner_id).maybeSingle();
  if (!prof || prof.user_id !== user.id) return json({ ok: false, error: "Forbidden" }, 403);

  const now = new Date().toISOString();
  const { error } = await admin.from("whatsapp_accounts").upsert({
    business_id: businessId,
    provider: "twilio",
    waba_id: body.wabaId || null,
    phone_number_id: body.phoneNumberId || null,
    phone_number: body.phoneNumber,
    display_name: body.displayName || null,
    status: "connected",
    connected_at: now,
    updated_at: now,
  }, { onConflict: "business_id" });

  if (error) return json({ ok: false, error: error.message }, 500);
  return json({ ok: true, status: "connected" });
});
