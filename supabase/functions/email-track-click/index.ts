// Click tracking: records a 'clicked' event then 302-redirects to the real URL.
// Public (called when a recipient clicks a wrapped link).
//
// Anti-phishing: ?u= must share a hostname with the business's own domain (slug
// subdomain or custom domain). Falls back to siango.app home on any mismatch so
// the link still "works" in a way the recipient expects.

import { createClient } from "npm:@supabase/supabase-js@2";

const FALLBACK = "https://siango.app";

Deno.serve(async (req) => {
  const u = new URL(req.url);
  const campaign = u.searchParams.get("c");
  const contact = u.searchParams.get("e");
  const target = u.searchParams.get("u") || "";

  let dest = FALLBACK;
  try {
    const parsed = new URL(target);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("bad protocol");

    // Verify the target domain belongs to the campaign's business.
    if (campaign) {
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

      // Fetch slug + custom domain for the campaign's business.
      const { data: biz } = await admin
        .from("mkt_campaigns")
        .select("businesses!inner(slug, custom_domain)")
        .eq("id", campaign)
        .maybeSingle();

      const slug: string = (biz as any)?.businesses?.slug ?? "";
      const customDomain: string = (biz as any)?.businesses?.custom_domain ?? "";
      const allowedHosts = new Set<string>([
        `${slug}.siango.app`,
        "siango.app",
        ...(customDomain ? [customDomain.replace(/^https?:\/\//, "").split("/")[0]] : []),
      ]);

      if (allowedHosts.has(parsed.hostname)) {
        dest = parsed.toString();
      }
      // If not in allowed set, dest stays FALLBACK — link resolves to home, not phishing target.

      await admin.from("mkt_campaign_events").insert({
        campaign_id: campaign,
        contact_id: contact || null,
        type: "clicked",
        url: dest,
      });
    } else {
      // No campaign context — allow any safe http(s) URL (tracking pixel without campaign).
      dest = parsed.toString();
    }
  } catch { /* keep FALLBACK */ }

  return new Response(null, { status: 302, headers: { Location: dest } });
});
