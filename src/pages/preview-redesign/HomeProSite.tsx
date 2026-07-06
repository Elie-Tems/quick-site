import { motion } from "framer-motion";
import {
  Wrench, Hammer, Paintbrush, Zap, Droplets, ShieldCheck, Clock, Star,
  Phone, MessageCircle, ArrowLeft, Check, ThumbsUp,
} from "lucide-react";
import { AuroraBg, Card, Pill, PreviewBanner, PreviewThemeRoot, StoreTopBar } from "@/components/preview-redesign/kit";

/**
 * PREVIEW-ONLY full website for a home-service pro (renovations / handyman).
 * Lead engine: services + work gallery + trust + quote-request form. Sample data.
 */

const SERVICES = [
  { icon: Paintbrush, name: "צביעה וטיח", desc: "צביעת דירות, תיקוני טיח וגבס" },
  { icon: Droplets, name: "אינסטלציה", desc: "תיקון נזילות, החלפת ברזים וכלים" },
  { icon: Zap, name: "חשמל", desc: "נקודות חשמל, גופי תאורה, לוחות" },
  { icon: Hammer, name: "שיפוצים כלליים", desc: "חדרי אמבט, מטבחים, ריצוף" },
];

const WORK = [
  "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=600&q=80",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80",
  "https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=600&q=80",
  "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600&q=80",
];

const TRUST = [
  { icon: ShieldCheck, k: "אחריות מלאה", v: "על כל עבודה" },
  { icon: Clock, k: "זמינות מהירה", v: "מגיעים תוך 24 שעות" },
  { icon: ThumbsUp, k: "מחיר הוגן", v: "הצעת מחיר ללא התחייבות" },
  { icon: Star, k: "מקצוענות", v: "ניסיון של שנים" },
];

const REVIEWS = [
  { name: "משפחת א.", text: "עבודה נקייה ומקצועית, הגיעו בזמן והמחיר היה הוגן. ממליצים בחום!" },
  { name: "דנה כ.", text: "שיפצו לנו את חדר האמבט תוך שבוע, התוצאה מהממת. תודה!" },
  { name: "יוסי מ.", text: "אמינים וזמינים, פתרו לי נזילה שאף אחד לא הצליח. מקצוענים." },
];

const HomeProSite = () => (
  <PreviewThemeRoot>
    <AuroraBg />
    <PreviewBanner title="בעל מקצוע - אתר לידים (צד לקוח)" />
    <StoreTopBar
      name="שיפוצים ותיקונים לדוגמה"
      tagline="פתרון לכל בעיה בבית"
      cta={
        <>
          <a href="#services" className="hidden md:inline text-sm pv-text hover:text-primary transition-colors">שירותים</a>
          <a href="#work" className="hidden md:inline text-sm pv-text hover:text-primary transition-colors">עבודות</a>
          <a href="#quote" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium"><Phone className="w-4 h-4" /> הצעת מחיר</a>
        </>
      }
    />

    {/* HERO */}
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img src="https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=1600&q=80" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-l from-black/90 via-black/70 to-black/60" />
      </div>
      <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-xl text-center md:text-right mx-auto md:mx-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white text-sm mb-4">
            <Wrench className="w-4 h-4 text-primary" /> בעל מקצוע מורשה · אחריות מלאה
          </div>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white leading-[1.05] mb-4">
            הבית שלכם<br /><span className="bg-gradient-to-l from-primary via-emerald-300 to-lime-300 bg-clip-text text-transparent">בידיים טובות</span>
          </h1>
          <p className="text-lg text-white/80 mb-7 max-w-md mx-auto md:mx-0">שיפוצים, אינסטלציה, חשמל וצביעה - שירות אמין, מהיר ובמחיר הוגן. הצעת מחיר ללא התחייבות.</p>
          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            <a href="#quote" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
              קבלת הצעת מחיר <ArrowLeft className="w-5 h-5" />
            </a>
            <a className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-white font-semibold hover:bg-white/20 transition-colors">
              <MessageCircle className="w-4 h-4" /> וואטסאפ
            </a>
          </div>
        </motion.div>
      </div>
    </section>

    {/* TRUST BAR */}
    <section className="relative py-8 px-4 pv-surface2 border-b pv-border">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
        {TRUST.map((t, i) => (
          <motion.div key={t.k} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
            className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0"><t.icon className="w-5 h-5 text-primary" /></div>
            <div><div className="font-bold pv-strong text-sm">{t.k}</div><div className="text-xs pv-muted">{t.v}</div></div>
          </motion.div>
        ))}
      </div>
    </section>

    {/* SERVICES */}
    <section id="services" className="relative py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong">מה אנחנו עושים</h2>
          <p className="pv-muted mt-1">כל עבודה בבית - במקום אחד</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {SERVICES.map((s, i) => (
            <motion.div key={s.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
              <Card hover className="p-6 h-full">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center mb-4"><s.icon className="w-6 h-6 text-primary" /></div>
                <div className="font-bold pv-strong mb-1">{s.name}</div>
                <p className="text-sm pv-muted">{s.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* WORK GALLERY */}
    <section id="work" className="relative py-20 px-4 pv-surface2 border-y pv-border">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong mb-6">עבודות אחרונות</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-14">
          {WORK.map((w, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
              className="rounded-2xl overflow-hidden group">
              <img src={w} alt="" className="w-full h-44 object-cover transition-transform duration-500 group-hover:scale-105" />
            </motion.div>
          ))}
        </div>
        {/* Reviews */}
        <h3 className="text-2xl font-display font-bold pv-strong mb-5">לקוחות ממליצים</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {REVIEWS.map((r, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <Card className="p-5 h-full">
                <div className="flex gap-0.5 mb-2">{[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />)}</div>
                <p className="pv-text text-sm leading-relaxed mb-3">"{r.text}"</p>
                <div className="text-sm font-medium pv-strong">{r.name}</div>
              </Card>
            </motion.div>
          ))}
        </div>
        <p className="text-xs pv-faint mt-4">* המלצות להמחשה בלבד.</p>
      </div>
    </section>

    {/* QUOTE LEAD */}
    <section id="quote" className="relative py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-l from-primary/20 via-transparent to-emerald-500/10" />
          <Card className="relative p-8 md:p-10 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong mb-2">קבלו הצעת מחיר</h2>
            <p className="pv-muted mb-6">מלאו פרטים ונחזור אליכם עוד היום - ללא התחייבות</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-3 text-right">
              <div className="rounded-xl pv-surface2 border pv-border px-4 py-3 text-sm pv-faint">שם מלא</div>
              <div className="rounded-xl pv-surface2 border pv-border px-4 py-3 text-sm pv-faint">טלפון</div>
            </div>
            <div className="rounded-xl pv-surface2 border pv-border px-4 py-3 text-sm pv-faint mb-3 text-right">איזו עבודה צריך? (למשל: צביעת סלון)</div>
            <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
              שלחו בקשה <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 justify-center mt-4 text-sm pv-muted">
              <Check className="w-4 h-4 text-primary" /> תגובה מהירה · הצעה ללא עלות
            </div>
          </Card>
        </div>
      </div>
    </section>

    {/* FOOTER */}
    <footer className="relative py-10 px-4 pv-surface2 border-t pv-border">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="font-display font-bold pv-strong">שיפוצים ותיקונים לדוגמה</div>
        <div className="flex items-center gap-3">
          <a className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl pv-surface border pv-border pv-text text-sm"><MessageCircle className="w-4 h-4" /> וואטסאפ</a>
          <a className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium"><Phone className="w-4 h-4" /> 050-0000000</a>
        </div>
      </div>
    </footer>
  </PreviewThemeRoot>
);

export default HomeProSite;
