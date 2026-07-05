import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, CalendarClock, Building2, ArrowLeft, Check, Sparkles,
  Palette, CreditCard, BarChart3, Mail, Globe, Share2,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PreviewThemeRoot, ThemeToggle, usePreviewTheme, Card } from "@/components/preview-redesign/kit";

/**
 * PREVIEW ONLY - a home page that speaks to ALL Siango audiences (retail,
 * service providers, real estate) with an audience switcher and real example
 * sites. One product; the visitor picks their world here. Route:
 * /preview/redesign/home-multi. Illustrative sample sites only.
 */

const AUDIENCES = [
  {
    key: "products", label: "מוצרים ומכירות", icon: ShoppingBag,
    accent: "חנות אונליין", headTail: "תוך 5 דקות",
    sub: "בוטיקים, מזון, אומנות, כל מי שמוכר מוצרים - קטלוג, עגלה וסליקה.",
    cta: "בנו חנות", to: "/preview/home-v2",
    img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&q=80",
    chips: ["קטלוג מוצרים", "עגלת קניות", "סליקה מיידית"],
  },
  {
    key: "services", label: "שירותים ותורים", icon: CalendarClock,
    accent: "יומן תורים", headTail: "שמתמלא לבד",
    sub: "מאפרות, לק ג'ל, קוסמטיקה, ברברים - יומן חכם שמסתנכרן, ותשלום מראש.",
    cta: "פתחו יומן", to: "/preview/redesign/services",
    img: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&q=80",
    chips: ["הזמנת תורים", "סנכרון יומן", "תזכורות אוטומטיות"],
  },
  {
    key: "realestate", label: "נדל\"ן", icon: Building2,
    accent: "לוח נכסים", headTail: "שמוכר בשבילכם",
    sub: "מתווכים ויזמים - לוח דירות, סינון, הדמיות, סיורי 360 ולכידת לידים.",
    cta: "העלו נכסים", to: "/preview/redesign/realestate",
    img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=900&q=80",
    chips: ["לוח דירות", "סיור 360", "לכידת לידים"],
  },
];

const EXAMPLES = [
  { title: "בוטיק לדוגמה", tag: "מסחר", img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80", to: "/preview/home-v2" },
  { title: "סטודיו יופי", tag: "שירותים", img: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80", to: "/preview/redesign/services" },
  { title: "דירות למכירה", tag: "נדל\"ן · מתווך", img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80", to: "/preview/redesign/realestate" },
  { title: "פרויקט מגורים", tag: "נדל\"ן · יזם", img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80", to: "/preview/redesign/project" },
  { title: "מאפייה", tag: "מסחר", img: "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=600&q=80", to: "/preview/home-v2" },
  { title: "מרפאה / קליניקה", tag: "שירותים", img: "https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=600&q=80", to: "/preview/redesign/services" },
];

const CORE = [
  { icon: Palette, label: "מיתוג ועיצוב AI" },
  { icon: CreditCard, label: "סליקה / תשלום מראש" },
  { icon: BarChart3, label: "דשבורד ואנליטיקה" },
  { icon: Mail, label: "מייל ווואטסאפ" },
  { icon: Globe, label: "דומיין משלכם" },
  { icon: Share2, label: "הפניות ושיווק" },
];

const HeroBg = () => {
  const { theme } = usePreviewTheme();
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0" style={{ background: theme === "light" ? "transparent" : "transparent" }} />
      <motion.div className="absolute -top-40 right-[-10%] w-[45rem] h-[45rem] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(circle, hsl(152 60% 45% / var(--pv-a1)), transparent 70%)" }}
        animate={{ x: [0, -50, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute top-1/3 left-[-15%] w-[40rem] h-[40rem] rounded-full blur-[150px]"
        style={{ background: "radial-gradient(circle, hsl(170 70% 40% / var(--pv-a2)), transparent 70%)" }}
        animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.2, 1] }} transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }} />
      <div className="absolute inset-0" style={{ opacity: "var(--pv-grid-op)", backgroundImage: "linear-gradient(var(--pv-grid) 1px, transparent 1px), linear-gradient(90deg, var(--pv-grid) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
    </div>
  );
};

const HomeMulti = () => {
  const [aud, setAud] = useState(0);
  const a = AUDIENCES[aud];

  useEffect(() => { document.title = "Siango - לכל סוגי העסקים (תצוגה)"; }, []);

  return (
    <PreviewThemeRoot>
      <div className="overflow-x-hidden">
        <Header />
        <div className="fixed z-50 bottom-5 left-5"><ThemeToggle /></div>

        {/* HERO with audience switcher */}
        <section className="relative min-h-screen flex items-center overflow-hidden">
          <HeroBg />
          <div className="container relative z-10 pt-32 pb-16">
            {/* Switcher */}
            <div className="flex justify-center mb-10">
              <div className="inline-flex flex-wrap justify-center gap-1 p-1 rounded-2xl pv-surface2 border pv-border">
                {AUDIENCES.map((x, i) => (
                  <button key={x.key} onClick={() => setAud(i)}
                    className={`relative px-4 md:px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${i === aud ? "text-white" : "pv-muted"}`}>
                    {i === aud && <motion.span layoutId="audpill" className="absolute inset-0 rounded-xl bg-primary" />}
                    <span className="relative flex items-center gap-2"><x.icon className="w-4 h-4" /> {x.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-10 items-center">
              {/* Text */}
              <div className="text-center lg:text-right">
                <AnimatePresence mode="wait">
                  <motion.div key={a.key}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }}>
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
                </AnimatePresence>
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
              <AnimatePresence mode="wait">
                <motion.div key={a.key}
                  initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
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
                        <span className="px-3 py-1.5 rounded-full bg-primary text-white text-sm font-bold">חי</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* EXAMPLE SITES */}
        <section className="relative py-24 px-4 pv-surface2 border-y pv-border">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full pv-surface border pv-border mb-5">
                <Sparkles className="w-4 h-4 text-primary" /> <span className="text-sm pv-text">דוגמאות אתרים</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-display font-bold pv-strong mb-3">אתר לכל תחום</h2>
              <p className="text-lg pv-muted">לחצו על דוגמה כדי לראות אותה מלאה</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {EXAMPLES.map((e, i) => (
                <motion.div key={e.title} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
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
        <section className="relative py-24 px-4">
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

        <Footer />
      </div>
    </PreviewThemeRoot>
  );
};

export default HomeMulti;
