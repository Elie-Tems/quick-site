import { ArrowRight, Heart, Package, Plus, ShoppingBag } from "lucide-react";
import type { Product } from "./StoreProducts";

interface StoreFavoritesProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onRemoveFavorite: (productId: string) => void;
  onBack: () => void;
}

const StoreFavorites = ({ products, onAddToCart, onRemoveFavorite, onBack }: StoreFavoritesProps) => {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);

  /* ── Empty State ── */
  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <div className="container max-w-3xl py-10 px-4 md:px-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-12"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            חזרה לחנות
          </button>
          <div className="border-t border-foreground/10 pt-16 pb-24 text-center">
            <Heart className="h-8 w-8 text-muted-foreground/20 mx-auto mb-6" />
            <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-muted-foreground mb-3">אין מוצרים במועדפים</p>
            <p className="text-sm text-muted-foreground/60 mb-8">לחץ על הלב במוצר כדי לשמור למועדפים</p>
            <button
              onClick={onBack}
              className="text-[10px] font-bold tracking-[0.25em] uppercase border border-foreground/20 px-6 py-2.5 hover:border-foreground hover:bg-foreground hover:text-background transition-all"
            >
              חזרה לחנות
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="container py-10 px-4 md:px-6">

        {/* ── Back ── */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          חזרה לחנות
        </button>

        {/* ── Header ── */}
        <div className="flex items-baseline justify-between border-b border-foreground/10 pb-4 mb-8">
          <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-foreground">
            המועדפים שלי
          </h1>
          <span className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
            {products.length} מוצרים
          </span>
        </div>

        {/* ── Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
          {products.map((product) => (
            <article key={product.id} className="group flex flex-col">

              {/* Image */}
              <div className="relative aspect-[3/4] bg-muted overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/30">
                    <Package className="h-10 w-10 text-muted-foreground/20" />
                  </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/8 transition-all duration-500" />

                {/* Remove favorite */}
                <button
                  onClick={() => onRemoveFavorite(product.id)}
                  aria-label="הסר ממועדפים"
                  className="absolute top-2.5 left-2.5 w-8 h-8 bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
                >
                  <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
                </button>

                {/* Add to cart - slide up on hover, desktop */}
                <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out hidden md:block">
                  <button
                    onClick={() => onAddToCart(product)}
                    className="w-full flex items-center justify-center gap-2 py-3 text-xs font-bold tracking-[0.15em] uppercase bg-background text-foreground hover:bg-foreground hover:text-background transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    הוסף לסל
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="pt-3 flex flex-col gap-0.5 flex-1 px-0.5">
                {product.brand && (
                  <p className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground font-medium">
                    {product.brand}
                  </p>
                )}
                <h3 className="text-sm font-medium text-foreground line-clamp-2 leading-snug">
                  {product.name}
                </h3>

                {product.custom_fields && product.custom_fields.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {product.custom_fields.slice(0, 2).map((f) => (
                      <span key={f.id} className="text-[9px] px-1.5 py-0.5 border border-foreground/10 text-muted-foreground tracking-wide">
                        {f.field_name}: {f.field_value}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className={`text-sm font-bold ${product.originalPrice ? "text-red-500" : "text-foreground"}`}>
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                </div>

                {/* Mobile CTA */}
                <button
                  onClick={() => onAddToCart(product)}
                  className="mt-2.5 md:hidden w-full border border-foreground/20 py-2 text-[10px] font-bold tracking-[0.15em] uppercase hover:border-foreground transition-colors"
                >
                  + הוסף לסל
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StoreFavorites;