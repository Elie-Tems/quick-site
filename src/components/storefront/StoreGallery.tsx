import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface GalleryImage {
  url: string;
  caption?: string;
}

const StoreGallery = ({
  images,
  accent,
  heading,
}: {
  images: GalleryImage[] | null | undefined;
  accent: string;
  heading?: string;
}) => {
  const { t } = useLanguage();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  if (!images?.length) return null;

  const lightboxImg = lightboxIndex !== null ? images[lightboxIndex] : null;
  const total = images.length;

  const prev = useCallback(() => setLightboxIndex(i => i !== null ? (i - 1 + total) % total : null), [total]);
  const next = useCallback(() => setLightboxIndex(i => i !== null ? (i + 1) % total : null), [total]);
  const close = () => setLightboxIndex(null);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") next();
      if (e.key === "ArrowRight") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, next, prev]);

  return (
    <section className="py-14 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="inline-block h-1 w-12 rounded-full mb-4" style={{ background: accent }} />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
            {heading || t("store.gallery.heading")}
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setLightboxIndex(i)}
              className="group relative aspect-square rounded-xl overflow-hidden border bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{ borderColor: `${accent}33` }}
            >
              <img
                src={img.url}
                alt={img.caption || `${t("store.gallery.image_alt")} ${i + 1}`}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {img.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {img.caption}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {lightboxImg && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          onClick={close}
        >
          {/* Close */}
          <button
            onClick={close}
            aria-label={t("store.gallery.close_label")}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Prev */}
          {total > 1 && (
            <button
              onClick={e => { e.stopPropagation(); prev(); }}
              aria-label="תמונה קודמת"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Next */}
          {total > 1 && (
            <button
              onClick={e => { e.stopPropagation(); next(); }}
              aria-label="תמונה הבאה"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Image */}
          <img
            src={lightboxImg.url}
            alt={lightboxImg.caption || t("store.gallery.image_alt")}
            className="max-w-full max-h-[85vh] rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />

          {/* Caption */}
          {lightboxImg.caption && (
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/80 text-sm text-center px-4">
              {lightboxImg.caption}
            </p>
          )}

          {/* Counter */}
          {total > 1 && (
            <span className="absolute bottom-6 left-4 text-white/50 text-xs">
              {(lightboxIndex ?? 0) + 1} / {total}
            </span>
          )}
        </div>
      )}
    </section>
  );
};

export default StoreGallery;
