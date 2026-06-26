import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { BusinessCategory, getCategoryConfig } from "@/lib/categoryConfig";
import type { StoreTemplate } from "@/lib/storeTemplates";

interface StoreHeroProps {
  businessName: string;
  tagline?: string;
  ctaText?: string;
  heroTitle?: string;
  heroBadge?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  heroBenefits?: string[] | null;
  primaryColor?: string;
  businessCategory?: BusinessCategory;
  heroStyle?: StoreTemplate['heroStyle'];
  onCtaClick?: () => void;
}

const DEFAULT_STRIP_BENEFITS: string[] = [];

const StoreHero = ({
  businessName,
  tagline,
  ctaText,
  heroTitle,
  heroBadge,
  heroImageUrl,
  heroBenefits,
  primaryColor,
  businessCategory,
  heroStyle,
  onCtaClick,
}: StoreHeroProps) => {
  const categoryConfig = getCategoryConfig(businessCategory);

  const displayTagline =
    tagline === "" ? undefined : tagline || categoryConfig.tagline;
  const displayCtaText =
    ctaText === "" ? undefined : ctaText || categoryConfig.ctaText;
  const displayHeroBadge =
    (heroBadge?.trim()?.length ?? 0) > 0 ? heroBadge!.trim() : undefined;
  const displayTitle =
    heroTitle === "" ? undefined : heroTitle || businessName;

  const stripBenefits =
    heroBenefits && heroBenefits.filter(Boolean).length > 0
      ? heroBenefits.filter(Boolean)
      : DEFAULT_STRIP_BENEFITS;

  const [imageLoadError, setImageLoadError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  useEffect(() => {
    setImageLoadError(false);
    setUseFallback(false);
    setImageLoaded(false);
  }, [heroImageUrl]);

  const FALLBACK_MAP: Record<string, string> = {
    food: "/hero-fallback/food.jpg",
    fashion: "/hero-fallback/fashion.jpg",
    home: "/hero-fallback/home.jpg",
  };
  const FOOD_CATS = new Set(["bakery", "restaurant", "cafe", "grocery", "wine_alcohol"]);
  const FASHION_CATS = new Set(["clothing", "jewelry", "beauty", "baby", "gifts", "handmade", "art", "toys"]);
  const HOME_CATS = new Set(["home", "furniture", "appliances", "flowers", "books", "pharmacy", "pets"]);
  const getFallbackImage = (cat?: string) => {
    if (!cat) return FALLBACK_MAP.food;
    if (FOOD_CATS.has(cat)) return FALLBACK_MAP.food;
    if (FASHION_CATS.has(cat)) return FALLBACK_MAP.fashion;
    if (HOME_CATS.has(cat)) return FALLBACK_MAP.home;
    return "/hero-fallback/general.jpg";
  };

  const hasCustomImage =
    typeof heroImageUrl === "string" && heroImageUrl.trim().length > 0;
  const heroImage = useFallback
    ? getFallbackImage(businessCategory)
    : hasCustomImage
    ? heroImageUrl!.trim()
    : categoryConfig.heroImage;
  const hasValidImage = !!heroImage && !imageLoadError;
  const showGradientUntilLoaded = hasValidImage && !imageLoaded;

  const scrollToProducts = () => {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
    onCtaClick?.();
  };

  const benefitsStrip = stripBenefits.length > 0 && (
    <div
      className="border-t border-foreground/10 py-3"
      style={{ backgroundColor: primaryColor || "hsl(var(--primary))" }}
    >
      <div className="container px-4 md:px-6">
        <div className="flex items-center justify-center gap-6 md:gap-10 overflow-x-auto scrollbar-hide flex-wrap">
          {stripBenefits.map((text, i) => (
            <span key={i} className="flex items-center gap-2 text-[10px] font-bold tracking-[0.15em] uppercase text-white/90 whitespace-nowrap">
              {i > 0 && <span className="hidden sm:block w-px h-3 bg-white/30" />}
              {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const imageEl = hasValidImage ? (
    <img
      src={heroImage!}
      alt=""
      className="absolute inset-0 w-full h-full object-cover object-center"
      decoding="async"
      fetchPriority="high"
      onLoad={() => setImageLoaded(true)}
      onError={() => {
        if (!useFallback) { setUseFallback(true); setImageLoaded(false); }
        else { setImageLoadError(true); }
      }}
    />
  ) : null;

  // ── Split layout: colored text panel | image ──
  if (heroStyle?.layout === "split") {
    return (
      <section className="relative w-full" dir="rtl">
        <div className="relative min-h-[55vh] sm:min-h-[65vh] md:min-h-[75vh] grid grid-cols-1 md:grid-cols-2">
          {/* Text panel */}
          <div
            className="flex items-center px-8 md:px-14 lg:px-20 py-14 md:py-0 order-2 md:order-1"
            style={{ backgroundColor: primaryColor || "hsl(var(--primary))" }}
          >
            <div className="max-w-sm">
              {displayHeroBadge && (
                <span className="inline-block mb-4 text-[10px] font-bold tracking-[0.25em] uppercase text-white/80 border border-white/30 px-3 py-1">
                  {displayHeroBadge}
                </span>
              )}
              {displayTitle && (
                <h1 className="text-4xl sm:text-5xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-[-0.02em] mb-4">
                  {displayTitle}
                </h1>
              )}
              {displayTagline && (
                <p className="text-sm md:text-base text-white/75 mb-7 leading-relaxed">
                  {displayTagline}
                </p>
              )}
              {displayCtaText && (
                <button
                  onClick={scrollToProducts}
                  className="group inline-flex items-center gap-3 bg-white px-7 py-3.5 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-white/90 transition-colors"
                  style={{ color: primaryColor || undefined }}
                >
                  {displayCtaText}
                  <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>
          {/* Image panel */}
          <div className="relative min-h-[45vw] md:min-h-full order-1 md:order-2 overflow-hidden">
            {(!hasValidImage || showGradientUntilLoaded) && (
              <div className="absolute inset-0" style={{ background: primaryColor ? `${primaryColor}88` : "hsl(var(--primary) / 0.5)" }} />
            )}
            {imageEl && <img
              src={heroImage!}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center"
              decoding="async"
              fetchPriority="high"
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                if (!useFallback) { setUseFallback(true); setImageLoaded(false); }
                else { setImageLoadError(true); }
              }}
            />}
          </div>
        </div>
        {benefitsStrip}
      </section>
    );
  }

  // ── Centered layout: image bg, text centered ──
  if (heroStyle?.layout === "centered") {
    return (
      <section className="relative w-full" dir="rtl">
        <div className="relative h-[55vh] min-h-[280px] sm:h-[65vh] md:h-[75vh] lg:h-[85vh] overflow-hidden bg-background">
          {(!hasValidImage || showGradientUntilLoaded) && (
            <div className="absolute inset-0" style={{ background: primaryColor ? `linear-gradient(160deg, ${primaryColor}, ${primaryColor}bb)` : "linear-gradient(160deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))" }} />
          )}
          {hasValidImage && (
            <img
              src={heroImage!}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center"
              decoding="async"
              fetchPriority="high"
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                if (!useFallback) { setUseFallback(true); setImageLoaded(false); }
                else { setImageLoadError(true); }
              }}
            />
          )}
          {hasValidImage && imageLoaded && (
            <div className="absolute inset-0 bg-black/50" />
          )}
          <div className="absolute inset-0 flex items-center justify-center text-center">
            <div className="container px-4 md:px-6">
              <div className="max-w-2xl mx-auto">
                {displayHeroBadge && (
                  <span className="inline-block mb-5 text-[10px] font-bold tracking-[0.25em] uppercase text-white/90 border border-white/30 px-4 py-1.5">
                    {displayHeroBadge}
                  </span>
                )}
                {displayTitle && (
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-[-0.02em] mb-5">
                    {displayTitle}
                  </h1>
                )}
                {displayTagline && (
                  <p className="text-sm md:text-lg text-white/75 mb-8 max-w-lg mx-auto leading-relaxed">
                    {displayTagline}
                  </p>
                )}
                {displayCtaText && (
                  <button
                    onClick={scrollToProducts}
                    className="group inline-flex items-center gap-3 bg-white px-8 py-4 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-white/90 transition-colors rounded-full"
                    style={{ color: primaryColor || undefined }}
                  >
                    {displayCtaText}
                    <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        {benefitsStrip}
      </section>
    );
  }

  // ── Default: full-image editorial (bottom-left text) ──
  return (
    <section className="relative w-full" dir="rtl">
      <div className="relative h-[55vh] min-h-[280px] sm:h-[65vh] md:h-[75vh] lg:h-[88vh] overflow-hidden bg-background">
        {(!hasValidImage || showGradientUntilLoaded) && (
          <div
            className="absolute inset-0"
            style={{
              background: primaryColor
                ? `linear-gradient(160deg, ${primaryColor}, ${primaryColor}bb)`
                : "linear-gradient(160deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))",
            }}
          />
        )}

        {hasValidImage && (
          <img
            src={heroImage!}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
            decoding="async"
            fetchPriority="high"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              if (!useFallback) {
                setUseFallback(true);
                setImageLoaded(false);
              } else {
                setImageLoadError(true);
              }
            }}
          />
        )}

        {hasValidImage && imageLoaded && (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />
          </>
        )}

        <div className="absolute inset-0 flex items-end">
          <div className="container px-4 md:px-6 pb-10 md:pb-14 lg:pb-16">
            <div className="max-w-xl">
              {displayHeroBadge && (
                <span className="inline-block mb-4 text-[10px] font-bold tracking-[0.25em] uppercase text-white/90 border border-white/30 px-3 py-1">
                  {displayHeroBadge}
                </span>
              )}
              {displayTitle && (
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-[-0.02em] mb-4">
                  {displayTitle}
                </h1>
              )}
              {displayTagline && (
                <p className="text-sm md:text-base text-white/75 mb-7 max-w-sm leading-relaxed">
                  {displayTagline}
                </p>
              )}
              {displayCtaText && (
                <button
                  onClick={scrollToProducts}
                  className="group inline-flex items-center gap-3 bg-white text-foreground px-7 py-3.5 text-[11px] font-bold tracking-[0.2em] uppercase hover:bg-white/90 transition-colors"
                  style={{ color: primaryColor || undefined }}
                >
                  {displayCtaText}
                  <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="absolute top-5 left-5 hidden md:flex flex-col items-center gap-1 opacity-40">
          <div className="w-px h-8 bg-white" />
          <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-white rotate-90 origin-center translate-y-4">
            {businessName}
          </span>
        </div>
      </div>

      {benefitsStrip}
    </section>
  );
};

export default StoreHero;