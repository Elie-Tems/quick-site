/**
 * Cloudflare Pages Function - edge SEO renderer.
 *
 * Problem it solves: the app is a client-rendered SPA. Search engines can
 * eventually render JS, but social/preview crawlers (WhatsApp, Facebook,
 * Twitter) never run JS - so shared store links get no title/image preview,
 * and store indexing is weak/slow.
 *
 * What it does: for published storefront routes it fetches the business (and a
 * few products) from Supabase at the edge and injects real <title>, meta,
 * Open Graph / Twitter tags, JSON-LD, and a crawler-visible content block into
 * the served HTML - BEFORE any JavaScript runs. Real users still get the full
 * interactive SPA (React clears #root on mount; the injected block is only seen
 * by no-JS crawlers).
 *
 * Safety: this middleware FAILS OPEN. Any error (bad route, Supabase down,
 * store not found) returns the original SPA response unchanged, so it can
 * never take the live site down.
 *
 * Required environment variables (set in the Cloudflare Pages project):
 *   SUPABASE_URL       e.g. https://ytqgeoviokgxxwalieev.supabase.co
 *   SUPABASE_ANON_KEY  the public anon key (RLS exposes only published stores)
 *   SITE_URL           optional, defaults to https://siango.app
 */

interface Env {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SITE_URL?: string;
  BASE_DOMAIN?: string;
}

// System subdomains that can never be a tenant store (kept in sync with
// src/lib/subdomain.ts). A tenant subdomain is a single label below BASE_DOMAIN.
const RESERVED_SUBDOMAINS = new Set<string>([
  "www", "app", "api", "admin", "dashboard", "auth", "login", "account",
  "mail", "email", "smtp", "imap", "ftp", "ns", "ns1", "ns2",
  "cdn", "assets", "static", "img", "images", "media", "files", "uploads",
  "blog", "help", "support", "docs", "status", "about", "contact",
  "dev", "staging", "stage", "test", "demo", "sandbox", "preview",
  "manage", "internal", "billing", "pay", "payments", "checkout", "store",
  "go", "link", "links", "track", "analytics", "metrics",
]);

// Extract a tenant store slug from the request hostname, or null for the apex,
// reserved names, localhost, or non-matching hosts.
function tenantSlugFromHost(hostname: string, baseDomain: string): string | null {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || /^[\d.]+$/.test(host)) return null;
  const suffix = "." + baseDomain;
  if (!host.endsWith(suffix)) return null;
  const label = host.slice(0, -suffix.length);
  if (!label || label.includes(".") || RESERVED_SUBDOMAINS.has(label)) return null;
  return label;
}

interface StoreBusiness {
  id: string;
  name: string;
  slug: string | null;
  tagline: string | null;
  about_text: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  business_category: string | null;
  phone: string | null;
  email: string | null;
  primary_color: string | null;
}

interface StoreProduct {
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  sku: string | null;
}

const CATEGORY_SCHEMA: Record<string, string> = {
  food: "FoodEstablishment",
  fashion: "ClothingStore",
  cosmetics: "BeautySalon",
  electronics: "ElectronicsStore",
  home: "HomeGoodsStore",
  toys: "ToyStore",
  jewelry: "JewelryStore",
  art: "ArtGallery",
  sports: "SportingGoodsStore",
  pets: "PetStore",
  books: "BookStore",
  other: "Store",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Matches /store/:slug and /store/:slug/about (V1 only - V2 is not a live route).
function matchStoreRoute(pathname: string): { slug: string; isAbout: boolean } | null {
  const m = pathname.match(/^\/store\/([^/]+)(\/about)?\/?$/);
  if (!m) return null;
  // Exclude the V2 prototype routes (/store/:slug/v2...) and the bare /store.
  if (m[1] === "v2") return null;
  return { slug: decodeURIComponent(m[1]), isAbout: !!m[2] };
}

async function fetchStore(env: Env, slug: string): Promise<{ business: StoreBusiness; products: StoreProduct[] } | null> {
  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY;
  if (!base || !key) return null;

  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  const bizRes = await fetch(
    `${base}/rest/v1/businesses?slug=eq.${encodeURIComponent(slug)}&is_published=eq.true` +
      `&select=id,name,slug,tagline,about_text,logo_url,hero_image_url,business_category,phone,email,primary_color&limit=1`,
    { headers },
  );
  if (!bizRes.ok) return null;
  const biz = (await bizRes.json()) as StoreBusiness[];
  if (!Array.isArray(biz) || biz.length === 0) return null;
  const business = biz[0];

  let products: StoreProduct[] = [];
  try {
    const prodRes = await fetch(
      `${base}/rest/v1/products?business_id=eq.${business.id}&active=eq.true` +
        `&select=name,description,price,image_url,sku&order=sort_order.asc&limit=20`,
      { headers },
    );
    if (prodRes.ok) products = (await prodRes.json()) as StoreProduct[];
  } catch {
    // Products are optional for the meta render - ignore failures.
  }

  return { business, products };
}

function buildHead(
  business: StoreBusiness,
  products: StoreProduct[],
  storeUrl: string,
  isAbout: boolean,
): string {
  const title = isAbout ? `אודות | ${business.name}` : `${business.name} | הזמנה אונליין`;
  const description =
    business.tagline ||
    (business.about_text ? business.about_text.slice(0, 160) : `הזמנות אונליין מ${business.name}`);
  const ogImage = business.hero_image_url || business.logo_url || "https://siango.app/og-image.png";
  const schemaType = CATEGORY_SCHEMA[business.business_category || "other"] || "Store";

  const localBusiness: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    "@id": storeUrl,
    name: business.name,
    description,
    url: storeUrl,
    image: ogImage,
    ...(business.logo_url ? { logo: business.logo_url } : {}),
    ...(business.phone ? { telephone: business.phone } : {}),
    ...(business.email ? { email: business.email } : {}),
    address: { "@type": "PostalAddress", addressCountry: "IL" },
    priceRange: "₪₪",
    currenciesAccepted: "ILS",
    areaServed: { "@type": "Country", name: "Israel" },
  };

  const productList =
    products.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `מוצרים מ${business.name}`,
          numberOfItems: products.length,
          itemListElement: products.slice(0, 10).map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Product",
              name: p.name,
              ...(p.description ? { description: p.description } : {}),
              ...(p.image_url ? { image: p.image_url } : {}),
              ...(p.sku ? { sku: p.sku } : {}),
              offers: {
                "@type": "Offer",
                priceCurrency: "ILS",
                price: p.price,
                availability: "https://schema.org/InStock",
              },
            },
          })),
        }
      : null;

  const metaTags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(storeUrl)}" />`,
    `<meta name="robots" content="index, follow" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${esc(storeUrl)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${esc(ogImage)}" />`,
    `<meta property="og:locale" content="he_IL" />`,
    `<meta property="og:site_name" content="${esc(business.name)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(ogImage)}" />`,
    `<script type="application/ld+json">${JSON.stringify(localBusiness)}</script>`,
    productList ? `<script type="application/ld+json">${JSON.stringify(productList)}</script>` : "",
  ];

  return metaTags.join("\n");
}

function buildBodyContent(business: StoreBusiness, products: StoreProduct[], isAbout: boolean): string {
  const heading = esc(business.name);
  const sub = business.tagline ? `<p>${esc(business.tagline)}</p>` : "";
  const about = isAbout && business.about_text ? `<p>${esc(business.about_text)}</p>` : "";
  const productList =
    !isAbout && products.length > 0
      ? `<ul>${products
          .map((p) => `<li>${esc(p.name)} - ${p.price} ₪${p.description ? `: ${esc(p.description)}` : ""}</li>`)
          .join("")}</ul>`
      : "";
  // Hidden from sighted users (SPA replaces #root anyway), present for no-JS crawlers.
  return `<div id="seo-content" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);"><h1>${heading}</h1>${sub}${about}${productList}</div>`;
}

export const onRequest = async (context: {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}): Promise<Response> => {
  const { request, env, next } = context;

  // Always let the static asset / SPA pipeline produce the base response first.
  const response = await next();

  try {
    if (request.method !== "GET") return response;

    const url = new URL(request.url);
    const siteUrl = (env.SITE_URL || "https://siango.app").replace(/\/$/, "");
    const baseDomain = env.BASE_DOMAIN || siteUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    // Two URL shapes resolve to a store:
    //   1. Tenant subdomain:  aurora.siango.app  (path "/" or "/about")
    //   2. Path form:         siango.app/store/aurora[/about]
    const hostSlug = tenantSlugFromHost(url.hostname, baseDomain);
    let route: { slug: string; isAbout: boolean } | null;
    let canonical: string;
    if (hostSlug) {
      // On a store subdomain, only the home and /about pages get SEO injection.
      if (url.pathname !== "/" && url.pathname.replace(/\/$/, "") !== "/about") return response;
      const isAbout = url.pathname.replace(/\/$/, "") === "/about";
      route = { slug: hostSlug, isAbout };
      canonical = `https://${hostSlug}.${baseDomain}${isAbout ? "/about" : "/"}`;
    } else {
      route = matchStoreRoute(url.pathname);
      if (!route) return response;
      canonical = `${siteUrl}/store/${route.slug}${route.isAbout ? "/about" : ""}`;
    }

    // Only rewrite HTML documents.
    const ct = response.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return response;

    const store = await fetchStore(env, route.slug);
    if (!store) return response; // unknown / unpublished store → serve SPA as-is

    const storeUrl = canonical;

    const headHtml = buildHead(store.business, store.products, storeUrl, route.isAbout);
    const bodyHtml = buildBodyContent(store.business, store.products, route.isAbout);

    const rewriter = new (globalThis as any).HTMLRewriter()
      // Drop the static placeholder head tags so we don't emit duplicates.
      .on("title", { element: (el: any) => el.remove() })
      .on('meta[name="description"]', { element: (el: any) => el.remove() })
      .on('meta[name="keywords"]', { element: (el: any) => el.remove() })
      .on('meta[property^="og:"]', { element: (el: any) => el.remove() })
      .on('meta[name^="twitter:"]', { element: (el: any) => el.remove() })
      .on('link[rel="canonical"]', { element: (el: any) => el.remove() })
      // Inject the store-specific head + crawler-visible body content.
      .on("head", { element: (el: any) => el.append(headHtml, { html: true }) })
      .on('div[id="root"]', { element: (el: any) => el.append(bodyHtml, { html: true }) });

    const rewritten = rewriter.transform(response);
    const headers = new Headers(rewritten.headers);
    // Let the edge cache the rendered store HTML briefly.
    headers.set("Cache-Control", "public, max-age=300, s-maxage=300");
    return new Response(rewritten.body, {
      status: rewritten.status,
      statusText: rewritten.statusText,
      headers,
    });
  } catch (err) {
    // Fail open - never break the live site because of SEO rendering.
    console.error("seo-middleware error:", err);
    return response;
  }
};
