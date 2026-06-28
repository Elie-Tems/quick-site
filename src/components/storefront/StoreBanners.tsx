import { useState, useEffect, useCallback } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useAccessibility } from "@/contexts/AccessibilityContext";

interface Banner {
  id: string;
  imageUrl: string;
  title?: string;
  text?: string;
  ctaText?: string;
  ctaUrl?: string;
}

interface StoreBannersProps {
  banners: Banner[];
}

const StoreBanners = ({ banners }: StoreBannersProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { settings } = useAccessibility();
  const activeBanners = banners.slice(0, 5);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % activeBanners.length);
  }, [activeBanners.length]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + activeBanners.length) % activeBanners.length);
  }, [activeBanners.length]);

  useEffect(() => {
    if (activeBanners.length <= 1 || settings.stopAnimations) return;
    const interval = setInterval(goToNext, 5000);
    return () => clearInterval(interval);
  }, [activeBanners.length, settings.stopAnimations, goToNext]);

  if (activeBanners.length === 0) return null;

  return (
    <section dir="rtl" className="py-6 md:py-10 bg-background">
      <div className="container px-4 md:px-6">
        <div className="relative overflow-hidden">

          {/* ── Slides ── */}
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(${currentIndex * 100}%)` }}
          >
            {activeBanners.map((banner) => (
              <div
                key={banner.id}
                className="w-full flex-shrink-0 relative aspect-[16/9] md:aspect-[21/9]"
              >
                <img
                  src={banner.imageUrl}
                  alt={banner.title || banner.text || ""}
                  className="w-full h-full object-cover"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-l from-black/65 via-black/30 to-transparent" />

                {/* Content - bottom-right aligned, editorial */}
                {(banner.title || banner.text || banner.ctaText) && (
                  <div className="absolute inset-0 flex items-end justify-end">
                    <div className="p-6 md:p-10 lg:p-14 max-w-md text-right">
                      {banner.title && (
                        <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-[1.05] tracking-[-0.02em] mb-3">
                          {banner.title}
                        </h3>
                      )}
                      {banner.text && (
                        <p className="text-white/75 text-sm md:text-base mb-6 line-clamp-2 leading-relaxed">
                          {banner.text}
                        </p>
                      )}
                      {banner.ctaText && banner.ctaUrl && /^https?:\/\//i.test(banner.ctaUrl) && (
                        <a
                          href={banner.ctaUrl}
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-white text-foreground px-6 py-3 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-white/90 transition-colors"
                        >
                          {banner.ctaText}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Navigation arrows - flat, editorial ── */}
          {activeBanners.length > 1 && (
            <>
              <button
                onClick={goToNext}
                aria-label="הבאנר הבא"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={goToPrev}
                aria-label="הבאנר הקודם"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-background/80 backdrop-blur-sm flex items-center justify-center text-foreground hover:bg-background transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          )}

          {/* ── Dots - thin lines, editorial ── */}
          {activeBanners.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
              {activeBanners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`עבור לבאנר ${index + 1}`}
                  className={`h-px transition-all duration-300 focus:outline-none ${
                    index === currentIndex
                      ? "w-8 bg-white"
                      : "w-4 bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default StoreBanners;