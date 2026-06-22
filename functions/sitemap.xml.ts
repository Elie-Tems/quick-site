/**
 * Cloudflare Pages Function — dynamic sitemap served at /sitemap.xml.
 *
 * Must live on the same host (quick-site.app) as the URLs it lists, which is
 * why it's a Pages Function and not a Supabase edge function. Lists the static
 * marketing pages plus every published store (and its about page) so search
 * engines discover new stores automatically.
 *
 * Fails open: if the store query fails, the static marketing pages are still
 * returned so the marketing site stays indexable.
 *
 * Required environment variables (Cloudflare Pages project):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, optional SITE_URL.
 *
 * NOTE: there must be no static public/sitemap.xml — a static asset of the
 * same path would shadow this function.
 */

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SITE_URL?: string;
}

const STATIC_ROUTES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/templates", changefreq: "weekly", priority: "0.8" },
  { path: "/register", changefreq: "monthly", priority: "0.9" },
  { path: "/login", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/help", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/accessibility", changefreq: "yearly", priority: "0.3" },
];

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc: string, lastmod: string | null, changefreq: string, priority: string): string {
  return (
    "  <url>\n" +
    `    <loc>${xmlEscape(loc)}</loc>\n` +
    (lastmod ? `    <lastmod>${lastmod.slice(0, 10)}</lastmod>\n` : "") +
    `    <changefreq>${changefreq}</changefreq>\n` +
    `    <priority>${priority}</priority>\n` +
    "  </url>"
  );
}

export const onRequest = async (context: { env: Env }): Promise<Response> => {
  const { env } = context;
  const siteUrl = (env.SITE_URL || "https://quick-site.app").replace(/\/$/, "");
  const today = new Date().toISOString().slice(0, 10);
  const entries: string[] = [];

  for (const r of STATIC_ROUTES) {
    entries.push(urlEntry(`${siteUrl}${r.path}`, today, r.changefreq, r.priority));
  }

  try {
    if (env.SUPABASE_URL && env.SUPABASE_ANON_KEY) {
      const headers = { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` };
      const res = await fetch(
        `${env.SUPABASE_URL}/rest/v1/businesses?is_published=eq.true&slug=not.is.null` +
          `&select=slug,updated_at&order=updated_at.desc&limit=50000`,
        { headers },
      );
      if (res.ok) {
        const stores = (await res.json()) as Array<{ slug: string | null; updated_at: string | null }>;
        for (const s of stores) {
          if (!s.slug) continue;
          const base = `${siteUrl}/store/${s.slug}`;
          entries.push(urlEntry(base, s.updated_at, "daily", "0.8"));
          entries.push(urlEntry(`${base}/about`, s.updated_at, "monthly", "0.5"));
        }
      }
    }
  } catch (err) {
    console.error("sitemap store enumeration failed:", err);
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.join("\n") +
    "\n</urlset>\n";

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
};
