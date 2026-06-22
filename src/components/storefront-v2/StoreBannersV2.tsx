import { useState, useEffect, useCallback } from "react";
import { ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { useAccessibility } from "@/contexts/AccessibilityContext";

interface Banner {
  id: string;
  imageUrl: string;
  title?: string;
  text?: string;
  ctaText?: string;
  ctaUrl?: string;
}

interface StoreBannersV2Props {
  banners: Banner[];
}

const StoreBannersV2 = ({ banners }: StoreBannersV2Props) => {
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
    <section dir="rtl" className="py-8 md:py-12">
      <div className="container px-4 md:px-6">
        <div className="relative overflow-hidden rounded-3xl shadow-2xl">
          {/* Slides */}
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(${currentIndex * 100}%)` }}
          >
            {activeBanners.map((banner) => (
              <div
                key={banner.id}
                className="w-full flex-shrink-0 relative aspect-[16/9] md:aspect-[21/9]"
              >
                {/* Image with overlay */}
                <div className="absolute inset-0">
                  <img
                    src={banner.imageUrl}
                    alt={banner.title || banner.text || ""}
                    className="w-full h-full object-cover"
                  />
                  {/* Modern gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-transparent" />
                </div>

                {/* Content with modern design */}
                {(banner.title || banner.text || banner.ctaText) && (
                  <div className="absolute inset-0 flex items-center justify-end">
                    <div className="p-8 md:p-12 lg:p-16 max-w-2xl text-right space-y-6 animate-in fade-in slide-in-from-right-4 duration-700">
                      {/* Decorative element */}
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                        <Sparkles className="h-4 w-4 text-white" />
                        <span className="text-xs font-medium text-white tracking-wider">מבצע מיוחד</span>
                      </div>

                      {banner.title && (
                        <h3 className="text-3xl md:text-4xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
                          {banner.title}
                        </h3>
                      )}
                      
                      {banner.text && (
                        <p className="text-white/90 text-base md:text-lg leading-relaxed max-w-lg">
                          {banner.text}
                        </p>
                      )}
                      
                      {banner.ctaText && banner.ctaUrl && (
                        <a
                          href={banner.ctaUrl}
                          className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-foreground font-bold text-sm hover:bg-white/90 hover:scale-105 transition-all duration-300 shadow-xl"
                        >
                          {banner.ctaText}
                          <ChevronLeft className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Navigation arrows - modern rounded style */}
          {activeBanners.length > 1 && (
            <>
              <button
                onClick={goToNext}
                aria-label="הבאנר הבא"
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transition-all duration-300"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                onClick={goToPrev}
                aria-label="הבאנר הקודם"
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 hover:scale-110 transition-all duration-300"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Modern dots indicator */}
          {activeBanners.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {activeBanners.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  aria-label={`עבור לבאנר ${index + 1}`}
                  className={`rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? "w-8 h-2 bg-white"
                      : "w-2 h-2 bg-white/40 hover:bg-white/60"
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

export default StoreBannersV2;
