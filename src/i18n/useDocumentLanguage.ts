import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { langMeta } from "./config";

/**
 * Keeps <html lang> and <html dir> in sync with the active language, so RTL
 * languages (he, ar) and LTR languages (en, fr, ru) render correctly. Mount
 * once near the app root. Behavior-neutral for Hebrew (the current default).
 */
export function useDocumentLanguage(): void {
  const { i18n } = useTranslation();

  useEffect(() => {
    const meta = langMeta(i18n.language);
    const root = document.documentElement;
    root.lang = meta.htmlLang;
    root.dir = meta.dir;
  }, [i18n.language]);
}
