import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShoppingBag, CalendarClock, Building2, Heart, ArrowLeft, Check, Sparkles,
  Palette, CreditCard, BarChart3, Mail, Globe, Share2,
  Camera, Tent, Car, Wrench, Compass, HandHeart, Store, Scissors,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PreviewThemeRoot, ThemeToggle, Card } from "@/components/preview-redesign/kit";

/**
 * PREVIEW ONLY - the home page that speaks to ALL Siango audiences across the
 * four "engines" (sell / book / lead / donate) with real example sites. One
 * platform; the visitor picks their world here. Route: /preview/redesign/home-multi.
 * Illustrative sample sites only.
 */

// The 4 engines
const ENGINES = [
  {
    key: "commerce", label: "מכירת מוצרים", icon: ShoppingBag,
    accent: "חנות אונליין", headTail: "שמוכרת 24/7",
    sub: "בוטיקים, מזון, אומנות, כל מי שמוכר מוצרים - קטלוג, עגלה וסליקה.",
    cta: "בנו חנות", to: "/preview/home-v2",
    img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&q=80",
    chips: ["קטלוג מוצרים", "עגלת קניות", "סליקה מיידית"],
  },
  {
    key: "booking", label: "תורים והזמנות", icon: CalendarClock,
    accent: "יומן חכם", headTail: "שמתמלא לבד",
    sub: "מאפרות, ספרים, צלמים, קליניקות, צימרים - יומן שמסתנכרן ותשלום מראש.",
    cta: "פתחו יומן", to: "/preview/redesign/services",
    img: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&q=80",
    chips: ["הזמנת תור/תאריך", "סנכרון יומן", "תזכורות אוטומטיות"],
  },
  {
    key: "leads", label: "לידים ולוחות", icon: Building2,
    accent: "לוח נכסים", headTail: "שמייצר פניות",
    sub: "נדל\"ן, רכב, בעלי מקצוע - לוח מסונן, מדיה עשירה ולכידת לידים חכמה.",
    cta: "העלו נכסים", to: "/preview/redesign/realestate",
    img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=900&q=80",
    chips: ["לוח עם סינון", "360 ווידאו", "לכידת לידים"],
  },
  {
    key: "donations", label: "תרומות וקמפיינים", icon: Heart,
    accent: "גיוס תרומות", headTail: "שמשנה מציאות",
    sub: "עמותות וגיוס המונים - תרומה חוזרת, קבלות סעיף 46, וקמפיינים עם יעד.",
    cta: "פתחו קמפיין", to: "/preview/redesign/nonprofit",
    img: "https://images.unsplash.com/photo-1593113630400-ea4288922497?w=900&q=80",
    chips: ["תרומה חוזרת", "סעיף 46", "קמפיין יעד"],
  },
];

// All example sites (link to each vertical sketch)
const EXAMPLES = [
  { title: "בוטיק אופנה", tag: "מסחר", img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80", to: "/preview/home-v2" },
  { title: "סטודיו יופי", tag: "שירותים", img: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80", to: "/preview/redesign/services" },
  { title: "סטודיו צילום", tag: "שירותים", img: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80", to: "/preview/redesign/photographer" },
  { title: "צימר בגליל", tag: "אירוח", img: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=600&q=80", to: "/preview/redesign/vacation" },
  { title: "דירות למכירה", tag: "נדל\"ן", img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80", to: "/preview/redesign/realestate" },
  { title: "פרויקט מגורים", tag: "נדל\"ן", img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80", to: "/preview/redesign/project" },
  { title: "סוחר רכב", tag: "רכב", img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80", to: "/preview/redesign/car-dealer" },
  { title: "שיפוצים ותיקונים", tag: "בעלי מקצוע", img: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=600&q=80", to: "/preview/redesign/home-pro" },
  { title: "עמותה", tag: "תרומות", img: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=600&q=80", to: "/preview/redesign/nonprofit" },
  { title: "גיוס המונים", tag: "קמפיין", img: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&q=80", to: "/preview/redesign/crowdfunding" },
];

const PROFESSIONS = [
  { icon: Store, label: "חנויות ובוטיקים" },
  { icon: Scissors, label: "יופי וטיפוח" },
  { icon: Camera, label: "צלמים" },
  { icon: Tent, label: "צימרים ונופש" },
  { icon: Building2, label: "נדל\"ן" },
  { icon: Car, label: "רכב יד שנייה" },
  { icon: Wrench, label: "בעלי מקצוע" },
  { icon: Compass, label: "יזמי נדל\"ן" },
  { icon: Heart, label: "עמותות" },
  { icon: HandHeart, label: "גיוס המונים" },
];

const CORE = [
  { icon: Palette, label: "מיתוג ועיצוב AI" },
  { icon: CreditCard, label: "סליקה / תשלום מראש" },
  { icon: BarChart3, label: "דשבורד ואנליטיקה" },
  { icon: Mail, label: "מייל ווואטסאפ" },
  { icon: Globe, label: "דומיין משלכם" },
  { icon: Share2, label: "הפניות ושיווק" },
];

const HeroBg = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div className="absolute -top-40 right-[-10%] w-[45rem] h-[45rem] rounded-full blur-[140px]"
      style={{ background: "radial-gradient(circle, hsl(152 60% 45% / var(--pv-a1)), transparent 70%)" }}
      animate={{ x: [0, -50, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} />
    <motion.div className="absolute top-1/3 left-[-15%] w-[40rem] h-[40rem] rounded-full blur-[150px]"
      style={{ background: "radial-gradient(circle, hsl(170 70% 40% / var(--pv-a2)), transparent 70%)" }}
      animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.2, 1] }} transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }} />
    <div className="absolute inset-0" style={{ opacity: "var(--pv-grid-op)", backgroundImage: "linear-gradient(var(--pv-grid) 1px, transparent 1px), linear-gradient(90deg, var(--pv-grid) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
  </div>
);

const HomeMulti = () => {
  const [eng, setEng] = useState(0);
  const a = ENGINES[eng];
  useEffect(() => { document.title = "Siango - פלטפורמה אחת לכל עסק (תצוגה)"; }, []);

  return (
    <PreviewThemeRoot>
      <div className="overflow-x-hidden">
        <Header />
        <div className="fixed z-50 bottom-5 left-5"><ThemeToggle /></div>

        {/* HERO with engine switcher */}
        <section className="relative min-h-screen flex items-center overflow-hidden">
          <HeroBg />
          <div className="container relative z-10 pt-32 pb-16">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
                <Sparkles className="w-4 h-4 text-primary" /> <span className="text-sm pv-text">פלטפורמה אחת · כל סוגי העסקים</span>
              </div>
            </motion.div>

            {/* Switcher */}
            <div className="flex justify-center mb-10">
              <div className="inline-flex flex-wrap justify-center gap-1 p-1 rounded-2xl pv-surface2 border pv-border">
                {ENGINES.map((x, i) => (
                  <button key={x.key} onClick={() => setEng(i)}
                    className={`relative px-4 md:px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${i === eng ? "text-white" : "pv-muted"}`}>
                    {i === eng && <motion.span layoutId="engpill" className="absolute inset-0 rounded-xl bg-primary" />}
                    <span className="relative flex items-center gap-2"><x.icon className="w-4 h-4" /> {x.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-10 items-center">
              {/* Text */}
              <div className="text-center lg:text-right">
                <motion.div key={a.key}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-[1.08] mb-5">
                      <span className="block pv-strong">האתר שלכם עם</span>
                      <span className="bg-gradient-to-l from-primary via-emerald-400 to-lime-500 bg-clip-text text-transparent">{a.accent}</span>
                      <span className="block pv-strong">{a.headTail}</span>
                    </h1>
                    <p className="text-lg md:text-xl pv-text mb-6 max-w-lg mx-auto lg:mx-0">{a.sub}</p>
                    <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-8">
                      {a.chips.map((c) => (
                        <span key={c} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full pv-surface2 border pv-border text-sm pv-text">
                          <Check className="w-3.5 h-3.5 text-primary" /> {c}
                        </span>
                      ))}
                    </div>
                </motion.div>
                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
                  <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
                    התחילו עכשיו <ArrowLeft className="w-5 h-5" />
                  </Link>
                  <Link to={a.to} className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl pv-surface2 border pv-border pv-strong font-semibold pv-hover transition-colors">
                    {a.cta}
                  </Link>
                </div>
                <p className="text-sm pv-muted mt-4">אתר אחד, כל הכלים - בוחרים את התחום ומתחילים.</p>
              </div>

              {/* Preview */}
                <motion.div key={a.key}
                  initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.4 }} className="relative">
                  <div className="absolute -inset-6 bg-primary/15 rounded-[2rem] blur-3xl" />
                  <div className="relative rounded-2xl overflow-hidden border pv-border shadow-2xl pv-surface2">
                    <div className="flex items-center gap-2 px-4 h-10 border-b pv-border">
                      <div className="flex gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400/70" /><span className="w-3 h-3 rounded-full bg-yellow-400/70" /><span className="w-3 h-3 rounded-full bg-green-400/70" /></div>
                      <div className="mx-auto text-xs pv-muted pv-surface border pv-border rounded-md px-4 py-1">siango.app/{a.key}</div>
                    </div>
                    <div className="relative aspect-[4/3]">
                      <img src={a.img} alt={a.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute bottom-4 right-4 left-4 flex items-center justify-between">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-white text-sm border border-white/10">
                          <a.icon className="w-4 h-4 text-primary" /> {a.label}
                        </span>
                        <Link to={a.to} className="px-3 py-1.5 rounded-full bg-primary text-white text-sm font-bold">צפו בדוגמה</Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
            </div>
          </div>
        </section>

        {/* PROFESSIONS strip */}
        <section className="relative py-10 px-4 border-y pv-border pv-surface2">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-2.5">
            {PROFESSIONS.map((p, i) => (
              <motion.span key={p.label} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.03 }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full pv-surface border pv-border pv-text text-sm">
                <p.icon className="w-4 h-4 text-primary" /> {p.label}
              </motion.span>
            ))}
          </div>
        </section>

        {/* EXAMPLE SITES */}
        <section className="relative py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full pv-surface2 border pv-border mb-5">
                <Sparkles className="w-4 h-4 text-primary" /> <span className="text-sm pv-text">דוגמאות אתרים</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-display font-bold pv-strong mb-3">אתר אמיתי לכל תחום</h2>
              <p className="text-lg pv-muted">לחצו על דוגמה כדי לראות אותה מלאה</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {EXAMPLES.map((e, i) => (
                <motion.div key={e.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                  <Link to={e.to} className="group block">
                    <Card hover className="overflow-hidden">
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img src={e.img} alt={e.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-primary/90 text-white text-xs font-medium">{e.tag}</span>
                        <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between">
                          <span className="font-display font-bold text-white text-lg">{e.title}</span>
                          <ArrowLeft className="w-5 h-5 text-white opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* SHARED TOOLS */}
        <section className="relative py-24 px-4 pv-surface2 border-y pv-border">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-display font-bold pv-strong mb-3">כל הכלים, לכל תחום</h2>
            <p className="text-lg pv-muted mb-12">לא משנה מה אתם מוכרים - אותה מערכת, אותם כלים חזקים</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {CORE.map((c, i) => (
                <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                  <Card hover className="p-6 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                      <c.icon className="w-6 h-6 text-primary" strokeWidth={1.6} />
                    </div>
                    <span className="pv-text font-medium">{c.label}</span>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="relative py-24 px-4 text-center">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[40rem] h-[40rem] bg-primary/15 rounded-full blur-[140px]" />
          </div>
          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-display font-bold pv-strong mb-5">כל עסק. אתר אחד. <span className="bg-gradient-to-l from-primary via-emerald-400 to-lime-500 bg-clip-text text-transparent">5 דקות.</span></h2>
            <Link to="/register" className="inline-flex items-center gap-2 px-9 py-4 rounded-2xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
              התחילו עכשיו <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </PreviewThemeRoot>
  );
};

export default HomeMulti;
