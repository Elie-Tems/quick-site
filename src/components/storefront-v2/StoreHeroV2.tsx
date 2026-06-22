import { ShoppingBag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StoreHeroV2Props {
  businessName: string;
  tagline?: string | null;
  heroTitle?: string | null;
  heroBadge?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  ctaText?: string | null;
  onScrollToProducts?: () => void;
}

const StoreHeroV2 = ({
  businessName,
  tagline,
  heroTitle,
  heroBadge,
  logoUrl,
  heroImageUrl,
  ctaText,
  onScrollToProducts,
}: StoreHeroV2Props) => {
  const displayTitle = heroTitle || businessName;
  const displayTagline = tagline;
  const displayCta = ctaText || "גלה את המוצרים";

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/30">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Hero image as background */}
      {heroImageUrl && (
        <div className="absolute inset-0 opacity-20">
          <img
            src={heroImageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="container relative z-10 px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          {heroBadge && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20 animate-in fade-in slide-in-from-top-4 duration-700">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">{heroBadge}</span>
            </div>
          )}

          {/* Logo */}
          {logoUrl && (
            <div className="flex justify-center animate-in fade-in slide-in-from-top-6 duration-700 delay-100">
              <img
                src={logoUrl}
                alt={businessName}
                className="h-20 md:h-24 w-auto object-contain drop-shadow-2xl"
              />
            </div>
          )}

          {/* Title */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-foreground leading-tight animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            {displayTitle}
          </h1>

          {/* Tagline */}
          {displayTagline && (
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
              {displayTagline}
            </p>
          )}

          {/* CTA Button */}
          <div className="pt-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
            <Button
              size="lg"
              onClick={onScrollToProducts}
              className="group relative overflow-hidden px-8 py-6 text-lg font-semibold rounded-full shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-105"
            >
              <span className="relative z-10 flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 transition-transform group-hover:rotate-12" />
                {displayCta}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
          </div>

          {/* Scroll indicator */}
          <div className="pt-12 animate-in fade-in duration-1000 delay-700">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <span className="text-xs uppercase tracking-widest">גלול למטה</span>
              <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
                <div className="w-1.5 h-3 bg-muted-foreground/50 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StoreHeroV2;
