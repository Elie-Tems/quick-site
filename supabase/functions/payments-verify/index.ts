// Generic "verify credentials" endpoint. Called by the logged-in merchant from
// the dashboard. Dispatches to the chosen provider's adapter. verify_jwt = true.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getProvider } from "../_shared/payments/registry.ts";

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
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "Invalid session" }, 401);

  let body: { businessId?: string; provider?: string; api_key?: string; secret_key?: string; page_uid?: string; config?: Record<string, unknown> };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (!body.businessId) return json({ error: "businessId required" }, 400);

  const provider = getProvider(body.provider);
  if (!provider) return json({ error: `Unsupported provider: ${body.provider}` }, 400);

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: business } = await admin.from("businesses").select("id, owner_id").eq("id", body.businessId).single();
  if (!business || business.owner_id !== user.id) return json({ error: "Forbidden" }, 403);

  const result = await provider.verifyCredentials(
    { api_key: body.api_key, secret_key: body.secret_key, page_uid: body.page_uid, config: body.config ?? null },
    Deno.env,
  );
  return json(result);
});
