import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Language } from "@/contexts/LanguageContext";

/**
 * Keeps the app language in sync with a /en /ar /fr /ru URL prefix so the
 * language homepages are addressable and shareable (and match the localized
 * meta the edge middleware serves crawlers). Apex "/" and everything else leave
 * the language as-is (geo/localStorage default). Renders nothing.
 */
const PATH_LANGS: Record<string, Language> = { en: "en", ar: "ar", fr: "fr", ru: "ru" };

const LanguageUrlSync = () => {
  const location = useLocation();
  const { setLanguage } = useLanguage();

  useEffect(() => {
    const seg = location.pathname.replace(/^\/+/, "").split("/")[0];
    const lang = PATH_LANGS[seg];
    if (lang) setLanguage(lang);
  }, [location.pathname, setLanguage]);

  return null;
};

export default LanguageUrlSync;
