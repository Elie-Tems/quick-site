// Click tracking: records a 'clicked' event then 302-redirects to the real URL.
// Public (called when a recipient clicks a wrapped link).

import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const campaign = u.searchParams.get("c");
  const contact = u.searchParams.get("e");
  const target = u.searchParams.get("u") || "";
  // Only redirect to safe public http(s) URLs.
  let dest = "https://siango.app";
  try {
    const parsed = new URL(target);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") dest = parsed.toString();
  } catch { /* keep default */ }

  try {
    if (campaign) {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await admin.from("mkt_campaign_events").insert({ campaign_id: campaign, contact_id: contact || null, type: "clicked", url: dest });
    }
  } catch { /* never block the redirect */ }

  return new Response(null, { status: 302, headers: { Location: dest } });
});
