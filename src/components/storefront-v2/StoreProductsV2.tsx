import { useState, useMemo, useEffect } from "react";
import { Heart, ShoppingBag, Sparkles, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductDetailModal from "../storefront/ProductDetailModal";

export interface ProductCustomField {
  id: string;
  field_name: string;
  field_value: string | null;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  active?: boolean;
  brand?: string;
  isNew?: boolean;
  isSale?: boolean;
  isHot?: boolean;
  sku?: string;
  categoryId?: string;
  custom_fields?: ProductCustomField[];
}

export interface Category {
  id: string;
  name: string;
  sort_order: number | null;
}

interface StoreProductsV2Props {
  products: Product[];
  categories?: Category[];
  onAddToCart: (product: Product) => void;
  favoriteIds?: Set<string>;
  onToggleFavorite?: (productId: string) => void;
}

type SortOption = "default" | "price_asc" | "price_desc" | "name";
type FilterOption = "all" | "sale" | "new" | "hot";

const SORT_LABELS: Record<SortOption, string> = {
  default: "מומלץ",
  price_asc: "מחיר: נמוך לגבוה",
  price_desc: "מחיר: גבוה לנמוך",
  name: "שם: א-ת",
};

const FILTER_LABELS: Record<FilterOption, string> = {
  all: "הכל",
  sale: "מבצעים",
  new: "חדש",
  hot: "פופולרי",
};

const StoreProductsV2 = ({ products, categories = [], onAddToCart, favoriteIds, onToggleFavorite }: StoreProductsV2Props) => {
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const activeProducts = products.filter(p => p.active !== false);
  const likedSet = favoriteIds ?? new Set<string>();
  const setLiked = onToggleFavorite ?? (() => {});

  const displayedProducts = useMemo(() => {
    let list = activeProducts;
    
    // Filter by category
    if (selectedCategoryId) {
      list = list.filter(p => p.categoryId === selectedCategoryId);
    }
    
    // Filter by type
    if (filterBy === "sale") list = list.filter(p => p.isSale);
    else if (filterBy === "new") list = list.filter(p => p.isNew);
    else if (filterBy === "hot") list = list.filter(p => p.isHot);
    
    // Sort
    if (sortBy === "price_asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sortBy === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'he'));
    
    return list;
  }, [activeProducts, selectedCategoryId, filterBy, sortBy]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategoryId, filterBy, sortBy]);

  // Pagination
  const totalPages = Math.ceil(displayedProducts.length / itemsPerPage);
  const paginatedProducts = displayedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatPrice = (price: number) => {
    if (price === 0) return "-";
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleAddToCart = (product: Product) => {
    onAddToCart(product);
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 2000);
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedProduct(null), 200);
  };

  return (
    <section id="products" dir="rtl" className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/20">
      <div className="container px-4 md:px-6">
        {/* Header with filters */}
        <div className="mb-12 space-y-6">
          {/* Title */}
          <div className="text-center space-y-2">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">המוצרים שלנו</h2>
            <p className="text-muted-foreground text-lg">{displayedProducts.length} מוצרים זמינים</p>
          </div>

          {/* Filter bar */}
          <div className="space-y-4">
            {/* Categories */}
            {categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 justify-center">
                <button
                  onClick={() => setSelectedCategoryId(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    !selectedCategoryId
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/50 scale-105"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:scale-105"
                  }`}
                >
                  כל הקטגוריות
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      selectedCategoryId === category.id
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/50 scale-105"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:scale-105"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}

            {/* Filter chips and sort */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border shadow-lg">
              {/* Filter chips */}
              <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                {(Object.keys(FILTER_LABELS) as FilterOption[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setFilterBy(key)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      filterBy === key
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/50 scale-105"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:scale-105"
                    }`}
                  >
                    {FILTER_LABELS[key]}
                  </button>
                ))}
              </div>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 hover:bg-muted text-sm font-medium transition-all duration-300 hover:scale-105"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>{SORT_LABELS[sortBy]}</span>
              </button>

              {showFilters && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowFilters(false)}
                  />
                  <div className="absolute left-0 top-full mt-2 w-56 bg-card rounded-xl shadow-2xl border border-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSortBy(key);
                          setShowFilters(false);
                        }}
                        className={`w-full px-4 py-3 text-right text-sm transition-colors ${
                          sortBy === key
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted"
                        }`}
                      >
                        {SORT_LABELS[key]}
                      </button>
                    ))}
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {paginatedProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 mb-4">
              <ShoppingBag className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <p className="text-xl text-muted-foreground">לא נמצאו מוצרים</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {paginatedProducts.map((product, index) => (
              <div
                key={product.id}
                className="group relative animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Product Card */}
                <div className="relative h-full flex flex-col bg-card rounded-2xl overflow-hidden border border-border shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                  {/* Image */}
                  <div
                    className="relative aspect-square overflow-hidden bg-muted cursor-pointer"
                    onClick={() => handleProductClick(product)}
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="h-12 w-12 text-muted-foreground/20" />
                      </div>
                    )}

                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Badges */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                      {product.isHot && (
                        <span className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
                          🔥 HOT
                        </span>
                      )}
                      {product.isNew && (
                        <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-lg">
                          ✨ חדש
                        </span>
                      )}
                      {product.isSale && (
                        <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                          🎉 מבצע
                        </span>
                      )}
                    </div>

                    {/* Favorite button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLiked(product.id);
                      }}
                      className="absolute top-3 left-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-lg"
                    >
                      <Heart
                        className={`h-5 w-5 transition-colors ${
                          likedSet.has(product.id)
                            ? "fill-red-500 text-red-500"
                            : "text-foreground"
                        }`}
                      />
                    </button>

                    {/* Quick add button - desktop */}
                    <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 hidden md:block">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                        className={`w-full py-3 text-sm font-bold transition-colors ${
                          addedProductId === product.id
                            ? "bg-green-500 text-white"
                            : "bg-white/95 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground"
                        }`}
                      >
                        {addedProductId === product.id ? "✓ נוסף לסל" : "+ הוסף לסל"}
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 flex-1 flex flex-col">
                    {product.brand && (
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        {product.brand}
                      </p>
                    )}

                    <h3
                      className="font-semibold text-foreground line-clamp-2 mb-2 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleProductClick(product)}
                    >
                      {product.name}
                    </h3>

                    {/* Custom fields */}
                    {product.custom_fields && product.custom_fields.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {product.custom_fields.slice(0, 2).map((field) => (
                          <span
                            key={field.id}
                            className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                          >
                            {field.field_name}: {field.field_value}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Price */}
                    <div className="mt-auto flex items-baseline gap-2">
                      <span
                        className={`text-lg font-bold ${
                          product.originalPrice ? "text-red-500" : "text-foreground"
                        }`}
                      >
                        {formatPrice(product.price)}
                      </span>
                      {product.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(product.originalPrice)}
                        </span>
                      )}
                    </div>

                    {/* Mobile add button */}
                    <button
                      onClick={() => handleAddToCart(product)}
                      className={`mt-3 md:hidden w-full py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                        addedProductId === product.id
                          ? "bg-green-500 text-white"
                          : "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/50"
                      }`}
                    >
                      {addedProductId === product.id ? "✓ נוסף" : "+ הוסף לסל"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-6 py-3 rounded-full bg-card border border-border text-sm font-medium transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:text-foreground"
            >
              הקודם
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const showPage =
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1);

                if (!showPage) return null;

                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-full text-sm font-bold transition-all duration-300 ${
                      currentPage === page
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/50 scale-110"
                        : "bg-card border border-border hover:bg-muted"
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-6 py-3 rounded-full bg-card border border-border text-sm font-medium transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-card disabled:hover:text-foreground"
            >
              הבא
            </button>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAddToCart={handleAddToCart}
        isFavorite={selectedProduct ? likedSet.has(selectedProduct.id) : false}
        onToggleFavorite={onToggleFavorite}
      />
    </section>
  );
};

export default StoreProductsV2;
