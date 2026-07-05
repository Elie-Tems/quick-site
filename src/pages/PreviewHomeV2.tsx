import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import {
  ArrowLeft, Play, Sparkles, Zap, Store, Palette, Package,
  Globe, CreditCard, ClipboardList, MousePointerClick, Check,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PreviewThemeRoot, ThemeToggle, usePreviewTheme } from "@/components/preview-redesign/kit";

/**
 * PREVIEW ONLY - a redesigned, younger/more animated landing page for approval.
 * Route: /preview/home-v2. Does NOT replace the real homepage (Index at "/").
 * All marketing copy is the real Hebrew content already used on the live site.
 * Light/dark toggle (floating, bottom-left). The phone mockup stays a dark
 * device screen in both themes (a phone is dark), like a real screen recording.
 *
 * The ambient background <video> (public/media/hero-ambient.mp4) is placeholder
 * b-roll - heavily blurred + tinted so it reads as organic motion, not a clip.
 * Swap it for a real brand clip before going live.
 */

// ---- Real content (mirrors src/lib/translations/he.ts) --------------------
const CATEGORIES = [
  "בוטיקים", "מזון וממתקים", "אומנות ויצירה", "ספרים ומוזיקה",
  "צעצועים וילדים", "חיות מחמד", "קוסמטיקה", "תכשיטים",
  "ריהוט ועיצוב", "ספורט ופנאי", "מתנות", "קפה ומאפים",
];

const REEL = [
  { img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80", title: "קולקציית קיץ", tag: "עד 50% הנחה" },
  { img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80", title: "שעון יוקרה", tag: "₪899" },
  { img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80", title: "חדש בחנות", tag: "משלוח חינם" },
  { img: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&q=80", title: "נעלי ספורט", tag: "₪599" },
];

const FLOATERS = [
  { img: "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=200&q=80", price: "₪449", label: "בושם פרימיום" },
  { img: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&q=80", price: "₪749", label: "תיק עור" },
];

const STEPS = [
  { n: "01", icon: Store, title: "מעלים שם ולוגו", desc: "מזינים את שם העסק ומעלים לוגו. המערכת מנתחת ויוצרת עיצוב מותאם." },
  { n: "02", icon: Palette, title: "בוחרים עיצוב", desc: "בוחרים תבנית וצבעים או נותנים ל-Siango לבחור בשבילכם." },
  { n: "03", icon: Package, title: "מוסיפים מוצרים", desc: "מעלים מוצרים בקלות עם תמונות, מחירים ותיאורים - והאתר מוכן למכירה." },
];

const AUDIENCES = [
  { title: "בוטיקים", desc: "מעצבים עצמאיים וחנויות קונספט", img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80", big: true },
  { title: "מזון וממתקים", desc: "עוגות, שוקולד ומאפים", img: "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=600&q=80" },
  { title: "אומנות ויצירה", desc: "יצירות יד, ציורים ועיצובים", img: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=600&q=80" },
  { title: "ספרים ומוזיקה", desc: "חנויות תקליטים וספרים", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80" },
  { title: "צעצועים וילדים", desc: "משחקים ומוצרים לילדים", img: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=600&q=80" },
  { title: "חיות מחמד", desc: "מזון, אביזרים וציוד", img: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=600&q=80" },
];

const BENEFITS = [
  { icon: Globe, title: "אתר מקצועי", desc: "אתר שנראה טוב ועובד מעולה בכל מכשיר", stat: "100%", statLabel: "מותאם נייד", img: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&q=80" },
  { icon: CreditCard, title: "הזמנה או סליקה", desc: "לקוחות יכולים להזמין או לשלם ישירות באתר", stat: "מיידי", statLabel: "עיבוד תשלום", img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80" },
  { icon: ClipboardList, title: "ניהול הזמנות", desc: "רואים את כל ההזמנות במקום אחד, בצורה ברורה", stat: "בזמן אמת", statLabel: "ניהול הזמנות", img: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80" },
  { icon: Package, title: "הכל במקום אחד", desc: "מוצרים, הזמנות, לקוחות - דשבורד אחד פשוט", stat: "מסביב לשעון", statLabel: "גישה מלאה", img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&q=80" },
];

const ROTATING = ["חנות אונליין", "העסק שלך", "המותג שלך", "אתר מכירות"];

// ---- Background: animated aurora + ambient video ---------------------------
const HeroBg = () => {
  const { theme } = usePreviewTheme();
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <video
        className={`absolute inset-0 w-full h-full object-cover blur-[2px] scale-110 ${theme === "light" ? "opacity-[0.08]" : "opacity-[0.18]"}`}
        autoPlay muted loop playsInline
        poster="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&q=60"
      >
        <source src="/media/hero-ambient.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0" style={{ background: "color-mix(in srgb, var(--pv-bg) 80%, transparent)" }} />
      <motion.div
        className="absolute -top-40 right-[-10%] w-[45rem] h-[45rem] rounded-full blur-[130px]"
        style={{ background: "radial-gradient(circle, hsl(152 60% 45% / 0.32), transparent 70%)" }}
        animate={{ x: [0, -60, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 left-[-15%] w-[40rem] h-[40rem] rounded-full blur-[140px]"
        style={{ background: "radial-gradient(circle, hsl(170 70% 40% / 0.26), transparent 70%)" }}
        animate={{ x: [0, 70, 0], y: [0, -50, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0"
        style={{
          opacity: "var(--pv-grid-op)",
          backgroundImage:
            "linear-gradient(var(--pv-grid) 1px, transparent 1px), linear-gradient(90deg, var(--pv-grid) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
    </div>
  );
};

// ---- Phone reel (stays a dark device in both themes) -----------------------
const PhoneReel = () => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % REEL.length), 2600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="relative">
      <div className="absolute -inset-10 bg-primary/20 rounded-[3rem] blur-3xl" />
      {FLOATERS.map((f, idx) => (
        <motion.div
          key={idx}
          className="absolute z-20 hidden sm:flex items-center gap-2 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/10 p-2 pr-3 shadow-2xl"
          style={idx === 0 ? { top: "12%", right: "-14%" } : { bottom: "14%", left: "-16%" }}
          animate={{ y: [0, idx === 0 ? -14 : 14, 0] }}
          transition={{ duration: idx === 0 ? 5 : 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <img src={f.img} alt="" className="w-11 h-11 rounded-xl object-cover" />
          <div className="text-right">
            <div className="text-[11px] text-white/70 leading-tight">{f.label}</div>
            <div className="text-sm font-bold text-primary leading-tight">{f.price}</div>
          </div>
        </motion.div>
      ))}
      <div className="relative w-[270px] md:w-[310px] h-[550px] md:h-[630px] rounded-[3rem] bg-gradient-to-b from-zinc-800 to-zinc-900 p-2.5 shadow-2xl">
        <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
        <div className="w-full h-full rounded-[2.4rem] bg-black overflow-hidden relative">
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full z-30" />
          <div className="w-full h-full bg-gradient-to-b from-zinc-950 to-black p-3 pt-10 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <img src="/logo-dark-bg.png" alt="Siango" className="h-5 w-auto" />
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40" />
            </div>
            <div className="relative h-40 rounded-2xl overflow-hidden mb-3 shrink-0">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0"
                >
                  <img src={REEL[i].img} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 right-3 text-right">
                    <div className="text-sm font-bold text-white">{REEL[i].title}</div>
                    <div className="text-[11px] text-primary font-semibold">{REEL[i].tag}</div>
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="absolute top-2 left-2 flex gap-1 z-10">
                {REEL.map((_, d) => (
                  <div key={d} className={`h-1 rounded-full transition-all ${d === i ? "w-5 bg-primary" : "w-1.5 bg-white/40"}`} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {REEL.map((p, idx) => (
                <motion.div
                  key={idx}
                  animate={{ scale: idx === i ? 1.03 : 1, borderColor: idx === i ? "hsl(152 44% 41%)" : "rgba(255,255,255,0.06)" }}
                  className="rounded-xl bg-zinc-900/80 border overflow-hidden"
                >
                  <div className="aspect-square overflow-hidden">
                    <img src={p.img} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-1.5">
                    <div className="text-[9px] text-white/80 truncate">{p.title}</div>
                    <div className="text-[10px] font-bold text-primary">{p.tag}</div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="mt-auto pt-3">
              <motion.div
                animate={{ boxShadow: ["0 0 0px hsl(152 44% 41% / 0)", "0 0 24px hsl(152 44% 41% / 0.5)", "0 0 0px hsl(152 44% 41% / 0)"] }}
                transition={{ duration: 2.4, repeat: Infinity }}
                className="h-11 rounded-xl bg-primary flex items-center justify-center gap-2"
              >
                <span className="text-xs font-bold text-white">הוספה לעגלה</span>
                <span className="text-xs">🛒</span>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---- Infinite marquee ------------------------------------------------------
const Marquee = ({ reverse = false }: { reverse?: boolean }) => (
  <div className="flex overflow-hidden select-none [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
    {[0, 1].map((k) => (
      <motion.div
        key={k}
        className="flex shrink-0 items-center gap-6 pr-6"
        animate={{ x: reverse ? ["-100%", "0%"] : ["0%", "-100%"] }}
        transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
      >
        {CATEGORIES.map((c, idx) => (
          <span key={idx} className="flex items-center gap-6 text-2xl md:text-3xl font-display font-bold pv-faint whitespace-nowrap">
            {c}
            <Sparkles className="w-5 h-5 text-primary/50" />
          </span>
        ))}
      </motion.div>
    ))}
  </div>
);

const Reveal = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

const DemoVideo = () => (
  <section id="demo" className="relative py-24 md:py-32 px-4">
    <div className="container relative z-10 max-w-5xl mx-auto">
      <Reveal className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full pv-surface2 border pv-border mb-6">
          <Play className="w-4 h-4 text-primary" />
          <span className="text-sm pv-text">רואים איך זה נראה</span>
        </div>
        <h2 className="text-4xl md:text-6xl font-display font-bold pv-strong mb-4">צפו איך זה קורה</h2>
        <p className="text-lg md:text-xl pv-muted">מהרעיון לחנות פעילה - בלי קוד, בלי מעצב, בלי כאב ראש</p>
      </Reveal>
      <Reveal delay={0.1}>
        <div className="relative group rounded-[2rem] overflow-hidden border pv-border shadow-2xl">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/40 via-emerald-400/20 to-lime-400/30 blur-2xl opacity-60 group-hover:opacity-90 transition-opacity" />
          <div className="relative pv-surface2 backdrop-blur">
            <div className="flex items-center gap-2 px-4 h-11 border-b pv-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/70" />
                <div className="w-3 h-3 rounded-full bg-green-400/70" />
              </div>
              <div className="mx-auto text-xs pv-muted pv-surface border pv-border rounded-md px-4 py-1">siango.app/my-store</div>
            </div>
            <video
              className="w-full aspect-video object-cover"
              autoPlay muted loop playsInline
              poster="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=70"
            >
              <source src="/media/hero-ambient.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </Reveal>
    </div>
  </section>
);

// ---- Main ------------------------------------------------------------------
const PreviewHomeV2 = () => {
  const [rot, setRot] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);

  useEffect(() => {
    document.title = "Siango - עיצוב חדש (תצוגה מקדימה)";
    const id = setInterval(() => setRot((p) => (p + 1) % ROTATING.length), 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <PreviewThemeRoot>
      <div className="overflow-x-hidden">
        <Header />

        {/* Floating theme toggle */}
        <div className="fixed z-50 bottom-5 left-5">
          <ThemeToggle />
        </div>

        {/* HERO */}
        <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden">
          <HeroBg />
          <motion.div style={{ y: heroY }} className="container relative z-10 pt-32 pb-20">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Text */}
              <div className="text-center lg:text-right order-1">
                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-7"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                  </span>
                  <span className="text-sm pv-text">בונים חנות אונליין - בלי ידע טכני</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}
                  className="text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-[1.05] mb-6"
                >
                  <span className="block pv-strong">אתר מכירות</span>
                  <span className="relative inline-flex overflow-hidden h-[1.15em] items-center">
                    <AnimatePresence mode="popLayout">
                      <motion.span
                        key={rot}
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: "0%", opacity: 1 }}
                        exit={{ y: "-100%", opacity: 0 }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        className="bg-gradient-to-l from-primary via-emerald-400 to-lime-500 bg-clip-text text-transparent"
                      >
                        {ROTATING[rot]}
                      </motion.span>
                    </AnimatePresence>
                  </span>
                  <span className="block pv-strong">תוך 5 דקות</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-xl md:text-2xl pv-text mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed"
                >
                  Siango יוצרת לך חנות אונליין מעוצבת בכמה דקות
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.28 }}
                  className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl pv-surface2 border pv-border mb-9"
                >
                  <span className="text-2xl md:text-3xl font-bold pv-strong">69 ש"ח<span className="text-base font-normal pv-muted"> לחודש + מע"מ</span></span>
                  <span className="w-px h-6" style={{ background: "var(--pv-border)" }} />
                  <span className="text-primary font-bold">ללא התחייבות!</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.34 }}
                  className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
                >
                  <Link
                    to="/register"
                    className="group relative inline-flex items-center gap-2 px-9 py-4 rounded-2xl bg-primary text-white font-bold text-lg overflow-hidden shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow"
                  >
                    <span className="absolute inset-0 bg-gradient-to-l from-primary via-emerald-400 to-primary bg-[length:200%_100%] animate-[shine_3s_linear_infinite]" />
                    <span className="relative">התחילו עכשיו</span>
                    <ArrowLeft className="relative w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  </Link>
                  <a href="#demo" className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl pv-surface2 border pv-border pv-strong font-semibold pv-hover transition-colors">
                    <Play className="w-4 h-4 text-primary" />
                    צפו בדמו
                  </a>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="flex items-center gap-6 mt-7 justify-center lg:justify-start pv-muted"
                >
                  {["ללא ידע טכני", "5 דקות בלבד"].map((t) => (
                    <span key={t} className="flex items-center gap-2 text-sm md:text-base">
                      <Check className="w-4 h-4 text-primary" /> {t}
                    </span>
                  ))}
                </motion.div>
              </div>

              {/* Phone */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
                className="flex justify-center order-2"
              >
                <PhoneReel />
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            animate={{ y: [0, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 pv-faint"
          >
            <MousePointerClick className="w-6 h-6" />
          </motion.div>
        </section>

        {/* MARQUEE */}
        <section className="relative py-10 border-y pv-border pv-surface2 space-y-4">
          <Marquee />
          <Marquee reverse />
        </section>

        {/* HOW IT WORKS */}
        <section className="relative py-24 md:py-32 px-4">
          <div className="container relative z-10 max-w-6xl mx-auto">
            <Reveal className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-display font-bold pv-strong mb-4">איך זה עובד?</h2>
              <p className="text-lg md:text-xl pv-muted">כמה צעדים פשוטים והאתר שלכם באוויר</p>
            </Reveal>
            <div className="grid md:grid-cols-3 gap-6">
              {STEPS.map((s, idx) => (
                <Reveal key={s.n} delay={idx * 0.12}>
                  <div className="group relative h-full rounded-3xl pv-surface border pv-border p-8 overflow-hidden hover:border-primary/40 transition-colors">
                    <div className="absolute -top-8 -left-8 w-40 h-40 bg-primary/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-6">
                        <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                          <s.icon className="w-7 h-7 text-primary" strokeWidth={1.6} />
                        </div>
                        <span className="text-5xl font-display font-bold text-primary/15">{s.n}</span>
                      </div>
                      <h3 className="text-2xl font-display font-bold pv-strong mb-3">{s.title}</h3>
                      <p className="pv-muted leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* DEMO VIDEO */}
        <DemoVideo />

        {/* AUDIENCES (image cards keep dark overlay + white text in both themes) */}
        <section className="relative py-24 md:py-32 px-4 pv-surface2 border-y pv-border">
          <div className="container relative z-10 max-w-6xl mx-auto">
            <Reveal className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full pv-surface border pv-border mb-6">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm pv-text">לכל סוגי העסקים</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-display font-bold pv-strong mb-4">למי זה מתאים?</h2>
              <p className="text-lg md:text-xl pv-muted">לכל מי שרוצה להתחיל למכור אונליין</p>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {AUDIENCES.map((a, idx) => (
                <Reveal key={a.title} delay={idx * 0.07} className={a.big ? "md:col-span-2 md:row-span-2" : ""}>
                  <div className={`group relative rounded-3xl overflow-hidden ${a.big ? "min-h-[300px] md:h-full" : "aspect-[4/3]"}`}>
                    <img src={a.img} alt={a.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/50 rounded-3xl transition-colors" />
                    <div className="absolute bottom-0 right-0 left-0 p-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      </div>
                      <h3 className={`font-display font-bold text-white mb-1 ${a.big ? "text-3xl" : "text-xl"}`}>{a.title}</h3>
                      <p className="text-white/70 text-sm">{a.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
            <p className="text-center pv-muted mt-10">
              <span className="pv-strong font-semibold">ועוד עשרות</span> תחומים נוספים...
            </p>
          </div>
        </section>

        {/* BENEFITS (image cards keep dark overlay + white text) */}
        <section className="relative py-24 md:py-32 px-4">
          <div className="container relative z-10 max-w-5xl mx-auto">
            <Reveal className="text-center mb-14">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full pv-surface2 border pv-border mb-6">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-sm pv-text">יתרונות הפלטפורמה</span>
              </div>
              <h2 className="text-4xl md:text-6xl font-display font-bold pv-strong mb-4">מה מקבלים?</h2>
              <p className="text-lg md:text-xl pv-muted">כל מה שצריך כדי להתחיל למכור אונליין</p>
            </Reveal>
            <div className="grid md:grid-cols-2 gap-6">
              {BENEFITS.map((b, idx) => (
                <Reveal key={b.title} delay={idx * 0.1}>
                  <div className="group relative rounded-3xl overflow-hidden min-h-[280px] flex flex-col justify-end p-8">
                    <img src={b.img} alt={b.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40" />
                    <div className="absolute top-6 left-6 bg-black/70 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10">
                      <div className="text-lg font-bold text-primary">{b.stat}</div>
                      <div className="text-xs text-white/70">{b.statLabel}</div>
                    </div>
                    <div className="relative">
                      <div className="w-14 h-14 rounded-2xl bg-primary/20 backdrop-blur-sm border border-primary/30 flex items-center justify-center mb-4">
                        <b.icon className="w-7 h-7 text-primary" strokeWidth={1.5} />
                      </div>
                      <h3 className="font-display font-bold text-2xl text-white mb-2">{b.title}</h3>
                      <p className="text-white/80">{b.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="relative py-28 px-4 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[40rem] h-[40rem] bg-primary/15 rounded-full blur-[140px]" />
          </div>
          <Reveal className="relative z-10 text-center max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-display font-bold pv-strong mb-6 leading-tight">
              מוכנים? האתר שלכם<br />באוויר תוך <span className="bg-gradient-to-l from-primary via-emerald-400 to-lime-500 bg-clip-text text-transparent">5 דקות</span>
            </h2>
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 px-10 py-5 rounded-2xl bg-primary text-white font-bold text-xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow"
            >
              התחילו עכשיו
              <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <p className="pv-muted mt-4">5 דקות · ללא ידע טכני · ללא התחייבות</p>
          </Reveal>
        </section>

        <Footer />
      </div>

      <style>{`
        @keyframes shine { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </PreviewThemeRoot>
  );
};

export default PreviewHomeV2;
