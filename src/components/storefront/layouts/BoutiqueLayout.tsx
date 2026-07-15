import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, X, Plus, Minus, ArrowLeft, Flame, Tag, Heart, Phone, MessageCircle } from "lucide-react";
import type { StorefrontLayoutProps } from "./StorefrontLayout.types";

const FALLBACK_HERO = "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1600&q=80";
const FALLBACK_PRODUCT_IMG = "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&q=80";

export default function BoutiqueLayout(props: StorefrontLayoutProps) {
  const {
    businessName, tagline, heroTitle, promoText, aboutText,
    logoUrl, phone, products, categories, banners, heroImageUrl,
    cartItems, onAddToCart, onUpdateQuantity, onRemoveFromCart,
    onCheckout, favoriteIds, onToggleFavorite,
    selectedCategoryId, onSelectCategory, customLabels,
  } = props;

  const [cartOpen, setCartOpen] = useState(false);
  const closeCartBtnRef = useRef<HTMLButtonElement>(null);
  const openCartBtnRef = useRef<HTMLButtonElement>(null);

  const heroImg = heroImageUrl || banners?.[0]?.imageUrl || FALLBACK_HERO;
  const cats = [{ id: null, name: "הכל" }, ...categories.map(c => ({ id: c.id, name: c.name }))];
  const visible = selectedCategoryId
    ? products.filter(p => p.categoryId === selectedCategoryId)
    : products;
  const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    if (cartOpen) {
      closeCartBtnRef.current?.focus();
    } else {
      openCartBtnRef.current?.focus();
    }
  }, [cartOpen]);

  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCartOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cartOpen]);

  const handleAdd = (p: typeof products[0]) => {
    onAddToCart(p);
    setCartOpen(true);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      {/* TOP BAR */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3">
          {logoUrl
            ? <img src={logoUrl} alt={businessName} className="h-9 w-auto object-contain" />
            : <span className="font-display font-bold text-lg">{businessName}</span>}
          {tagline && <span className="hidden md:block text-sm text-muted-foreground">{tagline}</span>}
        </div>
        <button
          ref={openCartBtnRef}
          onClick={() => setCartOpen(true)}
          aria-label={`סל קניות${itemCount > 0 ? `, ${itemCount} פריטים` : ""}`}
          className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
        >
          <ShoppingBag className="w-4 h-4" aria-hidden="true" />
          סל קניות
          {itemCount > 0 && (
            <span aria-hidden="true" className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </button>
      </header>

      <main>
        {/* HERO */}
        <section className="relative h-[72vh] min-h-[460px] overflow-hidden">
          <img src={heroImg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" aria-hidden="true" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-6xl mx-auto px-4 md:px-6 w-full">
              <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }} className="max-w-lg">
                <h1 className="text-4xl md:text-6xl font-display font-bold text-white leading-[1.05] mb-4">
                  {heroTitle || businessName}
                </h1>
                {(aboutText || tagline) && (
                  <p className="text-lg text-white/80 mb-7 max-w-sm">{aboutText || tagline}</p>
                )}
                <button
                  onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow"
                >
                  לקולקציה <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                </button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* PROMO BANNER */}
        {promoText && (
          <div className="bg-primary text-primary-foreground text-center py-3 px-4 font-semibold text-sm flex items-center justify-center gap-2">
            <Tag className="w-4 h-4" aria-hidden="true" />
            {promoText}
            <Tag className="w-4 h-4" aria-hidden="true" />
          </div>
        )}

        {/* PRODUCTS */}
        {props.verticalSlot}
        <section id="products" className="relative py-14 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
              <div>
                <h2 className="text-2xl md:text-3xl font-display font-bold">{customLabels?.productsTitle || "הקולקציה שלנו"}</h2>
                <p className="text-muted-foreground text-sm mt-0.5">{visible.length} פריטים</p>
              </div>
              {cats.length > 1 && (
                <div className="flex flex-wrap gap-2" role="group" aria-label="סינון לפי קטגוריה">
                  {cats.map((c) => (
                    <button
                      key={c.id ?? "all"}
                      onClick={() => onSelectCategory(c.id)}
                      aria-pressed={selectedCategoryId === c.id}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        selectedCategoryId === c.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border text-foreground hover:border-primary/40"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              <AnimatePresence mode="popLayout">
                {visible.map((p, i) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 22 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="rounded-2xl border border-border bg-card overflow-hidden group h-full flex flex-col hover:border-primary/40 transition-colors">
                      <div className="relative aspect-[3/4] overflow-hidden">
                        <img
                          src={p.imageUrl || FALLBACK_PRODUCT_IMG}
                          alt={p.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
                        {p.isHot && (
                          <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500 text-white text-xs font-bold shadow-lg">
                            <Flame className="w-3.5 h-3.5" aria-hidden="true" /> חם
                          </span>
                        )}
                        <button
                          onClick={() => onToggleFavorite(p.id)}
                          aria-label={favoriteIds.has(p.id) ? `הסר מהמועדפים: ${p.name}` : `הוסף למועדפים: ${p.name}`}
                          aria-pressed={favoriteIds.has(p.id)}
                          className={`absolute top-3 left-3 w-8 h-8 rounded-full backdrop-blur border flex items-center justify-center transition-colors ${
                            favoriteIds.has(p.id)
                              ? "bg-rose-500 border-rose-400 text-white"
                              : "bg-white/20 border-white/30 text-white hover:bg-white/30"
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${favoriteIds.has(p.id) ? "fill-current" : ""}`} aria-hidden="true" />
                        </button>
                      </div>
                      <div className="p-3 flex-1 flex flex-col">
                        <div className="text-sm font-semibold leading-snug mb-1">{p.name}</div>
                        {p.description && <div className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</div>}
                        <div className="flex items-center justify-between mt-auto">
                          <span className="font-display font-bold text-primary text-lg">₪{p.price}</span>
                          <button
                            onClick={() => handleAdd(p)}
                            aria-label={`הוסף לסל: ${p.name}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 transition-all active:scale-95"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" /> הוסף לסל
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {visible.length === 0 && (
              <div className="text-center py-20 text-muted-foreground">אין מוצרים להצגה</div>
            )}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative py-10 px-4 bg-muted/30 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-right">
            <div className="font-display font-bold text-lg">{businessName}</div>
            {tagline && <div className="text-muted-foreground text-sm">{tagline}</div>}
          </div>
          <div className="flex items-center gap-3">
            {props.whatsappEnabled && phone && (
              <a href={`https://wa.me/972${phone.replace(/^0/, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-sm">
                <MessageCircle className="w-4 h-4" aria-hidden="true" /> וואטסאפ
              </a>
            )}
            {phone && (
              <a href={`tel:${phone}`} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
                <Phone className="w-4 h-4" aria-hidden="true" /> {phone}
              </a>
            )}
          </div>
        </div>
      </footer>

      {/* CART OVERLAY */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setCartOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cart-title"
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm flex flex-col bg-background border-l border-border shadow-2xl"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <button
                  ref={closeCartBtnRef}
                  onClick={() => setCartOpen(false)}
                  aria-label="סגור סל קניות"
                  className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center hover:border-primary/40 transition-colors"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
                <div className="flex items-center gap-2">
                  <span id="cart-title" className="font-display font-bold text-lg">הסל שלי</span>
                  <ShoppingBag className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {cartItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                    <ShoppingBag className="w-12 h-12 opacity-30" aria-hidden="true" />
                    <p className="text-sm">הסל ריק</p>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <motion.div key={item.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                      <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
                        <img src={item.imageUrl || FALLBACK_PRODUCT_IMG} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                        <div className="flex-1 min-w-0 text-right">
                          <div className="text-sm font-semibold truncate">{item.name}</div>
                          <div className="text-primary font-bold text-sm">₪{item.price}</div>
                          <div className="flex items-center gap-2 mt-1.5 justify-end">
                            <button
                              onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                              aria-label={`הוסף יחידה: ${item.name}`}
                              className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <span className="text-sm font-bold w-4 text-center" aria-label={`כמות: ${item.quantity}`}>{item.quantity}</span>
                            <button
                              onClick={() => item.quantity > 1 ? onUpdateQuantity(item.id, item.quantity - 1) : onRemoveFromCart(item.id)}
                              aria-label={item.quantity > 1 ? `הפחת יחידה: ${item.name}` : `הסר מהסל: ${item.name}`}
                              className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="px-5 pb-6 pt-3 border-t border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-lg">₪{total.toLocaleString()}</span>
                    <span className="text-muted-foreground text-sm">סה"כ</span>
                  </div>
                  <button onClick={() => { setCartOpen(false); onCheckout(); }} className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow inline-flex items-center justify-center gap-2">
                    לתשלום <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
