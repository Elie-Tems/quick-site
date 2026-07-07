/**
 * i18n foundation for the Siango marketing site (Phase 1 of docs/seo/i18n-seo-plan.md).
 *
 * Languages: Hebrew (default/base), English, Arabic, French, Russian.
 * he + ar are RTL; en, fr, ru are LTR.
 *
 * The authoritative language is the URL prefix (/en/, /ar/, ...) - wired in a
 * later step. This module only sets up i18next + resources + the language
 * metadata (name/dir) that the router, <html> controller, and switcher consume.
 *
 * NOTE: importing this module initializes i18next with the default language
 * only. No component uses useTranslation yet, so this is behavior-neutral until
 * the marketing pages are migrated to translation keys.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import he from "./locales/he.json";
import en from "./locales/en.json";
import ar from "./locales/ar.json";
import fr from "./locales/fr.json";
import ru from "./locales/ru.json";

export type LangCode = "he" | "en" | "ar" | "fr" | "ru";

export interface LanguageMeta {
  code: LangCode;
  /** Native name, shown in the language switcher. */
  name: string;
  dir: "rtl" | "ltr";
  /** BCP-47 tag for <html lang> and hreflang. */
  htmlLang: string;
}

export const DEFAULT_LANG: LangCode = "he";

// Order here is the display order in the language switcher.
export const LANGUAGES: LanguageMeta[] = [
  { code: "he", name: "עברית", dir: "rtl", htmlLang: "he" },
  { code: "en", name: "English", dir: "ltr", htmlLang: "en" },
  { code: "ar", name: "العربية", dir: "rtl", htmlLang: "ar" },
  { code: "fr", name: "Français", dir: "ltr", htmlLang: "fr" },
  { code: "ru", name: "Русский", dir: "ltr", htmlLang: "ru" },
];

export const SUPPORTED_LANGS: LangCode[] = LANGUAGES.map((l) => l.code);

export function isSupportedLang(code: string): code is LangCode {
  return (SUPPORTED_LANGS as string[]).includes(code);
}

export function langMeta(code: string): LanguageMeta {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

export function isRTL(code: string): boolean {
  return langMeta(code).dir === "rtl";
}

i18n.use(initReactI18next).init({
  resources: {
    he: { translation: he },
    en: { translation: en },
    ar: { translation: ar },
    fr: { translation: fr },
    ru: { translation: ru },
  },
  lng: DEFAULT_LANG,
  fallbackLng: DEFAULT_LANG, // missing keys fall back to Hebrew until translated
  supportedLngs: SUPPORTED_LANGS,
  interpolation: { escapeValue: false }, // React already escapes
  returnEmptyString: false, // treat "" as missing so fallback applies
});

export default i18n;
