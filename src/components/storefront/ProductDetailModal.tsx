import { X, Plus, Heart, Package, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "./StoreProducts";

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (productId: string) => void;
}

const ProductDetailModal = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  isFavorite = false,
  onToggleFavorite,
}: ProductDetailModalProps) => {
  if (!isOpen || !product) return null;

  const formatPrice = (price: number) => {
    if (price === 0) return "-";
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleAddToCart = () => {
    onAddToCart(product);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-background rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-10 w-10 h-10 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors shadow-lg"
        >
          <X className="h-5 w-5 text-foreground" />
        </button>

        {/* Wishlist Button */}
        {onToggleFavorite && (
          <button
            onClick={() => onToggleFavorite(product.id)}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-background transition-colors shadow-lg"
          >
            <Heart
              className={`h-5 w-5 transition-colors ${
                isFavorite ? "fill-red-500 text-red-500" : "text-foreground"
              }`}
            />
          </button>
        )}

        <div className="grid md:grid-cols-2 gap-0 overflow-y-auto max-h-[90vh]">
          {/* Image Section */}
          <div className="relative bg-muted aspect-square md:aspect-auto md:min-h-[500px]">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-20 w-20 text-muted-foreground/20" />
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
              {product.isHot && (
                <span className="bg-orange-500 text-white text-xs font-bold tracking-wider uppercase px-3 py-1.5 shadow-lg">
                  חם
                </span>
              )}
              {product.isNew && (
                <span className="bg-foreground text-background text-xs font-bold tracking-wider uppercase px-3 py-1.5 shadow-lg">
                  חדש
                </span>
              )}
              {product.isSale && (
                <span className="bg-red-500 text-white text-xs font-bold tracking-wider uppercase px-3 py-1.5 shadow-lg">
                  מבצע
                </span>
              )}
            </div>
          </div>

          {/* Content Section */}
          <div className="p-8 md:p-10 flex flex-col" dir="rtl">
            {/* Brand */}
            {product.brand && (
              <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium mb-2">
                {product.brand}
              </p>
            )}

            {/* Product Name */}
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
              {product.name}
            </h2>

            {/* SKU */}
            {product.sku && (
              <p className="text-sm text-muted-foreground mb-4">
                מק"ט: {product.sku}
              </p>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6 pb-6 border-b border-border">
              <span
                className={`text-3xl font-bold ${
                  product.originalPrice ? "text-red-500" : "text-foreground"
                }`}
              >
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-xl text-muted-foreground line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <h3 className="text-sm font-bold tracking-wider uppercase text-foreground mb-2">
                  תיאור
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Custom Fields */}
            {product.custom_fields && product.custom_fields.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-bold tracking-wider uppercase text-foreground mb-3">
                  פרטים נוספים
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {product.custom_fields.map((field) => (
                    <div
                      key={field.id}
                      className="border border-border rounded-lg p-3"
                    >
                      <p className="text-xs text-muted-foreground mb-1">
                        {field.field_name}
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {field.field_value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add to Cart Button */}
            <div className="mt-auto pt-6">
              <Button
                onClick={handleAddToCart}
                className="w-full h-14 text-base font-bold tracking-wider uppercase gap-2"
                size="lg"
              >
                <ShoppingBag className="h-5 w-5" />
                הוסף לסל
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;
