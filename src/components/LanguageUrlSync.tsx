import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage, LANGUAGES, type Language } from "@/contexts/LanguageContext";

const CODES = LANGUAGES.map((l) => l.code) as Language[];

/**
 * Makes the URL path prefix authoritative for language on the marketing site:
 * /en, /ar, /fr, /ru switch the app to that language (so each language has a
 * distinct, crawlable URL for SEO). Mount once inside <BrowserRouter>.
 *
 * Deliberately non-regressive: on the apex "/" (no language prefix) it does
 * nothing, leaving the existing geo-detection + localStorage behaviour intact.
 * Only an explicit language URL overrides it.
 */
export function LanguageUrlSync(): null {
  const { pathname } = useLocation();
  const { language, setLanguage } = useLanguage();

  const seg = pathname.split("/")[1] as Language | undefined;
  const urlLang = seg && CODES.includes(seg) ? seg : null;

  useEffect(() => {
    if (urlLang && urlLang !== language) setLanguage(urlLang);
  }, [urlLang, language, setLanguage]);

  return null;
}

export default LanguageUrlSync;
