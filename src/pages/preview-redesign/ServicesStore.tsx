import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Check, CalendarDays, Star, MapPin, Phone, ArrowLeft,
  ShoppingBag, Instagram, Sparkles, Heart,
} from "lucide-react";
import { AuroraBg, Card, Pill, PreviewBanner, PreviewThemeRoot, StoreTopBar } from "@/components/preview-redesign/kit";

/**
 * PREVIEW-ONLY full website for a service provider (makeup / nails).
 * One site with everything: תדמית (hero) + אודות (about + portfolio) +
 * מוצרים למכירה (products) + קביעת תורים (booking). Sample data.
 */

// ---- Products for sale -----------------------------------------------------
const PRODUCTS = [
  { name: "סרום לחות פנים", price: "₪149", img: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&q=80" },
  { name: "סט מברשות איפור", price: "₪189", img: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400&q=80" },
  { name: "לק ג'ל מקצועי", price: "₪45", img: "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?w=400&q=80" },
  { name: "שובר מתנה", price: "₪200", img: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80" },
];

// ---- Portfolio (about) -----------------------------------------------------
const PORTFOLIO = [
  "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=500&q=80",
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80",
  "https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500&q=80",
  "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&q=80",
];

// ---- Booking data ----------------------------------------------------------
const SERVICES = [
  { name: "איפור ערב", dur: "60 דק'", price: "₪350", desc: "איפור מלא לאירוע, כולל ריסים" },
  { name: "איפור כלה", dur: "90 דק'", price: "₪650", desc: "ניסיון + יום האירוע" },
  { name: "לק ג'ל", dur: "45 דק'", price: "₪120", desc: "כולל הסרה ועיצוב" },
  { name: "עיצוב גבות", dur: "30 דק'", price: "₪80", desc: "שעווה + מילוי" },
];
const DAYS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'"];
const DATES = [12, 13, 14, 15, 16, 17];
const SLOTS = ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30", "18:00", "19:30"];
const TAKEN = new Set(["12:00", "15:00"]);

const NavLink = ({ href, children }: { href: string; children: string }) => (
  <a href={href} className="hidden md:inline text-sm pv-text hover:text-primary transition-colors">{children}</a>
);

const ServicesStore = () => {
  const [service, setService] = useState(0);
  const [day, setDay] = useState(1);
  const [slot, setSlot] = useState<string | null>("16:30");

  return (
    <PreviewThemeRoot>
      <AuroraBg />
      <PreviewBanner title="נותני שירות - אתר מלא (צד לקוח)" />
      <StoreTopBar
        name="סטודיו יופי לדוגמה"
        tagline="איפור · לק ג'ל · עיצוב גבות"
        cta={
          <>
            <NavLink href="#about">אודות</NavLink>
            <NavLink href="#products">מוצרים</NavLink>
            <NavLink href="#booking">תורים</NavLink>
            <a href="#booking" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium">
              <CalendarDays className="w-4 h-4" /> קבעו תור
            </a>
          </>
        }
      />

      {/* ===== HERO / תדמית ===== */}
      <section className="relative h-[70vh] min-h-[440px] overflow-hidden">
        <img src="https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1600&q=80" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-6xl mx-auto px-4 md:px-6 w-full">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white text-sm mb-4">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> 4.9 · <MapPin className="w-4 h-4" /> תל אביב
              </div>
              <h1 className="text-4xl md:text-6xl font-display font-bold text-white leading-[1.05] mb-4">
                יופי שמרגישים<br /><span className="bg-gradient-to-l from-primary via-emerald-300 to-lime-300 bg-clip-text text-transparent">בפנים ובחוץ</span>
              </h1>
              <p className="text-lg text-white/80 mb-7 max-w-md">איפור, לק ג'ל ועיצוב גבות ברמה הגבוהה ביותר. קבעו תור אונליין תוך דקה.</p>
              <div className="flex flex-wrap gap-3">
                <a href="#booking" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
                  קבעו תור <ArrowLeft className="w-5 h-5" />
                </a>
                <a href="#products" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-white font-semibold hover:bg-white/20 transition-colors">
                  <ShoppingBag className="w-4 h-4" /> חנות המוצרים
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== ABOUT / אודות ===== */}
      <section id="about" className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full pv-surface2 border pv-border mb-5">
              <Heart className="w-4 h-4 text-primary" /> <span className="text-sm pv-text">קצת עלינו</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong mb-4">אמנות היופי, באהבה</h2>
            <p className="pv-text leading-relaxed mb-4">
              סטודיו יופי לדוגמה הוקם מתוך אהבה אמיתית לאנשים ולרגעים המיוחדים שלהם. אנחנו מלווים כלות,
              נשים לאירועים, ולקוחות קבועות - עם יחס אישי, מוצרים איכותיים ותשומת לב לכל פרט.
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {["יחס אישי", "מוצרים איכותיים", "סביבה נעימה", "זמינות גבוהה"].map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full pv-surface2 border pv-border text-sm pv-text">
                  <Check className="w-3.5 h-3.5 text-primary" /> {c}
                </span>
              ))}
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-primary font-medium hover:opacity-80">
              <Instagram className="w-4 h-4" /> עקבו אחרינו באינסטגרם
            </a>
          </div>
          {/* Portfolio gallery */}
          <div className="grid grid-cols-2 gap-3">
            {PORTFOLIO.map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className={`rounded-2xl overflow-hidden ${i === 0 ? "col-span-2" : ""}`}>
                <img src={p} alt="" className={`w-full object-cover hover:scale-105 transition-transform duration-500 ${i === 0 ? "h-48" : "h-36"}`} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRODUCTS / מוצרים למכירה ===== */}
      <section id="products" className="relative py-20 px-4 pv-surface2 border-y pv-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full pv-surface border pv-border mb-4">
                <ShoppingBag className="w-4 h-4 text-primary" /> <span className="text-sm pv-text">חנות המוצרים</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong">מוצרים למכירה</h2>
              <p className="pv-muted mt-1">המוצרים שאנחנו אוהבות ומשתמשות בהם</p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {PRODUCTS.map((p, i) => (
              <motion.div key={p.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                <Card hover className="overflow-hidden group">
                  <div className="relative aspect-square overflow-hidden">
                    <img src={p.img} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  </div>
                  <div className="p-3">
                    <div className="text-sm pv-strong font-medium truncate">{p.name}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-display font-bold text-primary">{p.price}</span>
                      <button className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center hover:brightness-110">
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BOOKING / קביעת תורים ===== */}
      <section id="booking" className="relative py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full pv-surface2 border pv-border mb-4">
              <Sparkles className="w-4 h-4 text-primary" /> <span className="text-sm pv-text">קביעת תור אונליין</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong">בחרו שירות ומועד</h2>
            <p className="pv-muted mt-1">פנוי עכשיו - קבעו תוך דקה, תקבלו תזכורת בוואטסאפ</p>
          </div>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Services list */}
            <div className="lg:col-span-3 space-y-3">
              {SERVICES.map((s, i) => (
                <button key={s.name} onClick={() => setService(i)} className="w-full text-right">
                  <Card hover className={`p-4 flex items-center gap-4 transition-all ${service === i ? "border-primary/50 ring-1 ring-primary/30" : ""}`}>
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${service === i ? "bg-primary text-white" : "bg-primary/15 text-primary"}`}>
                      {service === i ? <Check className="w-5 h-5" /> : <CalendarDays className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold pv-strong">{s.name}</div>
                      <div className="text-sm pv-muted flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> {s.dur} · {s.desc}</div>
                    </div>
                    <div className="font-display font-bold text-primary text-lg">{s.price}</div>
                  </Card>
                </button>
              ))}
            </div>

            {/* Booking panel */}
            <div className="lg:col-span-2">
              <Card className="p-5 lg:sticky lg:top-28">
                <h3 className="font-display font-bold text-lg pv-strong mb-4">בחרו מועד</h3>
                <div className="grid grid-cols-6 gap-1.5 mb-4">
                  {DAYS.map((d, i) => (
                    <button key={i} onClick={() => setDay(i)}
                      className={`py-2 rounded-xl border text-center transition-colors ${day === i ? "bg-primary text-white border-primary" : "pv-surface2 pv-border pv-text"}`}>
                      <div className="text-[11px] opacity-80">{d}</div>
                      <div className="text-sm font-bold">{DATES[i]}</div>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {SLOTS.map((t) => {
                    const taken = TAKEN.has(t);
                    const on = slot === t;
                    return (
                      <button key={t} disabled={taken} onClick={() => setSlot(t)}
                        className={`py-2 rounded-xl border text-sm font-medium transition-colors ${
                          taken ? "pv-surface2 pv-faint line-through cursor-not-allowed"
                            : on ? "bg-primary text-white border-primary"
                            : "pv-surface2 pv-border pv-text hover:border-primary/40"
                        }`}>
                        {t}
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-2xl pv-surface2 border pv-border p-4 mb-4">
                  <div className="flex justify-between text-sm mb-1"><span className="pv-muted">שירות</span><span className="pv-strong font-medium">{SERVICES[service].name}</span></div>
                  <div className="flex justify-between text-sm mb-1"><span className="pv-muted">מועד</span><span className="pv-strong font-medium">{slot ? `יום ${DAYS[day]} ${DATES[day]} · ${slot}` : "בחרו שעה"}</span></div>
                  <div className="flex justify-between text-sm"><span className="pv-muted">מקדמה</span><span className="text-primary font-bold">{SERVICES[service].price}</span></div>
                </div>
                <button className="w-full py-3.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow inline-flex items-center justify-center gap-2">
                  אישור וקביעת תור <ArrowLeft className="w-4 h-4" />
                </button>
                <p className="text-xs pv-muted text-center mt-3">תקבלו תזכורת בוואטסאפ יום לפני</p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ===== CONTACT FOOTER ===== */}
      <footer className="relative py-12 px-4 pv-surface2 border-t pv-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-right">
            <div className="font-display font-bold text-lg pv-strong">סטודיו יופי לדוגמה</div>
            <div className="pv-muted text-sm flex items-center gap-1.5 justify-center md:justify-start"><MapPin className="w-4 h-4" /> רחוב הדוגמה 10, תל אביב</div>
          </div>
          <div className="flex items-center gap-3">
            <a className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl pv-surface border pv-border pv-text text-sm"><Instagram className="w-4 h-4" /> אינסטגרם</a>
            <a className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium"><Phone className="w-4 h-4" /> 050-0000000</a>
          </div>
        </div>
      </footer>
    </PreviewThemeRoot>
  );
};

export default ServicesStore;
