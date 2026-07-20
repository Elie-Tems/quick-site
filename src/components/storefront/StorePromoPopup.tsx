import { useEffect, useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface StorePromoPopupProps {
  campaignId: string;
  title?: string | null;
  text?: string | null;
  ctaText?: string | null;
  ctaUrl?: string | null;
  couponCode?: string | null;
  accent?: string; // store primary color
}

// Promotional popup shown once per visitor session (per campaign), after a short
// delay. Driven by an active campaign with popup_enabled. Purely client-side.
const StorePromoPopup = ({ campaignId, title, text, ctaText, ctaUrl, couponCode, accent = "#0E9F6E" }: StorePromoPopupProps) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();
  const storageKey = `siango-promo-${campaignId}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(storageKey)) return;
    const t = setTimeout(() => setOpen(true), 2500);
    return () => clearTimeout(t);
  }, [storageKey]);

  const close = () => {
    setOpen(false);
    try { sessionStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
  };

  const copyCode = () => {
    if (!couponCode) return;
    navigator.clipboard?.writeText(couponCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (!open) return null;

  return (
    <div dir="rtl" className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="h-2" style={{ background: accent }} />
        <button onClick={close} aria-label={t("store.promopopup.close")} className="absolute top-3 left-3 text-gray-400 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
        <div className="p-6 text-center">
          {title && <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>}
          {text && <p className="text-sm text-gray-600 leading-relaxed mb-4 whitespace-pre-line">{text}</p>}

          {couponCode && (
            <button onClick={copyCode}
              className="w-full mb-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 py-3 font-mono text-lg font-bold tracking-wider transition-colors"
              style={{ borderColor: accent, color: accent }}>
              {couponCode}
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
          {couponCode && <p className="text-[11px] text-gray-400 -mt-2 mb-4">{copied ? t("store.promopopup.codeCopied") : t("store.promopopup.clickToCopy")}</p>}

          {ctaText && (
            <a href={ctaUrl || "#"} onClick={close}
              className="block w-full rounded-xl py-3 font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: accent }}>
              {ctaText}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default StorePromoPopup;
