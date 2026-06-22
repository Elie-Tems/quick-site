import { ArrowRight, Heart, Package, ShoppingBag, Sparkles } from "lucide-react";
import type { Product } from "../storefront/StoreProducts";

interface StoreFavoritesV2Props {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onRemoveFavorite: (productId: string) => void;
  onBack: () => void;
}

const StoreFavoritesV2 = ({ products, onAddToCart, onRemoveFavorite, onBack }: StoreFavoritesV2Props) => {
  const formatPrice = (price: number) => {
    if (price === 0) return "-";
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  /* Empty State */
  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30" dir="rtl">
        <div className="container max-w-4xl py-12 px-4 md:px-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 hover:bg-muted text-sm font-medium text-foreground transition-all duration-300 hover:scale-105 mb-12"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה לחנות
          </button>

          <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-12 md:p-16 text-center shadow-xl">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-6">
              <Heart className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">אין מוצרים במועדפים</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              לחץ על הלב במוצר כדי לשמור למועדפים ולמצוא אותו בקלות בהמשך
            </p>
            <button
              onClick={onBack}
              className="px-8 py-4 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/50"
            >
              התחל לקנות
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30" dir="rtl">
      <div className="container py-12 px-4 md:px-6">
        {/* Back button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 hover:bg-muted text-sm font-medium text-foreground transition-all duration-300 hover:scale-105 mb-8"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לחנות
        </button>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              המועדפים שלי
            </h1>
            <p className="text-muted-foreground">
              {products.length} {products.length === 1 ? 'מוצר' : 'מוצרים'} שמורים
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20">
            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
            <span className="text-sm font-medium text-red-500">מועדפים</span>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <article 
              key={product.id} 
              className="group rounded-2xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-2"
            >
              {/* Image */}
              <div className="relative aspect-[3/4] bg-muted overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/30">
                    <Package className="h-12 w-12 text-muted-foreground/20" />
                  </div>
                )}

                {/* Badges */}
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  {product.isHot && (
                    <span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg">
                      🔥 HOT
                    </span>
                  )}
                  {product.isNew && (
                    <span className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-lg">
                      ✨ חדש
                    </span>
                  )}
                  {product.isSale && (
                    <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-xs font-bold shadow-lg">
                      🎉 מבצע
                    </span>
                  )}
                </div>

                {/* Remove favorite */}
                <button
                  onClick={() => onRemoveFavorite(product.id)}
                  aria-label="הסר ממועדפים"
                  className="absolute top-3 left-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-300 shadow-lg"
                >
                  <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                </button>

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              {/* Info */}
              <div className="p-4 space-y-3">
                <h3 className="font-bold text-foreground leading-tight line-clamp-2 min-h-[2.5rem]">
                  {product.name}
                </h3>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-bold text-primary">
                      {formatPrice(product.price)}
                    </p>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <p className="text-xs text-muted-foreground line-through">
                        {formatPrice(product.originalPrice)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Add to cart button */}
                <button
                  onClick={() => onAddToCart(product)}
                  className="w-full py-3 rounded-full bg-primary text-primary-foreground font-bold text-sm hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/50 flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="h-4 w-4" />
                  הוסף לסל
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StoreFavoritesV2;
