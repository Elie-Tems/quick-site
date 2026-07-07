import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, BedDouble, Maximize, Flame, Phone, Search, X, Building2, Play, ArrowLeft,
  Star, Award, Check, MessageCircle, Home,
} from "lucide-react";
import { AuroraBg, Card, Pill, PreviewBanner, PreviewThemeRoot, StoreTopBar } from "@/components/preview-redesign/kit";

/**
 * PREVIEW-ONLY full website for a real-estate agent. A complete site:
 * personal branding (photo + about) + areas of expertise + listings board
 * (filters, hot deals, property page with lead form). Sample data.
 */

const CATS = ["הכל", "מכירה", "השכרה", "מסחרי"];

const LISTINGS = [
  { id: 1, title: "דירת 4 חד' משופצת", city: "רמת גן", price: "₪2,450,000", rooms: 4, size: 98, cat: "מכירה", hot: true, img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80" },
  { id: 2, title: "פנטהאוז עם מרפסת", city: "תל אביב", price: "₪8,900 / חודש", rooms: 3, size: 85, cat: "השכרה", hot: false, img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80" },
  { id: 3, title: "חנות במרכז מסחרי", city: "פתח תקווה", price: "₪12,000 / חודש", rooms: 0, size: 60, cat: "מסחרי", hot: false, img: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80" },
  { id: 4, title: "דירת גן 5 חד'", city: "הרצליה", price: "₪4,200,000", rooms: 5, size: 130, cat: "מכירה", hot: true, img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80" },
  { id: 5, title: "סטודיו מעוצב", city: "תל אביב", price: "₪5,400 / חודש", rooms: 1, size: 38, cat: "השכרה", hot: false, img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80" },
  { id: 6, title: "משרד מפואר", city: "רעננה", price: "₪1,850,000", rooms: 0, size: 75, cat: "מסחרי", hot: false, img: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800&q=80" },
];

const AGENT_IMG = "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&q=80";

const RealEstateStore = () => {
  const [cat, setCat] = useState("הכל");
  const [open, setOpen] = useState<number | null>(null);
  const items = LISTINGS.filter((l) => cat === "הכל" || l.cat === cat);
  const active = LISTINGS.find((l) => l.id === open);

  return (
    <PreviewThemeRoot>
      <AuroraBg />
      <PreviewBanner title="נדל״ן מתווך - אתר מלא (צד לקוח)" />
      <StoreTopBar
        name="ישראל ישראלי · נדל״ן"
        tagline="מתווך מוסמך · גוש דן"
        cta={
          <>
            <a href="#about" className="hidden md:inline text-sm pv-text hover:text-primary transition-colors">אודות</a>
            <a href="#listings" className="hidden md:inline text-sm pv-text hover:text-primary transition-colors">נכסים</a>
            <a className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium"><Phone className="w-4 h-4" /> צרו קשר</a>
          </>
        }
      />

      {/* ===== AGENT HERO / תדמית אישית ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1600&q=80" alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-l from-black/85 via-black/60 to-black/80" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-20 grid md:grid-cols-[auto_1fr] gap-8 items-center">
          {/* Photo */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}
            className="justify-self-center">
            <div className="relative">
              <div className="absolute -inset-3 bg-primary/30 rounded-3xl blur-2xl" />
              <img src={AGENT_IMG} alt="ישראל ישראלי" className="relative w-44 h-44 md:w-56 md:h-56 rounded-3xl object-cover border-2 border-white/20 shadow-2xl" />
              <span className="absolute -bottom-3 right-1/2 translate-x-1/2 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-bold shadow-lg whitespace-nowrap">
                <Star className="w-3.5 h-3.5 fill-white" /> 4.9 · 120+ עסקאות
              </span>
            </div>
          </motion.div>
          {/* Text */}
          <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-center md:text-right">
            <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-3">ישראל ישראלי</h1>
            <p className="text-lg text-white/80 mb-6 max-w-lg mx-auto md:mx-0">
              מלווה משפחות למצוא את הבית שלהן בגוש דן כבר למעלה מעשור. ליווי אישי, אמין ומקצועי מהחיפוש ועד המסירה.
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <a href="#listings" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
                <Home className="w-5 h-5" /> לנכסים שלי
              </a>
              <a className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-white font-semibold hover:bg-white/20 transition-colors">
                <MessageCircle className="w-4 h-4" /> וואטסאפ
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== ABOUT / אודות ===== */}
      <section id="about" className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full pv-surface2 border pv-border mb-5">
              <Award className="w-4 h-4 text-primary" /> <span className="text-sm pv-text">קצת עליי</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong mb-4">למה לעבוד איתי?</h2>
            <p className="pv-text leading-relaxed mb-5">
              אני מאמין שקנייה או מכירה של נכס היא אחת ההחלטות הגדולות בחיים - ולכן היא ראויה ליחס אישי, שקיפות מלאה
              וזמינות אמיתית. אני מכיר כל שכונה, כל בניין וכל מגמת מחירים, ואדאג שתקבלו את העסקה הנכונה בשבילכם.
            </p>
            <div className="space-y-2.5">
              {["ליווי אישי מהחיפוש ועד המסירה", "היכרות עמוקה עם אזורי גוש דן", "שקיפות מלאה ומחירים אמיתיים", "זמינות בוואטסאפ בכל שעה"].map((b) => (
                <div key={b} className="flex items-center gap-2.5 pv-text">
                  <span className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5 text-primary" /></span>
                  {b}
                </div>
              ))}
            </div>
          </div>
          {/* Areas of expertise */}
          <Card className="p-6">
            <h3 className="font-display font-bold text-lg pv-strong mb-4">אזורי התמחות</h3>
            <div className="flex flex-wrap gap-2 mb-6">
              {["תל אביב", "רמת גן", "גבעתיים", "הרצליה", "רעננה", "פתח תקווה"].map((a) => (
                <span key={a} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full pv-surface2 border pv-border text-sm pv-text">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> {a}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[["12+", "שנות ניסיון"], ["120+", "עסקאות"], ["4.9", "דירוג"]].map(([k, v]) => (
                <div key={v} className="rounded-2xl pv-surface2 border pv-border p-4">
                  <div className="text-2xl font-display font-bold text-primary">{k}</div>
                  <div className="text-xs pv-muted mt-1">{v}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* ===== LISTINGS / הנכסים ===== */}
      <section id="listings" className="relative py-16 px-4 pv-surface2 border-y pv-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong">הנכסים שלי</h2>
              <p className="pv-muted">{items.length} נכסים זמינים</p>
            </div>
            <div className="flex items-center gap-2 px-3 h-11 rounded-xl pv-surface border pv-border pv-muted text-sm max-w-xs w-full">
              <Search className="w-4 h-4" /> חיפוש לפי עיר, מחיר, חדרים...
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {CATS.map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${cat === c ? "bg-primary text-white border-primary" : "pv-surface pv-border pv-text hover:border-primary/40"}`}>
                {c}
              </button>
            ))}
          </div>

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
      </section>

      {/* ===== CONTACT FOOTER ===== */}
      <footer className="relative py-12 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={AGENT_IMG} alt="" className="w-12 h-12 rounded-2xl object-cover" />
            <div>
              <div className="font-display font-bold pv-strong">ישראל ישראלי · נדל״ן</div>
              <div className="pv-muted text-sm">מתווך מוסמך · גוש דן</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl pv-surface2 border pv-border pv-text text-sm"><MessageCircle className="w-4 h-4" /> וואטסאפ</a>
            <a className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium"><Phone className="w-4 h-4" /> 050-0000000</a>
          </div>
        </div>
      </footer>

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
                <div className="flex gap-2 mb-4 flex-wrap">
                  {active.rooms > 0 && <Pill tone="muted"><BedDouble className="w-3.5 h-3.5" /> {active.rooms} חד'</Pill>}
                  <Pill tone="muted"><Maximize className="w-3.5 h-3.5" /> {active.size} מ״ר</Pill>
                  <Pill tone="primary"><Building2 className="w-3.5 h-3.5" /> {active.cat}</Pill>
                  {active.hot && <Pill tone="amber"><Flame className="w-3.5 h-3.5" /> מציאה</Pill>}
                </div>
                <p className="pv-text text-sm leading-relaxed mb-5">
                  דירה מרווחת ומוארת, קרובה לכל השירותים, תחבורה ציבורית ופארק. מתאימה למשפחה או להשקעה. פרטים נוספים ותיאום ביקור מול הסוכן.
                </p>
                <div className="rounded-2xl pv-surface2 border pv-border p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <img src={AGENT_IMG} alt="" className="w-10 h-10 rounded-xl object-cover" />
                    <div className="text-sm"><div className="font-bold pv-strong">ישראל ישראלי</div><div className="pv-muted text-xs">מתווך מוסמך</div></div>
                  </div>
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
