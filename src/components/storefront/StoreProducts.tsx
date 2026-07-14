import { Plus, Heart, ShoppingBag, Package, Flame, ChevronDown, SlidersHorizontal, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import type { StoreTemplate } from "@/lib/storeTemplates";
import ProductDetailModal from "./ProductDetailModal";

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
  additionalImages?: string[];
}

interface StoreProductsProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  favoriteIds?: Set<string>;
  onToggleFavorite?: (productId: string) => void;
  productCardStyle?: StoreTemplate['productCardStyle'];
  productGrid?: StoreTemplate['productGrid'];
}

type SortOption = "default" | "price_asc" | "price_desc" | "name_asc" | "name_desc";
type FilterOption = "all" | "sale" | "new" | "hot";

const SORT_LABELS: Record<SortOption, string> = {
  default: "ברירת מחדל",
  price_asc: "מחיר: נמוך לגבוה",
  price_desc: "מחיר: גבוה לנמוך",
  name_asc: "שם: א-ב",
  name_desc: "שם: ת-א",
};

const FILTER_LABELS: Record<FilterOption, string> = {
  all: "הכל",
  sale: "מבצעים",
  new: "חדש",
  hot: "חם",
};

const StoreProducts = ({ products, onAddToCart, favoriteIds, onToggleFavorite, productCardStyle, productGrid }: StoreProductsProps) => {
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const activeProducts = products.filter(p => p.active !== false);
  const likedSet = favoriteIds ?? new Set<string>();
  const setLiked = onToggleFavorite ?? (() => {});

  const hotProducts = activeProducts.filter(p => p.isHot);
  const regularProducts = activeProducts.filter(p => !p.isHot);

  const displayedProducts = useMemo(() => {
    let list = regularProducts;
    const q = searchQuery.trim().toLowerCase();
    if (q) list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q));
    if (filterBy === "sale") list = list.filter(p => p.isSale);
    else if (filterBy === "new") list = list.filter(p => p.isNew);
    else if (filterBy === "hot") list = list.filter(p => p.isHot);
    if (sortBy === "price_asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sortBy === "price_desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sortBy === "name_asc") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "he"));
    else if (sortBy === "name_desc") list = [...list].sort((a, b) => b.name.localeCompare(a.name, "he"));
    return list;
  }, [regularProducts, filterBy, sortBy, searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterBy, sortBy, searchQuery]);

  // Pagination calculations
  const totalPages = Math.ceil(displayedProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = displayedProducts.slice(startIndex, endIndex);

  const formatPrice = (price: number) => {
    if (price === 0) return "-";
    return new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
  };

  const handleAddToCart = (product: Product) => {
    onAddToCart(product);
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1500);
    toast.success(`${product.name} נוסף לסל`);
  };

  // From the product modal: add, then close so the shopper sees it landed in the cart.
  const handleAddToCartFromModal = (product: Product) => {
    handleAddToCart(product);
    handleCloseModal();
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedProduct(null), 200);
  };

  if (activeProducts.length === 0) {
    return (
      <section id="products" className="py-24">
        <div className="container">
          <div className="text-center py-32 border-t border-foreground/10">
            <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-6" />
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">אין מוצרים זמינים כרגע</p>
          </div>
        </div>
      </section>
    );
  }

  /* ─── Product Card ─── */
  const ProductCard = ({
    product,
    variant = "normal",
  }: {
    product: Product;
    variant?: "normal" | "hero" | "wide" | "tall";
  }) => {
    const isHero = variant === "hero";
    const isWide = variant === "wide";
    const isTall = variant === "tall";

    const aspectClass = isHero
      ? "aspect-[3/4] md:aspect-[2/3]"
      : isTall
      ? "aspect-[3/5]"
      : isWide
      ? "aspect-[16/9] md:aspect-[4/3]"
      : "aspect-[3/4]";

    return (
      <article className="group relative flex flex-col h-full">
        {/* Image Container */}
        <div 
          className={`relative overflow-hidden bg-muted flex-shrink-0 ${aspectClass} cursor-pointer`}
          onClick={() => handleProductClick(product)}
        >
          {product.imageUrl?.trim() ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/30">
              <Package className="h-10 w-10 text-muted-foreground/20" />
            </div>
          )}

          {/* Dark overlay on hover */}
          <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-all duration-500" />

          {/* Badges - editorial style: thin, uppercase, tight tracking */}
          <div className="absolute top-3 right-3 flex flex-col gap-1.5">
            {product.isHot && (
              <span className="flex items-center gap-1 bg-orange-500 text-white text-[9px] font-bold tracking-[0.15em] uppercase px-2 py-1">
                <Flame className="h-2.5 w-2.5" /> חם
              </span>
            )}
            {product.isNew && (
              <span className="bg-foreground text-background text-[9px] font-bold tracking-[0.15em] uppercase px-2 py-1">
                חדש
              </span>
            )}
            {product.isSale && (
              <span className="bg-red-500 text-white text-[9px] font-bold tracking-[0.15em] uppercase px-2 py-1">
                מבצע
              </span>
            )}
          </div>

          {/* Wishlist */}
          <button
            onClick={() => setLiked(product.id)}
            className="absolute top-3 left-3 w-8 h-8 bg-background/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-background"
          >
            <Heart
              className={`h-3.5 w-3.5 transition-colors ${
                likedSet.has(product.id) ? "fill-red-500 text-red-500" : "text-foreground"
              }`}
            />
          </button>

          {/* Slide-up Add to Cart - desktop */}
          <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out hidden md:block">
            <button
              onClick={() => handleAddToCart(product)}
              className={`w-full flex items-center justify-center gap-2 py-3 text-xs font-bold tracking-[0.15em] uppercase transition-colors ${
                addedProductId === product.id
                  ? "bg-green-600 text-white"
                  : "bg-background text-foreground hover:bg-foreground hover:text-background"
              }`}
            >
              {addedProductId === product.id ? (
                <>
                  <ShoppingBag className="h-3.5 w-3.5" /> נוסף לסל
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" /> הוסף לסל
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="pt-3 flex flex-col gap-0.5 flex-1">
          {product.brand && (
            <p className="text-[9px] tracking-[0.25em] uppercase text-muted-foreground font-medium">
              {product.brand}
            </p>
          )}
          <h3 
            className={`font-medium leading-snug text-foreground line-clamp-2 cursor-pointer hover:text-primary transition-colors ${isHero ? "text-base" : "text-sm"}`}
            onClick={() => handleProductClick(product)}
          >
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
            <span className={`font-bold ${product.originalPrice ? "text-red-500" : "text-foreground"} text-sm`}>
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
            )}
          </div>

          {/* Mobile CTA */}
          <button
            onClick={() => handleAddToCart(product)}
            className={`mt-2.5 md:hidden w-full border py-2 text-[10px] font-bold tracking-[0.15em] uppercase transition-colors ${
              addedProductId === product.id
                ? "border-green-600 text-green-600 bg-green-50"
                : "border-foreground/20 text-foreground hover:border-foreground"
            }`}
          >
            {addedProductId === product.id ? "נוסף ✓" : "+ הוסף לסל"}
          </button>
        </div>
      </article>
    );
  };

  return (
    <section id="products" dir="rtl" className="py-12 md:py-20">
      <div className="container px-4 md:px-6">

        {/* ── HOT PRODUCTS - Editorial Feature Layout ── */}
        {hotProducts.length > 0 && (
          <div className="mb-16 md:mb-24">
            {/* Section label */}
            <div className="flex items-center gap-3 mb-6 md:mb-8">
              <div className="h-px flex-1 bg-foreground/10" />
              <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.3em] uppercase text-orange-500">
                <Flame className="h-3 w-3" /> מוצרים חמים
              </span>
              <div className="h-px flex-1 bg-foreground/10" />
            </div>

            {/* Mobile: uniform 2-col grid for hot products */}
            <div className="grid grid-cols-2 gap-3 md:hidden">
              {hotProducts.map((product) => (
                <div key={product.id}>
                  <ProductCard product={product} variant="normal" />
                </div>
              ))}
            </div>

            {/* Desktop: magazine asymmetric layout */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 md:gap-5">
              {hotProducts[0] && (
                <div className="col-span-7 row-span-2">
                  <ProductCard product={hotProducts[0]} variant="hero" />
                </div>
              )}
              {hotProducts[1] && (
                <div className="col-span-5">
                  <ProductCard product={hotProducts[1]} variant="tall" />
                </div>
              )}
              {hotProducts[2] && (
                <div className="col-span-5">
                  <ProductCard product={hotProducts[2]} variant="normal" />
                </div>
              )}
              {hotProducts.slice(3).map((p) => (
                <div key={p.id} className="col-span-4">
                  <ProductCard product={p} variant="normal" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FILTER / SORT BAR ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-t border-b border-foreground/10 py-4 md:py-3 mb-8 md:mb-10 gap-4 md:gap-3">
          {/* Title + count - שורה נפרדת במובייל */}
          <div className="flex items-baseline gap-2 flex-shrink-0">
            <h2 className="text-sm font-bold tracking-[0.15em] uppercase text-foreground whitespace-nowrap">
              {hotProducts.length > 0 ? "כל המוצרים" : "המוצרים שלנו"}
            </h2>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{displayedProducts.length} פריטים</span>
          </div>

          {/* Filter chips + sort - שורה שנייה במובייל, גלילה אופקית */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5 md:pb-0 md:flex-wrap md:justify-end">
            {/* Product search */}
            <div className="relative flex-shrink-0 order-first md:order-none w-full md:w-48">
              <Search className="h-3.5 w-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חיפוש מוצר..."
                aria-label="חיפוש מוצר"
                className="w-full h-9 rounded-md border border-foreground/15 bg-background pr-8 pl-7 text-sm focus:border-foreground/40 outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} aria-label="נקה חיפוש" className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              {(Object.keys(FILTER_LABELS) as FilterOption[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setFilterBy(key)}
                  className={`text-[10px] font-bold tracking-[0.1em] uppercase px-3 py-2 min-w-[52px] border transition-colors rounded-md touch-manipulation ${
                    filterBy === key
                      ? "border-foreground bg-foreground text-background"
                      : "border-foreground/15 text-muted-foreground hover:border-foreground/40"
                  }`}
                >
                  {FILTER_LABELS[key]}
                </button>
              ))}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.1em] uppercase text-muted-foreground border border-foreground/15 px-3 py-2 hover:border-foreground/40 transition-colors rounded-md flex-shrink-0 touch-manipulation">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{SORT_LABELS[sortBy]}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => setSortBy(key)}
                    className={`text-xs ${sortBy === key ? "font-bold" : ""}`}
                  >
                    {SORT_LABELS[key]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── PRODUCTS GRID ── */}

        {/* Mobile: always 2-col uniform */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          {paginatedProducts.map((product, i) => (
            <motion.div key={product.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
              <ProductCard product={product} variant="normal" />
            </motion.div>
          ))}
        </div>

        {/* Desktop: grid varies by template */}
        {(!productGrid || productGrid === 'uniform-3col') && (
          <div className="hidden md:grid md:grid-cols-3 gap-5 auto-rows-auto">
            {paginatedProducts.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                <ProductCard product={product} variant="normal" />
              </motion.div>
            ))}
          </div>
        )}

        {productGrid === 'featured' && (
          <div className="hidden md:grid md:grid-cols-3 gap-5 auto-rows-auto">
            {paginatedProducts.map((product, i) => {
              if (i === 0) {
                return (
                  <motion.div key={product.id} className="md:col-span-2 md:row-span-2" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                    <ProductCard product={product} variant="hero" />
                  </motion.div>
                );
              }
              return (
                <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                  <ProductCard product={product} variant="normal" />
                </motion.div>
              );
            })}
          </div>
        )}

        {productGrid === '2col' && (
          <div className="hidden md:grid md:grid-cols-2 gap-6 auto-rows-auto">
            {paginatedProducts.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                <ProductCard product={product} variant="wide" />
              </motion.div>
            ))}
          </div>
        )}

        {productGrid === '4col' && (
          <div className="hidden md:grid md:grid-cols-4 gap-4 auto-rows-auto">
            {paginatedProducts.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                <ProductCard product={product} variant="normal" />
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12 md:mt-16">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-xs font-bold tracking-[0.15em] uppercase border border-foreground/20 text-foreground hover:bg-foreground hover:text-background transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-foreground"
            >
              הקודם
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const showPage = 
                  page === 1 || 
                  page === totalPages || 
                  (page >= currentPage - 1 && page <= currentPage + 1);
                
                const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;
                
                return (
                  <div key={page} className="flex items-center">
                    {showEllipsisBefore && (
                      <span className="px-2 text-muted-foreground text-xs">...</span>
                    )}
                    {showPage && (
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[2.5rem] px-3 py-2 text-xs font-bold tracking-[0.1em] border transition-colors ${
                          currentPage === page
                            ? "bg-foreground text-background border-foreground"
                            : "border-foreground/20 text-foreground hover:border-foreground"
                        }`}
                      >
                        {page}
                      </button>
                    )}
                    {showEllipsisAfter && (
                      <span className="px-2 text-muted-foreground text-xs">...</span>
                    )}
                  </div>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 text-xs font-bold tracking-[0.15em] uppercase border border-foreground/20 text-foreground hover:bg-foreground hover:text-background transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-foreground"
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
        onAddToCart={handleAddToCartFromModal}
        isFavorite={selectedProduct ? likedSet.has(selectedProduct.id) : false}
        onToggleFavorite={onToggleFavorite}
      />
    </section>
  );
};

export default StoreProducts;