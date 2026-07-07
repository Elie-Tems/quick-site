import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, X, Plus, Minus, ArrowLeft, Flame, Tag, Heart, Instagram, Phone,
} from "lucide-react";
import { AuroraBg, Card, PreviewBanner, PreviewThemeRoot, StoreTopBar } from "@/components/preview-redesign/kit";

/** PREVIEW-ONLY boutique fashion store (Hebrew RTL). Sample data. */

const CATS = ["הכל", "שמלות", "חולצות", "מכנסיים", "אביזרים"];

const PRODUCTS = [
  { id: 1, name: "שמלת מקסי פרחונית", price: 299, cat: "שמלות", hot: false, img: "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?w=400&q=80" },
  { id: 2, name: "חולצת קשירה לבנה", price: 159, cat: "חולצות", hot: false, img: "https://images.unsplash.com/photo-1620799140188-3b2a02fd9a77?w=400&q=80" },
  { id: 3, name: "מכנסי רחב שחורים", price: 229, cat: "מכנסיים", hot: false, img: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&q=80" },
  { id: 4, name: "שמלת קוקטייל אדומה", price: 389, cat: "שמלות", hot: true, img: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&q=80" },
  { id: 5, name: "תיק עור קטן", price: 189, cat: "אביזרים", hot: false, img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80" },
  { id: 6, name: "חולצת פסים כחול-לבן", price: 139, cat: "חולצות", hot: false, img: "https://images.unsplash.com/photo-1554568218-0f1715e72254?w=400&q=80" },
];

type CartItem = { id: number; name: string; price: number; img: string; qty: number };

const BoutiqueSite = () => {
  const [cat, setCat] = useState("הכל");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const visible = PRODUCTS.filter((p) => cat === "הכל" || p.cat === cat);

  const addToCart = (p: (typeof PRODUCTS)[0]) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      if (existing) return prev.map((i) => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: p.id, name: p.name, price: p.price, img: p.img, qty: 1 }];
    });
    setCartOpen(true);
  };

  const setQty = (id: number, delta: number) => {
    setCart((prev) =>
      prev.flatMap((i) => {
        if (i.id !== id) return [i];
        const q = i.qty + delta;
        return q <= 0 ? [] : [{ ...i, qty: q }];
      })
    );
  };

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  return (
    <PreviewThemeRoot>
      <AuroraBg />
      <PreviewBanner title="בוטיק אופנה נשית - אתר לקוח לדוגמה" />
      <StoreTopBar
        name="בוטיק מיה"
        tagline="אופנה נשית · קולקציה חדשה"
        cta={
          <button
            onClick={() => setCartOpen(true)}
            className="relative inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium"
          >
            <ShoppingBag className="w-4 h-4" />
            סל קניות
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
        }
      />

      {/* HERO */}
      <section className="relative h-[72vh] min-h-[460px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=1600&q=80"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-6xl mx-auto px-4 md:px-6 w-full">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
              className="max-w-lg"
            >
              <h1 className="text-4xl md:text-6xl font-display font-bold text-white leading-[1.05] mb-4">
                סטייל שמתאים לך
              </h1>
              <p className="text-lg text-white/80 mb-7 max-w-sm">
                קולקציה חדשה הגיעה - שמלות, חולצות ועוד, במחירים שאוהבים.
              </p>
              <button
                onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow"
              >
                לקולקציה החדשה <ArrowLeft className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SALE BANNER */}
      <div className="bg-primary text-white text-center py-3 px-4 font-semibold text-sm tracking-wide flex items-center justify-center gap-2">
        <Tag className="w-4 h-4" />
        מבצע סוף עונה - 20% הנחה על הכל
        <Tag className="w-4 h-4" />
      </div>

      {/* PRODUCTS */}
      <section id="products" className="relative py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
            <div>
              <h2 className="text-2xl md:text-3xl font-display font-bold pv-strong">הקולקציה שלנו</h2>
              <p className="pv-muted text-sm mt-0.5">{visible.length} פריטים</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                    cat === c
                      ? "bg-primary text-white border-primary"
                      : "pv-surface2 pv-border pv-text hover:border-primary/40"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
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
                  <Card hover className="overflow-hidden group h-full flex flex-col">
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img
                        src={p.img}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {p.hot && (
                        <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500 text-white text-xs font-bold shadow-lg">
                          <Flame className="w-3.5 h-3.5" /> חם
                        </span>
                      )}
                      <button className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur border border-white/30 text-white flex items-center justify-center hover:bg-white/30 transition-colors">
                        <Heart className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-3 flex-1 flex flex-col">
                      <div className="text-sm font-semibold pv-strong leading-snug mb-1">{p.name}</div>
                      <div className="text-xs pv-muted mb-3">{p.cat}</div>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="font-display font-bold text-primary text-lg">₪{p.price}</span>
                        <button
                          onClick={() => addToCart(p)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-medium hover:brightness-110 transition-all active:scale-95"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" /> הוסף לסל
                        </button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative py-10 px-4 pv-surface2 border-t pv-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-right">
            <div className="font-display font-bold text-lg pv-strong">בוטיק מיה</div>
            <div className="pv-muted text-sm">אופנה נשית · קולקציה חדשה · משלוח חינם מ-₪299</div>
          </div>
          <div className="flex items-center gap-3">
            <a className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl pv-surface border pv-border pv-text text-sm cursor-pointer">
              <Instagram className="w-4 h-4" /> אינסטגרם
            </a>
            <a className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium cursor-pointer">
              <Phone className="w-4 h-4" /> יצירת קשר
            </a>
          </div>
        </div>
      </footer>

      {/* CART OVERLAY */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCartOpen(false)}
            />
            <motion.div
              className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-sm flex flex-col pv-bg border-r pv-border shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Cart header */}
              <div className="flex items-center justify-between px-5 py-4 border-b pv-border">
                <button onClick={() => setCartOpen(false)} className="w-9 h-9 rounded-xl pv-surface2 border pv-border flex items-center justify-center pv-text hover:border-primary/40 transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-lg pv-strong">הסל שלי</span>
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
              </div>

              {/* Cart items */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 pv-muted">
                    <ShoppingBag className="w-12 h-12 opacity-30" />
                    <p className="text-sm">הסל ריק</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                    >
                      <Card className="p-3 flex items-center gap-3">
                        <img src={item.img} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                        <div className="flex-1 min-w-0 text-right">
                          <div className="text-sm font-semibold pv-strong truncate">{item.name}</div>
                          <div className="text-primary font-bold text-sm">₪{item.price}</div>
                          <div className="flex items-center gap-2 mt-1.5 justify-end">
                            <button
                              onClick={() => setQty(item.id, 1)}
                              className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-sm font-bold pv-strong w-4 text-center">{item.qty}</span>
                            <button
                              onClick={() => setQty(item.id, -1)}
                              className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Cart footer */}
              {cart.length > 0 && (
                <div className="px-5 pb-6 pt-3 border-t pv-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold text-lg pv-strong">₪{total.toLocaleString()}</span>
                    <span className="pv-muted text-sm">סה"כ</span>
                  </div>
                  <button className="w-full py-3.5 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow inline-flex items-center justify-center gap-2">
                    לתשלום <ArrowLeft className="w-4 h-4" />
                  </button>
                  <p className="text-xs pv-muted text-center">משלוח חינם מ-₪299 · החזרות עד 30 יום</p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </PreviewThemeRoot>
  );
};

export default BoutiqueSite;
