import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, Gauge, Calendar, Fuel, Cog, Flame, Phone, Search, X, ArrowLeft, ShieldCheck, MessageCircle,
} from "lucide-react";
import { AuroraBg, Card, Pill, PreviewBanner, PreviewThemeRoot, StoreTopBar } from "@/components/preview-redesign/kit";

/** PREVIEW-ONLY used-car dealer site (listings + filters + lead). Sample data. */

const CATS = ["הכל", "יד ראשונה", "משפחתי", "יוקרה", "ג'יפים"];

const CARS = [
  { id: 1, model: "טויוטה קורולה", year: 2021, km: "45,000", hand: "יד 1", gear: "אוטומט", fuel: "בנזין", price: "₪98,000", cat: "יד ראשונה", hot: true, img: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&q=80" },
  { id: 2, model: "מאזדה 3", year: 2020, km: "62,000", hand: "יד 2", gear: "אוטומט", fuel: "בנזין", price: "₪82,000", cat: "משפחתי", hot: false, img: "https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800&q=80" },
  { id: 3, model: "BMW X5", year: 2019, km: "88,000", hand: "יד 2", gear: "אוטומט", fuel: "דיזל", price: "₪245,000", cat: "יוקרה", hot: false, img: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80" },
  { id: 4, model: "קיה ספורטאז'", year: 2022, km: "28,000", hand: "יד 1", gear: "אוטומט", fuel: "היברידי", price: "₪135,000", cat: "ג'יפים", hot: true, img: "https://images.unsplash.com/photo-1533106418989-88406c7cc8ca?w=800&q=80" },
  { id: 5, model: "יונדאי i20", year: 2021, km: "39,000", hand: "יד 1", gear: "אוטומט", fuel: "בנזין", price: "₪72,000", cat: "משפחתי", hot: false, img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80" },
  { id: 6, model: "מרצדס C-Class", year: 2020, km: "54,000", hand: "יד 1", gear: "אוטומט", fuel: "בנזין", price: "₪198,000", cat: "יוקרה", hot: false, img: "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80" },
];

const CarDealerSite = () => {
  const [cat, setCat] = useState("הכל");
  const [open, setOpen] = useState<number | null>(null);
  const items = CARS.filter((c) => cat === "הכל" || c.cat === cat || (cat === "יד ראשונה" && c.hand === "יד 1"));
  const active = CARS.find((c) => c.id === open);

  return (
    <PreviewThemeRoot>
      <AuroraBg />
      <PreviewBanner title="סוחר רכב - לוח רכבים (צד לקוח)" />
      <StoreTopBar
        name="רכב לדוגמה"
        tagline="רכבים יד שנייה · בדוקים ואמינים"
        cta={<a className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium"><Phone className="w-4 h-4" /> דברו איתנו</a>}
      />

      {/* HERO */}
      <section className="relative h-56 md:h-72 overflow-hidden">
        <img src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1600&q=80" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-black/40" />
        <div className="absolute bottom-6 right-0 left-0 px-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-display font-bold text-white">הרכב הבא שלכם מחכה</h1>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-bold pv-strong">הרכבים שלנו</h2>
            <p className="pv-muted">{items.length} רכבים במלאי</p>
          </div>
          <div className="flex items-center gap-2 px-3 h-11 rounded-xl pv-surface2 border pv-border pv-muted text-sm max-w-xs w-full">
            <Search className="w-4 h-4" /> חיפוש לפי יצרן, דגם, מחיר...
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${cat === c ? "bg-primary text-white border-primary" : "pv-surface2 pv-border pv-text hover:border-primary/40"}`}>
              {c}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((c, i) => (
            <motion.button key={c.id} onClick={() => setOpen(c.id)} className="text-right"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card hover className="overflow-hidden group h-full">
                <div className="relative aspect-[16/11] overflow-hidden">
                  <img src={c.img} alt={c.model} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {c.hot && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500 text-white text-xs font-bold shadow-lg">
                      <Flame className="w-3.5 h-3.5" /> מחיר מציאה
                    </span>
                  )}
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white text-xs">{c.hand}</span>
                  <div className="absolute bottom-3 right-3 text-white font-display font-bold text-xl">{c.price}</div>
                </div>
                <div className="p-4">
                  <div className="font-bold pv-strong mb-1.5">{c.model}</div>
                  <div className="flex items-center gap-3 text-sm pv-muted flex-wrap">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {c.year}</span>
                    <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5" /> {c.km} ק"מ</span>
                    <span className="flex items-center gap-1"><Fuel className="w-3.5 h-3.5" /> {c.fuel}</span>
                  </div>
                </div>
              </Card>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Car detail modal */}
      <AnimatePresence>
        {active && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(null)} />
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl pv-bg border pv-border">
              <div className="relative h-60">
                <img src={active.img} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button onClick={() => setOpen(null)} className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center"><X className="w-5 h-5" /></button>
                {active.hot && <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500 text-white text-xs font-bold"><Flame className="w-3.5 h-3.5" /> מחיר מציאה</span>}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-2xl font-display font-bold pv-strong">{active.model}</h2>
                    <div className="pv-muted text-sm">{active.year} · {active.hand}</div>
                  </div>
                  <div className="text-2xl font-display font-bold text-primary whitespace-nowrap">{active.price}</div>
                </div>
                {/* Specs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
                  {[
                    { icon: Calendar, k: "שנה", v: active.year },
                    { icon: Gauge, k: "קילומטראז'", v: `${active.km}` },
                    { icon: Cog, k: "גיר", v: active.gear },
                    { icon: Fuel, k: "מנוע", v: active.fuel },
                  ].map((s) => (
                    <div key={s.k} className="rounded-2xl pv-surface2 border pv-border p-3 text-center">
                      <s.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                      <div className="text-sm font-bold pv-strong">{s.v}</div>
                      <div className="text-[11px] pv-muted">{s.k}</div>
                    </div>
                  ))}
                </div>
                <p className="pv-text text-sm leading-relaxed mb-5">
                  רכב במצב מצוין, מטופל בזמן, ללא תאונות. עבר בדיקה במכון מוסמך. ניתן לתאם נסיעת מבחן ובדיקה עצמאית. מימון והחלפה אפשריים.
                </p>
                <div className="rounded-2xl pv-surface2 border pv-border p-4">
                  <div className="font-bold pv-strong mb-3">מעוניינים? השאירו פרטים</div>
                  <div className="grid sm:grid-cols-2 gap-2 mb-2">
                    <div className="rounded-xl pv-surface border pv-border px-3 py-2.5 text-sm pv-faint">שם מלא</div>
                    <div className="rounded-xl pv-surface border pv-border px-3 py-2.5 text-sm pv-faint">טלפון</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="py-3 rounded-xl bg-primary text-white font-bold inline-flex items-center justify-center gap-2 text-sm">
                      תיאום נסיעת מבחן <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button className="py-3 rounded-xl pv-surface border pv-border pv-text font-medium inline-flex items-center justify-center gap-2 text-sm">
                      <MessageCircle className="w-4 h-4" /> וואטסאפ
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PreviewThemeRoot>
  );
};

export default CarDealerSite;
