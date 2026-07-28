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

// JSON-LD inside a <script> tag: escape the characters that could break out of
// the script element (a product/business name containing </script> etc.).
function ldJson(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

// ── Multilingual marketing homepage (SEO) ────────────────────────────────────
// The SPA homepage (Index.tsx) is Hebrew. For the language routes /en /ar /fr /ru
// we serve crawlers a localized <title>/description + a visible hero + hreflang,
// so each language is addressable and indexable (the React chrome also localizes
// for human visitors via LanguageContext). Apex "/" keeps its Hebrew meta and
// only gains the hreflang set.
// NOTE: ar/fr/ru copy is quality-drafted and flagged for native review before a
// public multilingual launch.
const HOME_L10N: Record<string, { title: string; description: string; heroH1: string; heroSub: string; dir: "rtl" | "ltr"; ogLocale: string }> = {
  en: {
    title: "Build a business website & online store in 5 minutes | Siango",
    description: "Create a professional website for your business in 5 minutes - an online store, a sales site, a bookings site, or a nonprofit page. No developer, no design, from ₪69/month. Built for businesses in Israel.",
    heroH1: "Your business website, live in 5 minutes",
    heroSub: "An online store, a bookings site, or a nonprofit page - no developer, no design skills. From ₪69/month.",
    dir: "ltr", ogLocale: "en_US",
  },
  ar: {
    title: "أنشئ موقعًا لعملك ومتجرًا إلكترونيًا في 5 دقائق | سيانغو",
    description: "أنشئ موقعًا احترافيًا لعملك في 5 دقائق - متجر إلكتروني، موقع مبيعات، موقع لحجز المواعيد أو صفحة لجمعية. بدون مبرمج وبدون تصميم، ابتداءً من 69 ₪ شهريًا. مصمم للأعمال في إسرائيل.",
    heroH1: "موقع عملك جاهز خلال 5 دقائق",
    heroSub: "متجر إلكتروني، موقع لحجز المواعيد أو صفحة لجمعية - بدون مبرمج وبدون تصميم. من 69 ₪ شهريًا.",
    dir: "rtl", ogLocale: "ar_AR",
  },
  fr: {
    title: "Créez le site et la boutique en ligne de votre entreprise en 5 minutes | Siango",
    description: "Créez un site professionnel pour votre entreprise en 5 minutes : boutique en ligne, site de vente, prise de rendez-vous ou page d'association. Sans développeur ni design, à partir de 69 ₪/mois.",
    heroH1: "Le site de votre entreprise, en ligne en 5 minutes",
    heroSub: "Une boutique en ligne, un site de réservation ou une page d'association - sans développeur ni design. À partir de 69 ₪/mois.",
    dir: "ltr", ogLocale: "fr_FR",
  },
  ru: {
    title: "Создайте сайт и интернет-магазин для бизнеса за 5 минут | Siango",
    description: "Создайте профессиональный сайт для вашего бизнеса за 5 минут - интернет-магазин, сайт продаж, запись на приём или страницу НКО. Без программиста и дизайна, от 69 ₪ в месяц.",
    heroH1: "Сайт вашего бизнеса за 5 минут",
    heroSub: "Интернет-магазин, сайт записи или страница НКО - без программиста и дизайна. От 69 ₪ в месяц.",
    dir: "ltr", ogLocale: "ru_RU",
  },
};

// path (no trailing slash) → language, for the apex marketing home only.
function homeLangForPath(pathname: string): string | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/") return "he";
  const m = p.match(/^\/(en|ar|fr|ru)$/);
  return m ? m[1] : null;
}

function hreflangLinks(siteUrl: string): string {
  const langs: [string, string][] = [
    ["he", `${siteUrl}/`], ["en", `${siteUrl}/en`], ["ar", `${siteUrl}/ar`],
    ["fr", `${siteUrl}/fr`], ["ru", `${siteUrl}/ru`], ["x-default", `${siteUrl}/`],
  ];
  return langs.map(([l, href]) => `<link rel="alternate" hreflang="${l}" href="${esc(href)}" />`).join("");
}

function buildHomeHead(lang: string, canonical: string): string {
  const l = HOME_L10N[lang];
  return [
    `<title>${esc(l.title)}</title>`,
    `<meta name="description" content="${esc(l.description)}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:title" content="${esc(l.title)}" />`,
    `<meta property="og:description" content="${esc(l.description)}" />`,
    `<meta property="og:locale" content="${l.ogLocale}" />`,
    `<meta property="og:image" content="https://siango.app/og-image.png" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(l.title)}" />`,
    `<meta name="twitter:description" content="${esc(l.description)}" />`,
  ].join("");
}

function buildHomeBody(lang: string): string {
  const l = HOME_L10N[lang];
  return `<section data-ssr-hero dir="${l.dir}"><h1>${esc(l.heroH1)}</h1><p>${esc(l.heroSub)}</p></section>`;
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
    `<script type="application/ld+json">${ldJson(localBusiness)}</script>`,
    productList ? `<script type="application/ld+json">${ldJson(productList)}</script>` : "",
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

    // Marketing homepage language variants (apex host only): /en /ar /fr /ru get
    // localized meta + a crawler-visible hero; apex "/" just gains hreflang.
    if (!hostSlug) {
      const homeLang = homeLangForPath(url.pathname);
      if (homeLang) {
        const ct0 = response.headers.get("content-type") || "";
        if (!ct0.includes("text/html")) return response;
        const isHe = homeLang === "he";
        const canonicalHome = isHe ? `${siteUrl}/` : `${siteUrl}/${homeLang}`;
        // deno-lint-ignore no-explicit-any
        let hr = new (globalThis as any).HTMLRewriter();
        if (isHe) {
          hr = hr.on("head", { element: (el: any) => el.append(hreflangLinks(siteUrl), { html: true }) });
        } else {
          const l = HOME_L10N[homeLang];
          hr = hr
            .on("title", { element: (el: any) => el.remove() })
            .on('meta[name="description"]', { element: (el: any) => el.remove() })
            .on('meta[name="keywords"]', { element: (el: any) => el.remove() })
            .on('meta[property^="og:"]', { element: (el: any) => el.remove() })
            .on('meta[name^="twitter:"]', { element: (el: any) => el.remove() })
            .on('link[rel="canonical"]', { element: (el: any) => el.remove() })
            .on("html", { element: (el: any) => { el.setAttribute("lang", homeLang); el.setAttribute("dir", l.dir); } })
            .on("head", { element: (el: any) => el.append(buildHomeHead(homeLang, canonicalHome) + hreflangLinks(siteUrl), { html: true }) })
            .on('div[id="root"]', { element: (el: any) => el.append(buildHomeBody(homeLang), { html: true }) });
        }
        const out = hr.transform(response);
        const h = new Headers(out.headers);
        h.set("Cache-Control", "public, max-age=300, s-maxage=300");
        return new Response(out.body, { status: out.status, statusText: out.statusText, headers: h });
      }
    }

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
