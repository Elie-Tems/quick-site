// Open tracking: a 1x1 transparent GIF embedded in sent emails. Records an
// 'opened' event then returns the pixel. Public (called by email clients).

import { createClient } from "npm:@supabase/supabase-js@2";

// 1x1 transparent GIF
const GIF = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), (c) => c.charCodeAt(0));
const pixel = () => new Response(GIF, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } });

Deno.serve(async (req) => {
  try {
    const u = new URL(req.url);
    const campaign = u.searchParams.get("c");
    const contact = u.searchParams.get("e");
    if (campaign) {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await admin.from("mkt_campaign_events").insert({ campaign_id: campaign, contact_id: contact || null, type: "opened" });
    }
  } catch { /* never fail the pixel */ }
  return pixel();
});
