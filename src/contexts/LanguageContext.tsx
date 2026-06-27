import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
// Hebrew is the default + most common language. Bundle it statically so the very
// first paint is already Hebrew - otherwise t() returns raw keys until the async
// translation import resolves, which looked like a flash of "another language".
import heTranslations from '@/lib/translations/he';

export type Language = 'he' | 'en' | 'ar' | 'ru' | 'fr';

export interface LanguageConfig {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  dir: 'rtl' | 'ltr';
}

export const LANGUAGES: LanguageConfig[] = [
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱', dir: 'rtl' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
  currentLanguage: LanguageConfig;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'Siango-language';

// Map a visitor's country (ISO-3166 alpha-2, from Cloudflare) to one of our 5
// supported languages. Israel -> Hebrew; Arabic / Russian / French speaking
// countries -> their language; anything else (no matching language) -> English.
const COUNTRY_LANG: Record<string, Language> = {
  IL: 'he',
  // Arabic-speaking (Arab League)
  SA: 'ar', AE: 'ar', EG: 'ar', JO: 'ar', LB: 'ar', IQ: 'ar', SY: 'ar', PS: 'ar',
  KW: 'ar', QA: 'ar', BH: 'ar', OM: 'ar', YE: 'ar', DZ: 'ar', MA: 'ar', TN: 'ar',
  LY: 'ar', SD: 'ar', MR: 'ar', SO: 'ar', DJ: 'ar', KM: 'ar',
  // Russian-speaking
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru', TJ: 'ru', TM: 'ru', UZ: 'ru', AM: 'ru',
  AZ: 'ru', MD: 'ru',
  // French-speaking (France, Monaco + clearly Francophone countries)
  FR: 'fr', MC: 'fr', SN: 'fr', CI: 'fr', CM: 'fr', ML: 'fr', BF: 'fr', NE: 'fr',
  TG: 'fr', BJ: 'fr', GA: 'fr', CG: 'fr', CD: 'fr', MG: 'fr', GN: 'fr',
};

/** Country -> supported language. Unknown / unmapped country -> English. */
const languageForCountry = (country?: string): Language =>
  (country && COUNTRY_LANG[country]) || 'en';

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  // Did the visitor already pick a language? Captured once, before any effect
  // writes to storage - so geo-detection never overrides an explicit choice.
  const hadExplicitChoice = useRef(
    typeof window !== 'undefined' &&
      ['he', 'en', 'ar', 'ru', 'fr'].includes(localStorage.getItem(STORAGE_KEY) || ''),
  );

  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && ['he', 'en', 'ar', 'ru', 'fr'].includes(saved)) {
        return saved as Language;
      }
    }
    return 'he';
  });

  const [translations, setTranslations] = useState<Record<string, string>>(
    language === 'he' ? (heTranslations as Record<string, string>) : {}
  );

  const currentLanguage = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  // Geo default: Hebrew for Israel (the instant initial state), English for
  // visitors abroad - unless they already chose a language. Uses Cloudflare's
  // free /cdn-cgi/trace (no API/function needed; siango.app is behind CF).
  const geoChecked = useRef(false);
  useEffect(() => {
    if (geoChecked.current || hadExplicitChoice.current) return;
    geoChecked.current = true;
    // Only on the platform/marketing host - never on a merchant storefront
    // (a tenant subdomain or custom domain), so we don't flip a Hebrew store to
    // English/LTR for a visitor from abroad.
    const host = window.location.hostname;
    const isPlatformHost =
      host === 'siango.app' || host === 'www.siango.app' || host === 'localhost' || host.endsWith('.pages.dev');
    if (!isPlatformHost) return;
    let cancelled = false;
    fetch('/cdn-cgi/trace')
      .then((r) => r.text())
      .then((txt) => {
        const m = txt.match(/^loc=([A-Z]{2})/m);
        const country = m?.[1];
        if (!cancelled && country) {
          // Israel -> Hebrew (already the default), France -> French, Russia ->
          // Russian, Arab countries -> Arabic, anything else -> English.
          setLanguageState(languageForCountry(country));
        }
      })
      .catch(() => {
        /* detection is best-effort; stay on the Hebrew default */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Dynamically import translations
    import(`@/lib/translations/${language}.ts`)
      .then((module) => {
        setTranslations(module.default);
      })
      .catch(() => {
        console.warn(`Translation file for ${language} not found, falling back to Hebrew`);
        import('@/lib/translations/he.ts').then((module) => {
          setTranslations(module.default);
        });
      });
  }, [language]);

  useEffect(() => {
    // Update document direction and lang
    document.documentElement.dir = currentLanguage.dir;
    document.documentElement.lang = language;
    localStorage.setItem(STORAGE_KEY, language);
  }, [language, currentLanguage.dir]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[key] || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        dir: currentLanguage.dir,
        currentLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
