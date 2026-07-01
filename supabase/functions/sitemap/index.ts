import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const BASE_URL = "https://siango.app";

const staticRoutes = [
  { path: "/",           priority: "1.0", changefreq: "weekly" },
  { path: "/register",   priority: "0.9", changefreq: "monthly" },
  { path: "/templates",  priority: "0.8", changefreq: "weekly" },
  { path: "/help",       priority: "0.7", changefreq: "weekly" },
  { path: "/contact",    priority: "0.6", changefreq: "monthly" },
  { path: "/privacy",    priority: "0.3", changefreq: "yearly" },
  { path: "/terms",      priority: "0.3", changefreq: "yearly" },
  { path: "/accessibility", priority: "0.3", changefreq: "yearly" },
];

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: businesses } = await supabase
    .from("businesses")
    .select("slug, updated_at")
    .eq("is_published", true)
    .not("slug", "is", null);

  const today = new Date().toISOString().slice(0, 10);

  const staticUrls = staticRoutes.map((r) => ({
    loc: `${BASE_URL}${r.path}`,
    lastmod: today,
    priority: r.priority,
    changefreq: r.changefreq,
  }));

  const storeUrls = (businesses ?? []).flatMap((b) => [
    {
      loc: `${BASE_URL}/store/${b.slug}`,
      lastmod: b.updated_at?.slice(0, 10) ?? today,
      priority: "0.8",
      changefreq: "daily",
    },
    {
      loc: `${BASE_URL}/store/${b.slug}/about`,
      lastmod: b.updated_at?.slice(0, 10) ?? today,
      priority: "0.5",
      changefreq: "weekly",
    },
  ]);

  const allUrls = [...staticUrls, ...storeUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
