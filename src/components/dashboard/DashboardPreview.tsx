import { useState, useMemo } from "react";
import { Monitor, Smartphone, Tablet, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import StoreHeader from "@/components/storefront/StoreHeader";
import StoreHero from "@/components/storefront/StoreHero";
import StoreProducts from "@/components/storefront/StoreProducts";
import StoreFooter from "@/components/storefront/StoreFooter";
import type { BusinessSettings } from "./DashboardSettings";
import { Product } from "./DashboardProducts";
import { Banner } from "./DashboardBanners";

interface DashboardPreviewProps {
  settings: BusinessSettings;
  products: Product[];
  banners: Banner[];
  categories?: { id: string; name: string }[];
  /** כשמועבר, מובייל/טאבלט יוצגו ב-iframe עם viewport אמיתי (החנות תראה נכון) */
  storeSlug?: string;
}

type DeviceType = "desktop" | "tablet" | "mobile";

const deviceSizes: Record<DeviceType, { width: string; maxWidth: string; label: string }> = {
  desktop: { width: "100%", maxWidth: "1400px", label: "מחשב" },
  tablet: { width: "768px", maxWidth: "100%", label: "טאבלט" },
  mobile: { width: "375px", maxWidth: "100%", label: "נייד" },
};

// Helper to convert hex to HSL for CSS variables
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 250, s: 60, l: 45 };
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const DashboardPreview = ({ settings, products, banners, categories, storeSlug }: DashboardPreviewProps) => {
  const [device, setDevice] = useState<DeviceType>("tablet");
  const [refreshKey, setRefreshKey] = useState(0);

  const useIframe = (device === "mobile" || device === "tablet") && Boolean(storeSlug);
  const iframeSrc = typeof window !== "undefined" && storeSlug ? `${window.location.origin}/store/${storeSlug}?preview=true` : "";

  // Generate dynamic CSS variables for the brand color
  const brandStyles = useMemo(() => {
    const hsl = hexToHSL(settings.primaryColor || '#7c3aed');
    return {
      '--preview-primary': `${hsl.h} ${hsl.s}% ${hsl.l}%`,
      '--preview-primary-foreground': hsl.l > 50 ? '0 0% 0%' : '0 0% 100%',
    } as React.CSSProperties;
  }, [settings.primaryColor]);

  // Convert products to storefront format
  const storefrontProducts = products
    .filter(p => p.active)
    .map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      imageUrl: p.imageUrl,
    }));

  // Create business object for storefront components, תוך כיבוד הסוויצ'ים מההגדרות
  const business = {
    name: settings.name,
    // בתצוגה מקדימה, כשמכבים את הסלוגן נשדר "" כדי לחקות את האתר החי (שמשתמש ב-"" כסימן הסתרה)
    tagline: settings.useTagline === false ? "" : settings.tagline,
    logo_url: settings.logoUrl,
    hero_image_url: settings.heroImageUrl,
    primary_color: settings.primaryColor,
    brand_style: settings.brandStyle,
    promo_text: settings.usePromoText === false ? null : settings.promoText,
    hero_title: settings.useHeroTitle === false ? "" : settings.heroTitle,
    hero_badge: settings.useHeroBadge === false ? null : settings.heroBadge,
    cta_text: settings.useCtaText === false ? null : settings.ctaText,
    phone: settings.phone,
    email: settings.email,
    whatsapp_enabled: !!settings.phone,
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">תצוגה מקדימה</h1>
          <p className="text-sm text-muted-foreground">
            צפה בחנות שלך כפי שהלקוחות יראו אותה
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Device Switcher */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setDevice("desktop")}
              className={cn(
                "p-2 rounded-md transition-colors",
                device === "desktop" 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="מחשב"
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDevice("tablet")}
              className={cn(
                "p-2 rounded-md transition-colors",
                device === "tablet" 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="טאבלט"
            >
              <Tablet className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDevice("mobile")}
              className={cn(
                "p-2 rounded-md transition-colors",
                device === "mobile" 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="נייד"
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            רענן
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-2"
          >
            <a
              href={storeSlug ? `/store/${storeSlug}` : "/store"}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              פתח בחלון חדש
            </a>
          </Button>
        </div>
      </div>

      {/* Preview Container */}
      <div className="flex-1 bg-muted/50 rounded-xl border border-border overflow-hidden">
        <div className="h-full flex items-start justify-center p-4 overflow-auto">
          {useIframe ? (
            <div
              key={`iframe-${device}-${refreshKey}`}
              className={cn(
                "rounded-lg shadow-2xl overflow-hidden transition-all duration-300 bg-background flex-shrink-0",
                device === "mobile" && "border-8 border-foreground/10 rounded-[2rem]",
                device === "tablet" && "border-4 border-foreground/10 rounded-xl"
              )}
              style={{
                width: deviceSizes[device].width,
                maxWidth: deviceSizes[device].maxWidth,
                height: "80vh",
                minHeight: "600px",
              }}
            >
              <iframe
                title={`תצוגה מקדימה - ${deviceSizes[device].label}`}
                src={iframeSrc}
                className="w-full h-full border-0 block"
                style={{ minHeight: "600px" }}
              />
            </div>
          ) : (
            <div
              key={refreshKey}
              className={cn(
                "bg-background rounded-lg shadow-2xl overflow-hidden transition-all duration-300 preview-branded",
                device === "mobile" && "border-8 border-foreground/10 rounded-[2rem]",
                device === "tablet" && "border-4 border-foreground/10 rounded-xl"
              )}
              style={{
                width: deviceSizes[device].width,
                maxWidth: deviceSizes[device].maxWidth,
                height: device === "desktop" ? "auto" : "80vh",
                minHeight: "600px",
                ...brandStyles,
              }}
            >
              <div className={cn("overflow-auto", device !== "desktop" && "h-full")}>
                <StoreHeader
                  businessName={business.name}
                  logoUrl={business.logo_url}
                  showMarqueeBar={settings.useMarqueeBar !== false}
                  promoText={business.promo_text || ""}
                  primaryColor={settings.primaryColor}
                  businessCategory={settings.businessCategory}
                  storeCategories={categories?.map(c => ({ id: c.id, name: c.name })) || []}
                  selectedCategoryId={null}
                  onSelectCategory={() => {}}
                />
                <StoreHero
                  businessName={business.name}
                  tagline={business.tagline}
                  heroImageUrl={business.hero_image_url}
                  heroTitle={business.hero_title}
                  heroBadge={business.hero_badge}
                  ctaText={business.cta_text}
                  heroBenefits={settings.useHeroBenefits === false ? undefined : settings.heroBenefits ?? undefined}
                  primaryColor={settings.primaryColor}
                  businessCategory={settings.businessCategory}
                />
                <div id="products" className="py-8">
                  <StoreProducts
                    products={storefrontProducts}
                    onAddToCart={() => {}}
                  />
                </div>
                <StoreFooter
                  businessName={business.name}
                  phone={business.phone}
                  email={business.email}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground">
          💡 <strong>טיפ:</strong> שינויים שתבצע בהגדרות, מוצרים ובאנרים יופיעו כאן באופן מיידי
        </p>
      </div>
    </div>
  );
};

export default DashboardPreview;
