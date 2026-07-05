import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, BedDouble, Maximize, Flame, Phone, Search, X, Building2, Play, ArrowLeft,
} from "lucide-react";
import { AuroraBg, Card, Pill, PreviewBanner, PreviewThemeRoot, StoreTopBar } from "@/components/preview-redesign/kit";

/** PREVIEW-ONLY real-estate agent listings storefront. Sample data. */

const CATS = ["הכל", "מכירה", "השכרה", "מסחרי"];

const LISTINGS = [
  { id: 1, title: "דירת 4 חד' משופצת", city: "רמת גן", price: "₪2,450,000", rooms: 4, size: 98, cat: "מכירה", hot: true, img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80" },
  { id: 2, title: "פנטהאוז עם מרפסת", city: "תל אביב", price: "₪8,900 / חודש", rooms: 3, size: 85, cat: "השכרה", hot: false, img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80" },
  { id: 3, title: "חנות במרכז מסחרי", city: "פתח תקווה", price: "₪12,000 / חודש", rooms: 0, size: 60, cat: "מסחרי", hot: false, img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80" },
  { id: 4, title: "דירת גן 5 חד'", city: "הרצליה", price: "₪4,200,000", rooms: 5, size: 130, cat: "מכירה", hot: true, img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80" },
  { id: 5, title: "סטודיו מעוצב", city: "תל אביב", price: "₪5,400 / חודש", rooms: 1, size: 38, cat: "השכרה", hot: false, img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80" },
  { id: 6, title: "משרד מפואר", city: "רעננה", price: "₪1,850,000", rooms: 0, size: 75, cat: "מסחרי", hot: false, img: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&q=80" },
];

const RealEstateStore = () => {
  const [cat, setCat] = useState("הכל");
  const [open, setOpen] = useState<number | null>(null);
  const items = LISTINGS.filter((l) => cat === "הכל" || l.cat === cat);
  const active = LISTINGS.find((l) => l.id === open);

  return (
    <PreviewThemeRoot>
      <AuroraBg />
      <PreviewBanner title="נדל״ן מתווך - לוח דירות (צד לקוח)" />
      <StoreTopBar
        name="נדל״ן לדוגמה"
        tagline="מכירה · השכרה · מסחרי"
        cta={<a className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium"><Phone className="w-4 h-4" /> דברו עם סוכן</a>}
      />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header + filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold pv-strong">הנכסים שלנו</h1>
            <p className="pv-muted">{items.length} נכסים זמינים</p>
          </div>
          <div className="flex items-center gap-2 px-3 h-11 rounded-xl pv-surface2 border pv-border pv-muted text-sm max-w-xs w-full">
            <Search className="w-4 h-4" /> חיפוש לפי עיר, מחיר, חדרים...
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
          {items.map((l, i) => (
            <motion.button key={l.id} onClick={() => setOpen(l.id)} className="text-right"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card hover className="overflow-hidden group h-full">
                <div className="relative aspect-[16/11] overflow-hidden">
                  <img src={l.img} alt={l.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  {l.hot && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500 text-white text-xs font-bold shadow-lg">
                      <Flame className="w-3.5 h-3.5" /> מציאה
                    </span>
                  )}
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white text-xs">{l.cat}</span>
                  <div className="absolute bottom-3 right-3 text-white font-display font-bold text-lg">{l.price}</div>
                </div>
                <div className="p-4">
                  <div className="font-bold pv-strong mb-1">{l.title}</div>
                  <div className="flex items-center gap-3 text-sm pv-muted">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {l.city}</span>
                    {l.rooms > 0 && <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> {l.rooms}</span>}
                    <span className="flex items-center gap-1"><Maximize className="w-3.5 h-3.5" /> {l.size} מ״ר</span>
                  </div>
                </div>
              </Card>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Property detail modal */}
      <AnimatePresence>
        {active && (
          <motion.div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(null)} />
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl pv-bg border pv-border">
              <div className="relative h-56">
                <img src={active.img} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <button onClick={() => setOpen(null)} className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center"><X className="w-5 h-5" /></button>
                <button className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-primary/90 text-white flex items-center justify-center shadow-xl"><Play className="w-6 h-6" /></button>
                <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs">סיור וידאו + 360°</span>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="text-2xl font-display font-bold pv-strong">{active.title}</h2>
                    <div className="flex items-center gap-1 pv-muted text-sm"><MapPin className="w-4 h-4" /> {active.city}</div>
                  </div>
                  <div className="text-2xl font-display font-bold text-primary whitespace-nowrap">{active.price}</div>
                </div>
                <div className="flex gap-2 mb-4">
                  {active.rooms > 0 && <Pill tone="muted"><BedDouble className="w-3.5 h-3.5" /> {active.rooms} חד'</Pill>}
                  <Pill tone="muted"><Maximize className="w-3.5 h-3.5" /> {active.size} מ״ר</Pill>
                  <Pill tone="primary"><Building2 className="w-3.5 h-3.5" /> {active.cat}</Pill>
                  {active.hot && <Pill tone="amber"><Flame className="w-3.5 h-3.5" /> מציאה</Pill>}
                </div>
                <p className="pv-text text-sm leading-relaxed mb-5">
                  דירה מרווחת ומוארת, קרובה לכל השירותים, תחבורה ציבורית ופארק. מתאימה למשפחה או להשקעה. פרטים נוספים ותיאום ביקור מול הסוכן.
                </p>
                {/* Lead form (instead of cart) */}
                <div className="rounded-2xl pv-surface2 border pv-border p-4">
                  <div className="font-bold pv-strong mb-3">מעוניינים? השאירו פרטים</div>
                  <div className="grid sm:grid-cols-2 gap-2 mb-2">
                    <div className="rounded-xl pv-surface border pv-border px-3 py-2.5 text-sm pv-faint">שם מלא</div>
                    <div className="rounded-xl pv-surface border pv-border px-3 py-2.5 text-sm pv-faint">טלפון</div>
                  </div>
                  <button className="w-full py-3 rounded-xl bg-primary text-white font-bold inline-flex items-center justify-center gap-2">
                    תיאום ביקור <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PreviewThemeRoot>
  );
};

export default RealEstateStore;
