// Admin-only: permanently delete a user account from Supabase Auth.
// Cascades to profiles + businesses via DB foreign keys.
// Auth gate: caller must have the 'admin' role (same pattern as billing-refund).

import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "method" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: "invalid session" }, 401);

  const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
  if (isAdmin !== true) return json({ error: "forbidden" }, 403);

  let body: { userId?: string };
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }
  if (!body.userId) return json({ error: "userId required" }, 400);

  // Prevent self-deletion
  if (body.userId === user.id) return json({ error: "cannot delete yourself" }, 400);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await admin.auth.admin.deleteUser(body.userId);
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
});
