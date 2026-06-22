import { ShoppingCart, Heart, Menu, X, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface StoreHeaderV2Props {
  businessName: string;
  logoUrl?: string;
  cartItemCount: number;
  favoriteCount: number;
  onCartClick: () => void;
  onFavoritesClick: () => void;
  storeSlug?: string;
  onNavigateToProducts?: () => void;
}

const StoreHeaderV2 = ({
  businessName,
  logoUrl,
  cartItemCount,
  favoriteCount,
  onCartClick,
  onFavoritesClick,
  storeSlug,
  onNavigateToProducts,
}: StoreHeaderV2Props) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect
  if (typeof window !== 'undefined') {
    window.addEventListener('scroll', () => {
      setIsScrolled(window.scrollY > 20);
    });
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-background/80 backdrop-blur-xl shadow-lg border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="container px-4 md:px-6">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName}
                className="h-8 md:h-10 w-auto object-contain"
              />
            ) : (
              <span className="text-xl md:text-2xl font-bold text-foreground">
                {businessName}
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => {
                if (onNavigateToProducts) {
                  onNavigateToProducts();
                } else {
                  const section = document.getElementById('products');
                  section?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              מוצרים
            </button>
            {storeSlug && (
              <Link
                to={`/store/${storeSlug}/v2/about`}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                אודות
              </Link>
            )}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Favorites */}
            <button
              onClick={onFavoritesClick}
              className="relative p-2 md:p-2.5 rounded-full hover:bg-muted transition-all duration-300 hover:scale-110"
            >
              <Heart className="h-5 w-5 md:h-6 md:w-6 text-foreground" />
              {favoriteCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                  {favoriteCount}
                </span>
              )}
            </button>

            {/* Cart */}
            <button
              onClick={onCartClick}
              className="relative p-2 md:p-2.5 rounded-full hover:bg-muted transition-all duration-300 hover:scale-110"
            >
              <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-foreground" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-full hover:bg-muted transition-colors"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-foreground" />
              ) : (
                <Menu className="h-6 w-6 text-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-t border-border animate-in slide-in-from-top duration-300">
          <nav className="container px-4 py-6 space-y-4">
            <button
              onClick={() => {
                if (onNavigateToProducts) {
                  onNavigateToProducts();
                } else {
                  const section = document.getElementById('products');
                  section?.scrollIntoView({ behavior: 'smooth' });
                }
                setIsMenuOpen(false);
              }}
              className="block text-lg font-medium text-foreground hover:text-primary transition-colors w-full text-right"
            >
              מוצרים
            </button>
            {storeSlug && (
              <Link
                to={`/store/${storeSlug}/v2/about`}
                onClick={() => setIsMenuOpen(false)}
                className="block text-lg font-medium text-foreground hover:text-primary transition-colors w-full text-right"
              >
                אודות
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default StoreHeaderV2;
