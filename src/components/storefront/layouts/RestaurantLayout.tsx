import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, X, Plus, Minus, MessageCircle, Phone, ArrowLeft, UtensilsCrossed } from "lucide-react";
import type { StorefrontLayoutProps } from "./StorefrontLayout.types";
import { STOREFRONT_IMAGE_PLACEHOLDER } from "@/lib/storefrontPlaceholders";

const FALLBACK_HERO = STOREFRONT_IMAGE_PLACEHOLDER;
const FALLBACK_ITEM_IMG = STOREFRONT_IMAGE_PLACEHOLDER;

export default function RestaurantLayout(props: StorefrontLayoutProps) {
  const {
    businessName, tagline, heroTitle, aboutText, heroImageUrl, heroBenefits, promoText,
    logoUrl, phone, products, categories, banners,
    cartItems, onAddToCart, onUpdateQuantity, onRemoveFromCart,
    onCheckout, whatsappEnabled, customLabels, verticalSlot,
  } = props;

  const [cartOpen, setCartOpen] = useState(false);
  const openCartBtnRef = useRef<HTMLButtonElement>(null);
  const closeCartBtnRef = useRef<HTMLButtonElement>(null);

  const heroImg = heroImageUrl || banners?.[0]?.imageUrl || FALLBACK_HERO;
  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const whatsappUrl = phone
    ? `https://wa.me/972${phone.replace(/^0/, "")}?text=${encodeURIComponent("שלום, אשמח לשאול על התפריט")}`
    : "#";

  // Group products by category
  const menuSections = categories.length > 0
    ? categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        items: products.filter(p => p.categoryId === cat.id),
      })).filter(s => s.items.length > 0)
    : [{ id: null, name: customLabels?.productsTitle || "התפריט", items: products }];

  useEffect(() => {
    if (cartOpen) closeCartBtnRef.current?.focus();
    else openCartBtnRef.current?.focus();
  }, [cartOpen]);

  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setCartOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cartOpen]);

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      {/* HEADER */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3">
          {logoUrl
            ? <img src={logoUrl} alt={businessName} className="h-9 w-auto object-contain" />
            : <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-5 h-5 text-primary" aria-hidden="true" />
                <span className="font-display font-bold text-lg">{businessName}</span>
              </div>}
          {tagline && <span className="hidden md:block text-sm text-muted-foreground">{tagline}</span>}
        </div>
        <div className="flex items-center gap-2">
          {whatsappEnabled && phone && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border text-sm">
              <MessageCircle className="w-4 h-4" aria-hidden="true" /> WhatsApp
            </a>
          )}
          <button
            ref={openCartBtnRef}
            onClick={() => setCartOpen(true)}
            aria-label={`סל הזמנה${itemCount > 0 ? `, ${itemCount} פריטים` : ""}`}
            className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            הזמנה
            {itemCount > 0 && (
              <span aria-hidden="true" className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {promoText && (
        <div className="bg-primary text-primary-foreground text-center py-2.5 px-4 text-sm font-semibold">
          {promoText}
        </div>
      )}

      <main>
        {/* HERO */}
        <section className="relative h-[55vh] min-h-[340px] overflow-hidden">
          <img src={heroImg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" aria-hidden="true" />
          <div className="absolute inset-0 flex items-end pb-10 px-6 max-w-3xl mx-auto w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <h1 className="text-3xl md:text-5xl font-display font-bold text-white leading-tight mb-2">
                {heroTitle || businessName}
              </h1>
              {tagline && <p className="text-white/80 text-lg mb-3">{tagline}</p>}
              {heroBenefits && heroBenefits.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {heroBenefits.slice(0, 4).map((b, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs border border-white/25">{b}</span>
                  ))}
                </div>
              )}
              <a href="#menu"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
                לתפריט <ArrowLeft className="w-4 h-4" />
              </a>
            </motion.div>
          </div>
        </section>

        {/* VERTICAL SLOT (booking widget etc.) */}
        {verticalSlot && (
          <div className="max-w-4xl mx-auto px-4 py-8">
            {verticalSlot}
          </div>
        )}

        {/* CATEGORY NAV */}
        {menuSections.length > 1 && (
          <nav className="sticky top-[57px] z-20 bg-background/95 backdrop-blur border-b border-border overflow-x-auto" aria-label="קטגוריות תפריט">
            <div className="flex gap-1 px-4 py-2 min-w-max">
              {menuSections.map(s => (
                <a key={String(s.id)} href={`#cat-${s.id}`}
                  className="px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap bg-muted hover:bg-primary hover:text-primary-foreground transition-colors">
                  {s.name}
                </a>
              ))}
            </div>
          </nav>
        )}

        {/* MENU SECTIONS */}
        <div id="menu" className="max-w-4xl mx-auto px-4 py-10 space-y-12">
          {products.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <UtensilsCrossed className="w-10 h-10 mx-auto mb-3 opacity-40" aria-hidden="true" />
              <p>התפריט יתעדכן בקרוב</p>
            </div>
          ) : menuSections.map((section, si) => (
            <section key={String(section.id)} id={`cat-${section.id}`}>
              <h2 className="text-2xl font-display font-bold mb-6 pb-2 border-b border-border">{section.name}</h2>
              <div className="space-y-3">
                {section.items.map((item, ii) => {
                  const cartEntry = cartItems.find(c => c.id === item.id);
                  const qty = cartEntry?.quantity ?? 0;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: ii * 0.04 }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-colors"
                    >
                      {/* Item image */}
                      <div className="shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted">
                        <img
                          src={item.imageUrl || FALLBACK_ITEM_IMG}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground truncate">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{item.description}</div>
                        )}
                        <div className="font-bold text-primary mt-1">₪{item.price.toLocaleString()}</div>
                      </div>

                      {/* Qty control */}
                      <div className="shrink-0">
                        {qty === 0 ? (
                          <button
                            onClick={() => { onAddToCart(item); setCartOpen(true); }}
                            aria-label={`הוסף ${item.name} להזמנה`}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                          >
                            <Plus className="w-4 h-4" /> הוסף
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onUpdateQuantity(cartEntry?.cartLineId ?? item.id, qty - 1)}
                              aria-label={`הפחת כמות של ${item.name}`}
                              className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center font-bold text-sm" aria-live="polite">{qty}</span>
                            <button
                              onClick={() => onAddToCart(item)}
                              aria-label={`הוסף עוד ${item.name}`}
                              className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* ABOUT */}
        {aboutText && (
          <section className="bg-muted/30 border-t border-border py-14 px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-2xl font-display font-bold mb-3">אודות</h2>
              <p className="text-muted-foreground leading-relaxed">{aboutText}</p>
            </div>
          </section>
        )}

        {/* CONTACT */}
        {phone && (
          <section className="py-10 px-4 border-t border-border">
            <div className="max-w-sm mx-auto flex flex-col gap-3">
              {whatsappEnabled && (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500 text-white font-semibold">
                  <MessageCircle className="w-5 h-5" /> הזמנות ב-WhatsApp
                </a>
              )}
              <a href={`tel:${phone}`}
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-card border border-border font-medium">
                <Phone className="w-4 h-4" /> {phone}
              </a>
            </div>
          </section>
        )}
      </main>

      {/* FOOTER */}
      <footer className="py-8 px-4 border-t border-border text-center text-sm text-muted-foreground">
        <div className="font-display font-bold text-base text-foreground mb-1">{businessName}</div>
        {tagline && <div>{tagline}</div>}
      </footer>

      {/* CART DRAWER */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="סל הזמנה">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCartOpen(false)} />
          <aside className="relative mr-auto w-full max-w-sm bg-background border-l border-border flex flex-col h-full shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <h2 className="font-display font-bold text-lg">סל הזמנה</h2>
              <button ref={closeCartBtnRef} onClick={() => setCartOpen(false)} aria-label="סגור סל" className="p-2 rounded-lg hover:bg-muted">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {cartItems.length === 0 && (
                <div className="py-12 text-center text-muted-foreground text-sm">הסל ריק</div>
              )}
              {cartItems.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.name}</div>
                    <div className="text-sm text-muted-foreground">₪{item.price} × {item.quantity}</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onUpdateQuantity(item.cartLineId ?? item.id, item.quantity - 1)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => onAddToCart({ id: item.id, name: item.name, price: item.price, imageUrl: item.imageUrl, description: item.description, categoryId: item.categoryId, inStock: true } as any)} className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-sm font-bold w-16 text-left">₪{(item.price * item.quantity).toLocaleString()}</div>
                </div>
              ))}
            </div>

            {cartItems.length > 0 && (
              <div className="px-4 py-4 border-t border-border space-y-3">
                <div className="flex justify-between font-bold text-lg">
                  <span>סה"כ</span>
                  <span>₪{total.toLocaleString()}</span>
                </div>
                <button onClick={onCheckout} className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-lg shadow-primary/25 hover:opacity-90 transition-opacity">
                  להזמנה ←
                </button>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
