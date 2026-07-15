import { motion } from "framer-motion";
import {
  Dumbbell, Activity, HeartPulse, Flame, Zap, Bike, Sparkles, Users, Clock,
  ShieldCheck, Star, Phone, MessageCircle, ArrowLeft, Check, CalendarDays, Trophy,
} from "lucide-react";
import { AuroraBg, Card, Pill, PreviewBanner, PreviewThemeRoot, StoreTopBar } from "@/components/preview-redesign/kit";

/**
 * PREVIEW-ONLY full website for a fitness studio / gym (חדר כושר / סטודיו).
 * Engine: membership plans + weekly class schedule + personal-trainer booking +
 * trust + join-lead form. Sample data only - no Supabase, illustrative content.
 */

const TRUST = [
  { icon: ShieldCheck, k: "מאמנים מוסמכים", v: "צוות מקצועי ומנוסה" },
  { icon: Clock, k: "פתוח 6:00-23:00", v: "7 ימים בשבוע" },
  { icon: Dumbbell, k: "ציוד חדיש", v: "מכונות ומשקולות חופשיות" },
  { icon: Users, k: "קהילה תומכת", v: "מתאמנים לצידך" },
];

const PLANS = [
  {
    name: "חודשי", price: "199", note: "ללא התחייבות", highlight: false,
    features: ["גישה חופשית לחדר הכושר", "כל שיעורי הסטודיו", "ליווי בבניית תוכנית אימון"],
  },
  {
    name: "3 חודשים", price: "169", note: "הפופולרי ביותר", highlight: true,
    features: ["כל מה שבמנוי החודשי", "מדידת הרכב גוף חודשית", "הקפאת מנוי עד שבועיים", "2 אימוני מאמן אישי במתנה"],
  },
  {
    name: "שנתי", price: "129", note: "החיסכון הגדול", highlight: false,
    features: ["כל מה שבמנוי 3 חודשים", "כניסת אורח פעם בחודש", "גישה חופשית לסאונה", "תוסף תזונה במתנה"],
  },
];

const CLASSES = [
  { icon: Bike, name: "ספינינג", when: "א' · 18:00", coach: "רוני", level: "כל הרמות" },
  { icon: Sparkles, name: "יוגה", when: "ב' · 07:00", coach: "מאיה", level: "מתחילים" },
  { icon: Activity, name: "TRX", when: "ג' · 19:30", coach: "עידן", level: "מתקדם" },
  { icon: HeartPulse, name: "פילאטיס", when: "ד' · 09:00", coach: "נועה", level: "כל הרמות" },
  { icon: Flame, name: "קרוספיט", when: "ה' · 20:00", coach: "דניאל", level: "מתקדם" },
  { icon: Zap, name: "זומבה", when: "ו' · 10:00", coach: "שירן", level: "כל הרמות" },
];

const TRAINERS = [
  { name: "רוני לוי", role: "מאמן כוח וכושר", spec: "בניית מסה · ירידה במשקל", img: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=80" },
  { name: "מאיה כהן", role: "מאמנת יוגה ופילאטיס", spec: "גמישות · יציבה · נשימה", img: "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=500&q=80" },
  { name: "עידן ברק", role: "מאמן פונקציונלי", spec: "TRX · קרוספיט · ספורטאים", img: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&q=80" },
];

const REVIEWS = [
  { name: "אורי ט.", text: "3 חודשים וירדתי 8 קילו. המאמנים דוחפים בדיוק כמה שצריך. מקום מנצח!" },
  { name: "לירז מ.", text: "האווירה מדהימה, השיעורים כיף אמיתי ותמיד מלאים אנרגיה. לא מתחלפת." },
  { name: "בן ש.", text: "ציוד חדש ונקי, ומאמן אישי שבנה לי תוכנית מותאמת. שווה כל שקל." },
];

const FitnessSite = () => (
  <PreviewThemeRoot>
    <AuroraBg />
    <PreviewBanner title="סטודיו כושר - אתר מנויים (צד לקוח)" />
    <StoreTopBar
      name="סטודיו כושר לדוגמה"
      tagline="הגוף שרצית מתחיל כאן"
      cta={
        <>
          <a href="#plans" className="hidden md:inline text-sm pv-text hover:text-primary transition-colors">מנויים</a>
          <a href="#schedule" className="hidden md:inline text-sm pv-text hover:text-primary transition-colors">לוח שיעורים</a>
          <a href="#join" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium"><Flame className="w-4 h-4" /> הצטרפות</a>
        </>
      }
    />

    {/* HERO */}
    <section className="relative overflow-hidden">
      <div className="absolute inset-0">
        <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-l from-black/90 via-black/70 to-black/55" />
      </div>
      <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-20 md:py-28">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-xl text-center md:text-right mx-auto md:mx-0">
          <Pill tone="primary">שיעור ניסיון ראשון - חינם</Pill>
          <h1 className="text-4xl md:text-6xl font-display font-bold text-white leading-[1.05] mt-4 mb-4">
            הגוף שרצית<br /><span className="bg-gradient-to-l from-primary via-emerald-300 to-lime-300 bg-clip-text text-transparent">מתחיל כאן</span>
          </h1>
          <p className="text-lg text-white/80 mb-7 max-w-md mx-auto md:mx-0">חדר כושר, שיעורי סטודיו ומאמנים אישיים - הכל תחת קורת גג אחת. בוא להתחיל, אנחנו נדאג לתוצאות.</p>
          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            <a href="#join" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
              קבעו שיעור ניסיון <ArrowLeft className="w-5 h-5" />
            </a>
            <a href="#plans" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 backdrop-blur border border-white/20 text-white font-semibold hover:bg-white/20 transition-colors">
              <Trophy className="w-4 h-4" /> תוכניות מנוי
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

    {/* MEMBERSHIP PLANS */}
    <section id="plans" className="relative py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong">בחרו מנוי</h2>
          <p className="pv-muted mt-1">בלי דמי הרשמה · ניתן להקפיא · ביטול בכל עת</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 items-start">
          {PLANS.map((p, i) => (
            <motion.div key={p.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <Card className={`p-7 h-full relative ${p.highlight ? "border-primary/50 ring-1 ring-primary/30" : ""}`}>
                {p.highlight && (
                  <span className="absolute -top-3 right-6"><Pill tone="primary">{p.note}</Pill></span>
                )}
                <div className="font-display font-bold pv-strong text-xl mb-1">{p.name}</div>
                {!p.highlight && <div className="text-xs pv-muted mb-3">{p.note}</div>}
                {p.highlight && <div className="h-2" />}
                <div className="flex items-end gap-1 mb-5">
                  <span className="text-4xl font-extrabold pv-strong">₪{p.price}</span>
                  <span className="text-sm pv-muted mb-1">/ לחודש</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm pv-text">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <a href="#join" className={`w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                  p.highlight ? "bg-primary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50" : "pv-surface2 border pv-border pv-strong hover:border-primary/40"
                }`}>
                  הצטרפות <ArrowLeft className="w-4 h-4" />
                </a>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* CLASS SCHEDULE */}
    <section id="schedule" className="relative py-20 px-4 pv-surface2 border-y pv-border">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
          <div>
            <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong">לוח שיעורים שבועי</h2>
            <p className="pv-muted mt-1">מגוון שיעורים לכל רמה - הרשמה מראש דרך האתר</p>
          </div>
          <Pill tone="green"><CalendarDays className="w-3.5 h-3.5" /> מתעדכן שבועית</Pill>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CLASSES.map((c, i) => (
            <motion.div key={c.name} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <Card hover className="p-5 h-full flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0"><c.icon className="w-6 h-6 text-primary" /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold pv-strong">{c.name}</div>
                  <div className="text-sm pv-muted">{c.when} · {c.coach}</div>
                  <div className="mt-1"><Pill>{c.level}</Pill></div>
                </div>
                <button className="shrink-0 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors">הרשמה</button>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* TRAINERS + BOOKING */}
    <section className="relative py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong">המאמנים שלנו</h2>
          <p className="pv-muted mt-1">קבעו אימון אישי מותאם למטרות שלכם</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {TRAINERS.map((tr, i) => (
            <motion.div key={tr.name} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
              <Card hover className="overflow-hidden h-full flex flex-col">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={tr.img} alt={tr.name} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 right-4 left-4">
                    <div className="font-display font-bold text-white text-lg">{tr.name}</div>
                    <div className="text-xs text-white/80">{tr.role}</div>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-sm pv-muted mb-4">{tr.spec}</p>
                  <button className="mt-auto w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl pv-surface2 border pv-border pv-strong text-sm font-semibold hover:border-primary/40 transition-colors">
                    <CalendarDays className="w-4 h-4 text-primary" /> קביעת אימון אישי
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* REVIEWS */}
    <section className="relative py-20 px-4 pv-surface2 border-y pv-border">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong mb-6">מתאמנים מספרים</h2>
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

    {/* JOIN LEAD */}
    <section id="join" className="relative py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative rounded-3xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-l from-primary/20 via-transparent to-emerald-500/10" />
          <Card className="relative p-8 md:p-10 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold pv-strong mb-2">שיעור ניסיון חינם</h2>
            <p className="pv-muted mb-6">השאירו פרטים ונתאם לכם ביקור ראשון - בלי התחייבות</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-3 text-right">
              <div className="rounded-xl pv-surface2 border pv-border px-4 py-3 text-sm pv-faint">שם מלא</div>
              <div className="rounded-xl pv-surface2 border pv-border px-4 py-3 text-sm pv-faint">טלפון</div>
            </div>
            <div className="rounded-xl pv-surface2 border pv-border px-4 py-3 text-sm pv-faint mb-3 text-right">מה המטרה שלך? (למשל: חיטוב, כוח, בריאות)</div>
            <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
              קביעת ביקור <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 justify-center mt-4 text-sm pv-muted">
              <Check className="w-4 h-4 text-primary" /> חזרה תוך יום · ללא עלות
            </div>
          </Card>
        </div>
      </div>
    </section>

    {/* FOOTER */}
    <footer className="relative py-10 px-4 pv-surface2 border-t pv-border">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="font-display font-bold pv-strong">סטודיו כושר לדוגמה</div>
        <div className="flex items-center gap-3">
          <a className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl pv-surface border pv-border pv-text text-sm"><MessageCircle className="w-4 h-4" /> וואטסאפ</a>
          <a className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium"><Phone className="w-4 h-4" /> 050-0000000</a>
        </div>
      </div>
    </footer>
  </PreviewThemeRoot>
);

export default FitnessSite;
