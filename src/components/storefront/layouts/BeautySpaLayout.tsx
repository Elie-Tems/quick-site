import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Star, Phone, MessageCircle, ArrowLeft, CalendarDays, ShoppingBag, Plus, Minus, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { StorefrontLayoutProps } from "./StorefrontLayout.types";
import { STOREFRONT_IMAGE_PLACEHOLDER } from "@/lib/storefrontPlaceholders";

const FALLBACK_HERO = STOREFRONT_IMAGE_PLACEHOLDER;
const FALLBACK_PRODUCT = STOREFRONT_IMAGE_PLACEHOLDER;

export default function BeautySpaLayout(props: StorefrontLayoutProps) {
  const {
    businessName, tagline, heroTitle, aboutText, heroImageUrl, promoText,
    logoUrl, phone, products, categories, banners, heroBenefits,
    cartItems, onAddToCart, onUpdateQuantity, onRemoveFromCart, onCheckout,
    selectedCategoryId, onSelectCategory, whatsappEnabled, reviewsCache, customLabels,
  } = props;

  const [cartOpen, setCartOpen] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);

  const heroImg = heroImageUrl || banners?.[0]?.imageUrl || FALLBACK_HERO;
  // Real banner images only - a "גלריית עבודות" (portfolio) section falling back to
  // stock photos of an unrelated salon would present someone else's work as this
  // business's own, a clear no-fake-data violation. Both sections that read
  // galleryImgs already hide themselves when it's empty (length > 0 / length > 1).
  const galleryImgs = banners.length > 1
    ? banners.slice(1).map(b => b.imageUrl!).filter(Boolean)
    : [];

  // A product with BOTH an image and a price used to match both filters and render
  // twice - once as an icon-only "service" card (no image, book-appointment CTA),
  // once as a photographed "shop" item (add-to-cart). Split strictly by whether a
  // photo exists: no photo -> bookable service, has a photo -> purchasable retail item.
  const services = products.filter(p => !p.imageUrl).slice(0, 6);
  const shopProducts = products.filter(p => !!p.imageUrl);

  const total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  const handleAdd = (p: typeof products[0]) => { onAddToCart(p); setCartOpen(true); };

  const whatsappUrl = phone
    ? `https://wa.me/972${phone.replace(/^0/, "")}?text=${encodeURIComponent("שלום, אשמח לקבוע תור")}`
    : "#";

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-background/85 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3">
          {logoUrl
            ? <img src={logoUrl} alt={businessName} className="h-9 w-auto object-contain" />
            : <span className="font-display font-bold text-lg">{businessName}</span>}
        </div>
        <div className="flex items-center gap-2">
          {whatsappEnabled && phone && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 text-white text-sm font-medium">
              <MessageCircle className="w-4 h-4" aria-hidden="true" /> קביעת תור
            </a>
          )}
          {!whatsappEnabled && phone && (
            <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
              <Phone className="w-4 h-4" aria-hidden="true" /> {phone}
            </a>
          )}
          <button
            onClick={() => setCartOpen(true)}
            aria-label={`סל קניות${itemCount > 0 ? `, ${itemCount} פריטים` : ""}`}
            className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-sm"
          >
            <ShoppingBag className="w-4 h-4" aria-hidden="true" />
            {itemCount > 0 && (
              <span aria-hidden="true" className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">{itemCount}</span>
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
      <section className="relative h-[80vh] min-h-[500px] overflow-hidden">
        <img src={heroImg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex items-end pb-14">
          <div className="max-w-5xl mx-auto px-4 md:px-6 w-full">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65 }}>
              <h1 className="text-4xl md:text-6xl font-display font-bold text-white mb-3">
                {heroTitle || businessName}
              </h1>
              {tagline && <p className="text-xl text-white/80 mb-6">{tagline}</p>}
              {heroBenefits && heroBenefits.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-7">
                  {heroBenefits.slice(0, 4).map((b, i) => (
                    <span key={i} className="px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-sm border border-white/25">{b}</span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <a href={whatsappEnabled && phone ? whatsappUrl : `tel:${phone}`} target={whatsappEnabled ? "_blank" : undefined} rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
                  <CalendarDays className="w-5 h-5" /> קביעת תור <ArrowLeft className="w-4 h-4" />
                </a>
                {shopProducts.length > 0 && (
                  <button onClick={() => document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })}
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl border border-white/30 bg-white/10 text-white font-medium backdrop-blur-sm hover:bg-white/20 transition-colors">
                    <ShoppingBag className="w-5 h-5" /> החנות שלנו
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Per-vertical experience (booking / listings) - right after the hero. */}
      {props.verticalSlot && <section className="py-8 px-4"><div className="max-w-5xl mx-auto">{props.verticalSlot}</div></section>}

      {/* SERVICES */}
      {services.length > 0 && (
        <section className="py-14 px-4 bg-muted/20">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">{customLabels?.productsTitle || "השירותים שלנו"}</h2>
            <p className="text-muted-foreground mb-8 text-sm">כל הטיפולים מבוצעים עם חומרים מקצועיים</p>
            <div className="grid md:grid-cols-2 gap-4">
              {services.map((s) => (
                <div key={s.id} className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Star className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{s.name}</div>
                    {s.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{s.description}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-bold text-primary text-lg">₪{s.price}</div>
                    {s.duration && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end mt-0.5">
                        <Clock className="w-3 h-3" /> {s.duration}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-center">
              <a href={whatsappEnabled && phone ? whatsappUrl : `tel:${phone}`} target={whatsappEnabled ? "_blank" : undefined} rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/30">
                <CalendarDays className="w-5 h-5" /> קבעו תור עכשיו
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ABOUT */}
      {aboutText && (
        <section className="py-14 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">{customLabels?.aboutTitle || "קצת עלינו"}</h2>
                <p className="text-muted-foreground leading-relaxed">{aboutText}</p>
              </div>
              {galleryImgs.length > 0 && (
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden">
                  <img src={galleryImgs[galleryIdx]} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  {galleryImgs.length > 1 && (
                    <>
                      <button onClick={() => setGalleryIdx(i => (i - 1 + galleryImgs.length) % galleryImgs.length)}
                        aria-label="תמונה קודמת"
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center">
                        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button onClick={() => setGalleryIdx(i => (i + 1) % galleryImgs.length)}
                        aria-label="תמונה הבאה"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center">
                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* GALLERY GRID */}
      {!aboutText && galleryImgs.length > 1 && (
        <section className="py-14 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-display font-bold mb-6">{customLabels?.galleryTitle || "גלריית עבודות"}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {galleryImgs.slice(0, 8).map((img, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden">
                  <img src={img} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* REVIEWS */}
      {reviewsCache && (reviewsCache.reviews || []).length > 0 && (
        <section className="py-14 px-4 bg-muted/20">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-display font-bold mb-6 text-center">מה אומרות הלקוחות</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {(reviewsCache.reviews || []).slice(0, 3).map((r, i) => (
                <div key={i} className="p-5 rounded-2xl border border-border bg-card">
                  <span aria-label={`דירוג: ${r.rating || 5} מתוך 5 כוכבים`} className="flex gap-0.5 mb-3">
                    {Array.from({ length: r.rating || 5 }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                    ))}
                  </span>
                  <p className="text-sm text-muted-foreground leading-relaxed">"{r.text}"</p>
                  <p className="mt-3 text-sm font-semibold">{r.author || "לקוח/ה"}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* SHOP */}
      {shopProducts.length > 0 && (
        <section id="shop" className="py-14 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">מוצרים לרכישה</h2>
            <p className="text-muted-foreground text-sm mb-6">מוצרי יופי מקצועיים לשימוש ביתי</p>
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {[{ id: null, name: "הכל" }, ...categories].map(c => (
                  <button key={c.id ?? "all"} onClick={() => onSelectCategory(c.id)}
                    className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${selectedCategoryId === c.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {shopProducts.map((p) => (
                <div key={p.id} className="rounded-2xl border border-border bg-card overflow-hidden group hover:border-primary/30 transition-colors">
                  <div className="aspect-square overflow-hidden">
                    <img src={p.imageUrl || FALLBACK_PRODUCT} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-semibold truncate">{p.name}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-primary font-bold">₪{p.price}</span>
                      <button onClick={() => handleAdd(p)} className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      </main>

      {/* FOOTER */}
      <footer className="py-10 px-4 bg-muted/30 border-t border-border text-center">
        <div className="font-display font-bold text-lg mb-1">{businessName}</div>
        {tagline && <div className="text-muted-foreground text-sm mb-4">{tagline}</div>}
        <div className="flex justify-center gap-3">
          {whatsappEnabled && phone && (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-medium">
              <MessageCircle className="w-4 h-4" aria-hidden="true" /> וואטסאפ
            </a>
          )}
          {phone && (
            <a href={`tel:${phone}`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-card border border-border text-sm">
              <Phone className="w-4 h-4" /> {phone}
            </a>
          )}
        </div>
      </footer>

      {/* CART DRAWER */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCartOpen(false)} />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="beauty-cart-title"
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm flex flex-col bg-background border-l border-border shadow-2xl"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <button onClick={() => setCartOpen(false)} aria-label="סגור סל קניות" className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center">
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
                <span id="beauty-cart-title" className="font-display font-bold text-lg">סל קניות</span>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {cartItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                    <ShoppingBag className="w-12 h-12 opacity-30" aria-hidden="true" /><p className="text-sm">הסל ריק</p>
                  </div>
                ) : cartItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                    <img src={item.imageUrl || FALLBACK_PRODUCT} alt={item.name} loading="lazy" decoding="async" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0 text-right">
                      <div className="text-sm font-semibold truncate">{item.name}</div>
                      <div className="text-primary font-bold text-sm">₪{item.price}</div>
                      <div className="flex items-center gap-2 mt-1 justify-end">
                        <button onClick={() => onUpdateQuantity(item.cartLineId ?? item.id, item.quantity + 1)} aria-label={`הוסף יחידה: ${item.name}`} className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><Plus className="w-3.5 h-3.5" aria-hidden="true" /></button>
                        <span className="text-sm font-bold w-4 text-center" aria-label={`כמות: ${item.quantity}`}>{item.quantity}</span>
                        <button onClick={() => item.quantity > 1 ? onUpdateQuantity(item.cartLineId ?? item.id, item.quantity - 1) : onRemoveFromCart(item.cartLineId ?? item.id)} aria-label={item.quantity > 1 ? `הפחת יחידה: ${item.name}` : `הסר מהסל: ${item.name}`} className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><Minus className="w-3.5 h-3.5" aria-hidden="true" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {cartItems.length > 0 && (
                <div className="px-5 pb-6 pt-3 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-lg">₪{total.toLocaleString()}</span>
                    <span className="text-muted-foreground text-sm">סה"כ</span>
                  </div>
                  <button onClick={() => { setCartOpen(false); onCheckout(); }} className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold">לתשלום</button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
