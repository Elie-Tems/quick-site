import { useState } from "react";
import { motion } from "framer-motion";
import {
  Star, MapPin, Users, Waves, Wifi, Car, Utensils, Bath, Flame, Wind,
  ArrowLeft, Phone, Check, CalendarDays,
} from "lucide-react";
import { AuroraBg, Card, Pill, PreviewBanner, PreviewThemeRoot, StoreTopBar } from "@/components/preview-redesign/kit";

/**
 * PREVIEW-ONLY vacation-rental / cabin (צימר) website. Gallery + units +
 * amenities + date-range availability booking. Sample data.
 */

const GALLERY = [
  "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800&q=80",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80",
  "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80",
  "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&q=80",
];

const UNITS = [
  { name: "בקתת יער", guests: 2, price: 850, img: "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=600&q=80" },
  { name: "סוויטת בריכה", guests: 4, price: 1250, img: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80" },
  { name: "וילה משפחתית", guests: 8, price: 2400, img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80" },
];

const AMENITIES = [
  { icon: Waves, label: "בריכה פרטית" },
  { icon: Bath, label: "ג'קוזי ספא" },
  { icon: Flame, label: "מנגל ופינת אש" },
  { icon: Wifi, label: "Wi-Fi מהיר" },
  { icon: Wind, label: "מיזוג מלא" },
  { icon: Utensils, label: "מטבח מאובזר" },
  { icon: Car, label: "חניה פרטית" },
  { icon: Users, label: "מתאים למשפחות" },
];

const REVIEWS = [
  { name: "משפחת לוי", text: "מקום גן עדן! נקי, מפנק, נוף מטורף. כבר קבענו שוב.", stars: 5 },
  { name: "רון ומיכל", text: "הבריכה הפרטית והג'קוזי עשו לנו את החופשה. שירות מדהים.", stars: 5 },
  { name: "דנה א.", text: "בדיוק מה שחיפשנו לסופ״ש רומנטי. ממליצים בחום.", stars: 5 },
];

// availability mini-calendar
const BOOKED = new Set([5, 6, 11, 12, 20, 21, 22]);
const SELECTED = { from: 14, to: 17 };
const NIGHTS = SELECTED.to - SELECTED.from;
const PER_NIGHT = 850;
const CLEANING = 150;

const VacationRentalSite = () => {
  const [unit, setUnit] = useState(0);

  return (
    <PreviewThemeRoot>
      <AuroraBg />
      <PreviewBanner title="צימר / דירת נופש - אתר מלא (צד לקוח)" />
      <StoreTopBar
        name="צימרי לדוגמה"
        tagline="בקתות בוטיק בגליל"
        cta={
          <>
            <a href="#gallery" className="hidden md:inline text-sm pv-text hover:text-primary transition-colors">גלריה</a>
            <a href="#units" className="hidden md:inline text-sm pv-text hover:text-primary transition-colors">יחידות</a>
            <a href="#book" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium"><CalendarDays className="w-4 h-4" /> בדקו זמינות</a>
          </>
        }
      />

      {/* HERO */}
      <section className="relative h-[68vh] min-h-[420px] overflow-hidden">
        <img src="https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=1600&q=80" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/40" />
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-6xl mx-auto px-4 md:px-6 w-full">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-xl">
              <div className="inline-flex items-center gap-3 text-white text-sm mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /> 4.95</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20"><MapPin className="w-4 h-4" /> ראש פינה, גליל עליון</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-display font-bold text-white leading-[1.05] mb-4">
                חופשה<br /><span className="bg-gradient-to-l from-primary via-emerald-300 to-lime-300 bg-clip-text text-transparent">בחיק הטבע</span>
              </h1>
              <p className="text-lg text-white/80 mb-7 max-w-md">בקתות בוטיק עם בריכה פרטית, ג'קוזי ונוף עוצר נשימה. הבריחה המושלמת מהעיר.</p>
              <a href="#book" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
                בדקו זמינות והזמינו <ArrowLeft className="w-5 h-5" />
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="relative py-16 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
          {GALLERY.map((g, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
              className={`rounded-2xl overflow-hidden group ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
              <img src={g} alt="" className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${i === 0 ? "h-full min-h-[240px]" : "h-40 md:h-full aspect-square"}`} />
            </motion.div>
          ))}
        </div>
      </section>

      {/* MAIN: description + amenities (left) + booking (right) */}
      <section id="book" className="relative py-8 px-4 pv-surface2 border-y pv-border">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <h2 className="text-2xl md:text-3xl font-display font-bold pv-strong mb-3">בקתת יער · עד 2 אורחים</h2>
            <p className="pv-text leading-relaxed mb-6">
              בקתת עץ מפנקת בלב היער, עם בריכה פרטית מחוממת, ג'קוזי זוגי, ומרפסת עם נוף להרים. מושלמת לחופשה רומנטית
              או בריחה שקטה מהשגרה. צ'ק-אין עצמאי, יחס אישי, וכל מה שצריך כדי פשוט להירגע.
            </p>
            <h3 className="font-display font-bold text-lg pv-strong mb-3">מה כלול</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {AMENITIES.map((a) => (
                <div key={a.label} className="flex items-center gap-2 p-3 rounded-2xl pv-surface border pv-border">
                  <a.icon className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm pv-text">{a.label}</span>
                </div>
              ))}
            </div>
            {/* Reviews */}
            <h3 className="font-display font-bold text-lg pv-strong mb-3 flex items-center gap-2"><Star className="w-5 h-5 text-amber-400 fill-amber-400" /> 4.95 · אורחים ממליצים</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {REVIEWS.map((r, i) => (
                <Card key={i} className="p-4">
                  <div className="flex gap-0.5 mb-2">{[...Array(r.stars)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}</div>
                  <p className="pv-text text-sm leading-relaxed mb-2">"{r.text}"</p>
                  <div className="text-xs font-medium pv-strong">{r.name}</div>
                </Card>
              ))}
            </div>
            <p className="text-xs pv-faint mt-2">* ביקורות להמחשה בלבד.</p>
          </div>

          {/* Booking card */}
          <div className="lg:col-span-2">
            <Card className="p-5 lg:sticky lg:top-28">
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-2xl font-display font-bold pv-strong">₪{PER_NIGHT}</span>
                <span className="pv-muted text-sm">/ לילה</span>
              </div>
              {/* mini calendar */}
              <div className="mb-4">
                <div className="text-sm font-medium pv-text mb-2 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" /> יולי 2026</div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {["א","ב","ג","ד","ה","ו","ש"].map((d) => <div key={d} className="text-[10px] pv-faint py-1">{d}</div>)}
                  {Array.from({ length: 30 }, (_, k) => k + 1).map((day) => {
                    const booked = BOOKED.has(day);
                    const inRange = day >= SELECTED.from && day <= SELECTED.to;
                    const edge = day === SELECTED.from || day === SELECTED.to;
                    return (
                      <div key={day}
                        className={`aspect-square rounded-lg text-xs flex items-center justify-center ${
                          booked ? "pv-faint line-through"
                            : edge ? "bg-primary text-white font-bold"
                            : inRange ? "bg-primary/20 text-primary"
                            : "pv-text hover:bg-primary/10 cursor-pointer"
                        }`}>
                        {day}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* range summary */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="rounded-xl pv-surface2 border pv-border p-2.5"><div className="text-[10px] pv-muted">צ'ק-אין</div><div className="text-sm font-bold pv-strong">14 ביולי</div></div>
                <div className="rounded-xl pv-surface2 border pv-border p-2.5"><div className="text-[10px] pv-muted">צ'ק-אאוט</div><div className="text-sm font-bold pv-strong">17 ביולי</div></div>
              </div>
              <div className="flex items-center justify-between rounded-xl pv-surface2 border pv-border p-2.5 mb-4">
                <span className="text-sm pv-text flex items-center gap-1.5"><Users className="w-4 h-4 pv-muted" /> אורחים</span>
                <span className="text-sm font-bold pv-strong">2</span>
              </div>
              {/* price breakdown */}
              <div className="space-y-1.5 mb-4 text-sm">
                <div className="flex justify-between pv-text"><span>₪{PER_NIGHT} × {NIGHTS} לילות</span><span>₪{(PER_NIGHT * NIGHTS).toLocaleString()}</span></div>
                <div className="flex justify-between pv-text"><span>ניקיון</span><span>₪{CLEANING}</span></div>
                <div className="flex justify-between font-bold pv-strong pt-2 border-t pv-border"><span>סה"כ</span><span className="text-primary">₪{(PER_NIGHT * NIGHTS + CLEANING).toLocaleString()}</span></div>
              </div>
              <button className="w-full py-3.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow inline-flex items-center justify-center gap-2">
                הזמינו עכשיו <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 justify-center mt-3 text-xs pv-muted"><Check className="w-3.5 h-3.5 text-primary" /> ביטול חינם עד 7 ימים לפני</div>
            </Card>
          </div>
        </div>
      </section>

      {/* UNITS */}
      <section id="units" className="relative py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-display font-bold pv-strong mb-6">היחידות שלנו</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {UNITS.map((u, i) => (
              <motion.button key={u.name} onClick={() => setUnit(i)} className="text-right"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                <Card hover className={`overflow-hidden h-full ${unit === i ? "ring-1 ring-primary/40 border-primary/40" : ""}`}>
                  <div className="relative aspect-[16/11] overflow-hidden">
                    <img src={u.img} alt={u.name} className="w-full h-full object-cover" />
                    <span className="absolute top-3 right-3"><Pill tone="primary"><Users className="w-3.5 h-3.5" /> עד {u.guests}</Pill></span>
                  </div>
                  <div className="p-4 flex items-center justify-between">
                    <div className="font-bold pv-strong">{u.name}</div>
                    <div className="font-display font-bold text-primary">₪{u.price}<span className="text-xs pv-muted font-normal"> /לילה</span></div>
                  </div>
                </Card>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative py-12 px-4 pv-surface2 border-t pv-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-right">
            <div className="font-display font-bold text-lg pv-strong">צימרי לדוגמה</div>
            <div className="pv-muted text-sm flex items-center gap-1.5 justify-center md:justify-start"><MapPin className="w-4 h-4" /> ראש פינה, גליל עליון</div>
          </div>
          <a className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium"><Phone className="w-4 h-4" /> 050-0000000</a>
        </div>
      </footer>
    </PreviewThemeRoot>
  );
};

export default VacationRentalSite;
