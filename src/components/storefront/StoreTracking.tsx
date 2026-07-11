import { useEffect, useState } from "react";
import { hasMarketingConsent, COOKIE_CONSENT_EVENT } from "@/components/CookieConsent";

/**
 * Injects the MERCHANT's own marketing/tracking tags into their published
 * storefront (the paid "marketing tags" add-on). Active only when the store
 * paid for the add-on. Tags are appended to <head> on mount and removed on
 * unmount, so navigating away from a store cleans them up.
 *
 * Supports: Google Tag Manager, GA4 (gtag), Meta/Facebook Pixel, Google Ads,
 * TikTok Pixel, and a free-form custom <head> snippet (advanced).
 */

export interface StoreTrackingConfig {
  paid?: boolean | null;
  gtmId?: string | null;
  ga4Id?: string | null;
  metaPixel?: string | null;
  googleAds?: string | null;
  tiktokPixel?: string | null;
  customHead?: string | null;
}

const clean = (v?: string | null) => (v || "").trim();

/**
 * Hook form - call once at the top of the storefront component so the tags
 * persist across the store's internal view changes (shopping/cart/checkout/
 * thank-you) without re-injecting on every switch.
 */
export const useStoreTracking = (config: StoreTrackingConfig) => {
  // Re-evaluate when the visitor changes their cookie choice.
  const [consentTick, setConsentTick] = useState(0);
  useEffect(() => {
    const onConsent = () => setConsentTick((t) => t + 1);
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
  }, []);

  useEffect(() => {
    if (!config?.paid) return;
    // Don't load analytics/marketing pixels until the visitor consents (cookie law).
    if (!hasMarketingConsent()) return;

    const added: Node[] = [];
    const inline = (js: string, id: string) => {
      const s = document.createElement("script");
      s.type = "text/javascript";
      s.setAttribute("data-store-tracking", id);
      s.text = js;
      document.head.appendChild(s);
      added.push(s);
    };
    const ext = (src: string, id: string) => {
      const s = document.createElement("script");
      s.async = true;
      s.src = src;
      s.setAttribute("data-store-tracking", id);
      document.head.appendChild(s);
      added.push(s);
    };

    const gtm = clean(config.gtmId);
    const ga4 = clean(config.ga4Id);
    const meta = clean(config.metaPixel);
    const ads = clean(config.googleAds);
    const tiktok = clean(config.tiktokPixel);
    const custom = clean(config.customHead);

    // Google Tag Manager
    if (/^GTM-/i.test(gtm)) {
      inline(
        `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});` +
          `var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;` +
          `j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})` +
          `(window,document,'script','dataLayer','${gtm}');`,
        "gtm",
      );
    }

    // GA4 + Google Ads share gtag.js. Load it once if either is set.
    if (/^G-/i.test(ga4) || /^AW-/i.test(ads)) {
      const firstId = /^G-/i.test(ga4) ? ga4 : ads;
      ext(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(firstId)}`, "gtag-src");
      let cfg = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());`;
      if (/^G-/i.test(ga4)) cfg += `gtag('config','${ga4}');`;
      if (/^AW-/i.test(ads)) cfg += `gtag('config','${ads}');`;
      inline(cfg, "gtag-cfg");
    }

    // Meta / Facebook Pixel
    if (/^\d{10,20}$/.test(meta)) {
      inline(
        `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?` +
          `n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;` +
          `n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;` +
          `t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}` +
          `(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');` +
          `fbq('init','${meta}');fbq('track','PageView');`,
        "meta",
      );
    }

    // TikTok Pixel
    if (tiktok) {
      inline(
        `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];` +
          `ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];` +
          `ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};` +
          `for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);` +
          `ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};` +
          `ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};` +
          `var o=d.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};` +
          `ttq.load('${tiktok}');ttq.page();}(window,document,'ttq');`,
        "tiktok",
      );
    }

    // Free-form custom head snippet (advanced).
    // SECURITY: storefronts render on the SAME origin (siango.app) as the
    // authenticated dashboard, so any <script> injected here would run
    // same-origin and could read another logged-in user's Supabase session
    // token from localStorage (cross-tenant account takeover). We therefore do
    // NOT execute arbitrary scripts from this field. Only non-executing site
    // verification tags (<meta>, <link>) are injected; all real tracking goes
    // through the structured GTM / GA4 / Meta / Ads / TikTok fields above.
    // Executing full custom scripts safely requires serving stores from an
    // isolated origin (infra change, tracked separately).
    if (custom) {
      const wrap = document.createElement("div");
      wrap.innerHTML = custom;
      const ALLOWED_TAGS = new Set(["META", "LINK"]);
      // Deliberately excludes http-equiv (meta-refresh redirect) and any on* handler.
      const SAFE_ATTRS = new Set(["name", "content", "property", "rel", "href", "charset"]);
      Array.from(wrap.childNodes).forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        if (!ALLOWED_TAGS.has(el.nodeName)) return; // drop <script>, <img>, <iframe>, <style>, etc.
        Array.from(el.attributes).forEach((a) => {
          const attr = a.name.toLowerCase();
          const val = (a.value || "").trim().toLowerCase();
          if (!SAFE_ATTRS.has(attr) || attr.startsWith("on") || val.startsWith("javascript:")) {
            el.removeAttribute(a.name);
          }
        });
        el.setAttribute("data-store-tracking", "custom");
        document.head.appendChild(el);
        added.push(el);
      });
    }

    return () => {
      added.forEach((n) => {
        try {
          document.head.removeChild(n);
        } catch {
          /* already gone */
        }
      });
    };
    // Depend on the actual values, not the object identity, so we don't
    // re-inject on every render.
  }, [
    config.paid,
    config.gtmId,
    config.ga4Id,
    config.metaPixel,
    config.googleAds,
    config.tiktokPixel,
    config.customHead,
    consentTick,
  ]);
};

/** Component form (renders nothing). */
const StoreTracking = ({ config }: { config: StoreTrackingConfig }) => {
  useStoreTracking(config);
  return null;
};

export default StoreTracking;
