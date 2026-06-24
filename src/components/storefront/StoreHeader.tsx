import { ShoppingBag, Menu, X, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import type { BusinessCategory } from "@/lib/categoryConfig";

export interface StoreCategoryItem {
  id: string;
  name: string;
}

interface StoreHeaderProps {
  businessName: string;
  logoUrl?: string;
  phone?: string;
  whatsappEnabled?: boolean;
  showMarqueeBar?: boolean;
  cartItemsCount?: number;
  favoritesCount?: number;
  promoText?: string;
  primaryColor?: string;
  businessCategory?: BusinessCategory;
  storeCategories?: StoreCategoryItem[];
  selectedCategoryId?: string | null;
  onSelectCategory?: (categoryId: string | null) => void;
  aboutPath?: string;
  onScrollToProducts?: () => void;
  onNavigateToFavorites?: () => void;
  onNavigateToCart?: () => void;
  onNavigateHome?: () => void;
}

const StoreHeader = ({
  businessName,
  logoUrl,
  showMarqueeBar = true,
  cartItemsCount = 0,
  favoritesCount = 0,
  promoText,
  primaryColor,
  storeCategories = [],
  selectedCategoryId = null,
  onSelectCategory,
  onScrollToProducts,
  onNavigateToFavorites,
  onNavigateToCart,
  onNavigateHome,
  aboutPath,
}: StoreHeaderProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToProducts = () => {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
    onScrollToProducts?.();
  };

  const categories =
    storeCategories.length > 0 && onSelectCategory
      ? [
          { id: null as string | null, name: "הכל", action: () => { onSelectCategory(null); scrollToProducts(); } },
          ...storeCategories.map((c) => ({
            id: c.id as string | null,
            name: c.name,
            action: () => { onSelectCategory(c.id); scrollToProducts(); },
          })),
        ]
      : onSelectCategory
      ? [{ id: null as string | null, name: "הכל", action: () => { onSelectCategory(null); scrollToProducts(); } }]
      : [];

  const LogoContent = () =>
    logoUrl ? (
      <img src={logoUrl} alt={businessName} className="h-10 md:h-12 w-auto object-contain max-w-[180px]" />
    ) : (
      <span className="text-lg md:text-xl font-bold tracking-[0.08em] uppercase text-foreground">
        {businessName}
      </span>
    );

  return (
    <>
      {/* ── Marquee Bar ── */}
      {showMarqueeBar && (
        <div className="bg-foreground text-background py-1.5 overflow-hidden">
          <div className="relative flex overflow-x-hidden">
            <div className="animate-marquee whitespace-nowrap flex">
              {Array(12).fill(null).map((_, i) => (
                <span key={i} className="mx-6 text-[10px] font-bold tracking-[0.3em] uppercase">
                  {businessName}
                </span>
              ))}
            </div>
            <div className="absolute top-0 animate-marquee2 whitespace-nowrap flex">
              {Array(12).fill(null).map((_, i) => (
                <span key={i} className="mx-6 text-[10px] font-bold tracking-[0.3em] uppercase">
                  {businessName}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <header
        dir="rtl"
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-background/95 backdrop-blur-md" : "bg-background"
        }`}
      >
        {/* ── Promo Banner ── */}
        {promoText?.trim() && (
          <div
            className="py-2 text-center text-white"
            style={{ backgroundColor: primaryColor || "hsl(var(--primary))" }}
          >
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase">{promoText}</p>
          </div>
        )}

        {/* ── Main Nav Bar ── */}
        <div className="border-b border-foreground/10">
          <div className="container px-4 md:px-6">
            <div className="flex items-center justify-between h-16 md:h-[72px]">

              {/* Hamburger - mobile only */}
              <button
                className="lg:hidden flex items-center justify-center w-8 h-8 text-foreground"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "סגור תפריט" : "פתח תפריט"}
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>

              {/* Logo - center on mobile, left on desktop (בדסקטופ: צד שני ביחס לניווט) */}
              <div className="flex-1 flex justify-center lg:justify-start">
                {onNavigateHome ? (
                  <button type="button" onClick={onNavigateHome} className="focus:outline-none">
                    <LogoContent />
                  </button>
                ) : (
                  <LogoContent />
                )}
              </div>

              {/* Desktop Nav - center */}
              <nav className="hidden lg:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
                {categories.map((cat) => {
                  const isSelected =
                    storeCategories.length > 0
                      ? cat.id === null ? !selectedCategoryId : cat.id === selectedCategoryId
                      : false;
                  return (
                    <button
                      key={cat.id ?? "all"}
                      onClick={cat.action}
                      className={`text-[11px] font-bold tracking-[0.15em] uppercase transition-colors relative group ${
                        isSelected ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat.name}
                      <span
                        className={`absolute -bottom-0.5 right-0 h-px bg-foreground transition-all duration-300 group-hover:w-full ${
                          isSelected ? "w-full" : "w-0"
                        }`}
                      />
                    </button>
                  );
                })}
                {aboutPath && (
                  <a
                    href={aboutPath}
                    className="text-[11px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors relative group"
                  >
                    אודות
                    <span className="absolute -bottom-0.5 right-0 h-px bg-foreground transition-all duration-300 group-hover:w-full w-0" />
                  </a>
                )}
              </nav>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={onNavigateToFavorites}
                  aria-label="מועדפים"
                  className="relative text-foreground hover:text-foreground/70 transition-colors"
                >
                  <Heart
                    className={`h-[18px] w-[18px] ${favoritesCount > 0 ? "fill-red-500 text-red-500" : ""}`}
                  />
                  {favoritesCount > 0 && (
                    <span className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {favoritesCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={onNavigateToCart}
                  aria-label="סל קניות"
                  className="relative text-foreground hover:text-foreground/70 transition-colors"
                >
                  <ShoppingBag className="h-[18px] w-[18px]" />
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-foreground text-background text-[9px] font-bold rounded-full flex items-center justify-center">
                      {cartItemsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Category Bar - mobile (scrollable chips → editorial tabs) ── */}
        {categories.length > 0 && (
          <div className="lg:hidden border-b border-foreground/10 overflow-x-auto scrollbar-hide">
            <div className="container px-4 flex gap-0">
              {categories.map((cat, i) => {
                const isSelected =
                  storeCategories.length > 0
                    ? cat.id === null ? !selectedCategoryId : cat.id === selectedCategoryId
                    : i === 0;
                return (
                  <button
                    key={cat.id ?? "all"}
                    onClick={cat.action}
                    className={`relative px-4 py-2.5 text-[10px] font-bold tracking-[0.15em] uppercase whitespace-nowrap transition-colors ${
                      isSelected
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat.name}
                    {isSelected && (
                      <span className="absolute bottom-0 right-0 left-0 h-px bg-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* ── Mobile Full-Screen Menu ── */}
      {mobileMenuOpen && (
        <div
          dir="rtl"
          className="lg:hidden fixed inset-0 z-40 bg-background flex flex-col animate-in slide-in-from-right duration-200"
        >
          {/* Menu header */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-foreground/10">
            <LogoContent />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Menu items */}
          <nav className="flex-1 overflow-y-auto px-4 py-6 divide-y divide-foreground/8">
            {categories.map((cat) => (
              <button
                key={cat.id ?? "all"}
                onClick={() => { cat.action(); setMobileMenuOpen(false); }}
                className="w-full text-right py-4 text-sm font-bold tracking-[0.15em] uppercase text-foreground hover:text-muted-foreground transition-colors"
              >
                {cat.name}
              </button>
            ))}
            {aboutPath && (
              <a
                href={aboutPath}
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-right py-4 text-sm font-bold tracking-[0.15em] uppercase text-foreground hover:text-muted-foreground transition-colors"
              >
                אודות
              </a>
            )}
          </nav>

          {/* Bottom actions */}
          <div className="border-t border-foreground/10 px-4 py-6 flex gap-4">
            {onNavigateToFavorites && (
              <button
                onClick={() => { onNavigateToFavorites(); setMobileMenuOpen(false); }}
                className="flex-1 flex items-center justify-center gap-2 border border-foreground/15 py-3 text-[10px] font-bold tracking-[0.15em] uppercase hover:border-foreground transition-colors"
              >
                <Heart className={`h-3.5 w-3.5 ${favoritesCount > 0 ? "fill-red-500 text-red-500" : ""}`} />
                מועדפים{favoritesCount > 0 ? ` (${favoritesCount})` : ""}
              </button>
            )}
            {onNavigateToCart && (
              <button
                onClick={() => { onNavigateToCart(); setMobileMenuOpen(false); }}
                className="flex-1 flex items-center justify-center gap-2 bg-foreground text-background py-3 text-[10px] font-bold tracking-[0.15em] uppercase hover:bg-foreground/85 transition-colors"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                סל קניות{cartItemsCount > 0 ? ` (${cartItemsCount})` : ""}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default StoreHeader;