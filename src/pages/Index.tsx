import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, CalendarClock, Building2, Heart, ArrowLeft, Check, Sparkles,
  Palette, CreditCard, BarChart3, Mail, Globe, Share2,
  Camera, Tent, Car, Wrench, Compass, HandHeart, Store, Scissors, Loader2,
  Package, Upload, Rocket,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PreviewThemeRoot, Card } from "@/components/preview-redesign/kit";

// 4 main engines (tabs in the hero)
const ENGINES = [
  {
    key: "commerce", label: "חנויות אונליין", icon: ShoppingBag,
    type: "אתר מכירות",
    subtitle: ["תמיד רציתם אתר, אבל העלויות, הדומיינים וכל הכאב ראש עצרו אתכם.", "עכשיו אפשר: חנות מקצועית עם תשלומים ושיווק, ב-69 ₪ לחודש בלבד."],
    to: "/preview/redesign/home-multi",
    img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&q=80",
  },
  {
    key: "booking", label: "שירותי מקצוע", icon: CalendarClock,
    type: "אתר הזמנות שירותים וקביעת תורים",
    subtitle: ["תמיד קיבלתם הזמנות בוואטסאפ ובמייל, ולפעמים הדברים נופלים בין הכיסאות.", "עכשיו לקוחות קובעים תור לבד, 24/7, ממש מהאתר שלכם."],
    to: "/preview/redesign/services",
    img: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&q=80",
  },
  {
    key: "leads", label: "נדל״ן", icon: Building2,
    type: "אתר לעסק",
    subtitle: ["תמיד היו לכם פרויקטים שעלו פה, ירדו שם, בלי מקום מסודר שאפשר להפנות אליו.", "עכשיו כל הנכסים שלכם מוצגים יפה, מעודכנים, זמינים תמיד."],
    to: "/preview/redesign/realestate",
    img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=900&q=80",
  },
  {
    key: "donations", label: "עמותות", icon: Heart,
    type: "אתר לעמותה",
    subtitle: ["רציתם להראות מה העמותה עושה, להיראות מכובדים, לקבל תרומות, ולא ידעתם מאיפה להתחיל.", "עכשיו יש לכם אתר יפה, תרומות אונליין ואנשים שמגיעים."],
    to: "/preview/redesign/nonprofit",
    img: "https://images.unsplash.com/photo-1593113630400-ea4288922497?w=900&q=80",
  },
];

const EXAMPLES = [
  { title: "חנות בוטיק", tag: "מסחר", img: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=600&q=80", to: "/preview/redesign/home-multi" },
  { title: "סטודיו יופי", tag: "שירותים", img: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80", to: "/preview/redesign/services" },
  { title: "סטודיו צילום", tag: "שירותים", img: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80", to: "/preview/redesign/photographer" },
  { title: "צימר בגליל", tag: "אירוח", img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80", to: "/preview/redesign/vacation" },
  { title: "דירות למכירה", tag: "נדל\"ן", img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80", to: "/preview/redesign/realestate" },
  { title: "פרויקט מגורים", tag: "נדל\"ן", img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80", to: "/preview/redesign/project" },
  { title: "סוחר רכב", tag: "רכב", img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80", to: "/preview/redesign/car-dealer" },
  { title: "שיפוצים ותיקונים", tag: "בעלי מקצוע", img: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=600&q=80", to: "/preview/redesign/home-pro" },
  { title: "עמותה", tag: "תרומות", img: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&q=80", to: "/preview/redesign/nonprofit" },
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
  { icon: Palette, label: "מיתוג ועיצוב AI", desc: "צבעים, פונט ולוגו — מותאמים לעסק שלכם" },
  { icon: CreditCard, label: "סליקה ותשלום מראש", desc: "PayPlus ועוד — ישירות לחשבון שלכם" },
  { icon: BarChart3, label: "דשבורד ואנליטיקה", desc: "הזמנות, מכירות ולקוחות במקום אחד" },
  { icon: Mail, label: "מייל ווואטסאפ", desc: "עדכונים אוטומטיים ללקוח ולעסק" },
  { icon: Globe, label: "דומיין משלכם", desc: "yoursite.co.il — ללא עלות נוספת" },
  { icon: Share2, label: "הפניות ושיווק", desc: "קישורי שיתוף, פיקסל וגוגל אנליטיקס" },
];

const HOW_STEPS = [
  {
    letter: "A",
    icon: Store,
    title: "בוחרים סוג עסק",
    desc: "מכירת מוצרים, שירותי מקצוע, נדל\"ן, עמותה — בוחרים ואנחנו מתאימים את הכלים",
  },
  {
    letter: "B",
    icon: Upload,
    title: "מגדירים שם, לוגו ופרטים",
    desc: "שם העסק, לוגו, פרטי קשר ושעות פעילות — הכל בכמה שניות",
  },
  {
    letter: "C",
    icon: Package,
    title: "מוסיפים מוצרים / שירותים",
    desc: "מוצרים, שירותים, או נכסים — עם תמונה, מחיר ותיאור קצר",
  },
];

// תמונות שמייצגות את ה-Flow האמיתי
const PROCESS_IMGS = [
  { src: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=900&q=80", caption: "A — בוחרים את סוג העסק" },
  { src: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=900&q=80", caption: "B — מעלים לוגו ומגדירים פרטים" },
  { src: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900&q=80", caption: "C — מוסיפים מוצרים ושירותים" },
  { src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=900&q=80", caption: "האתר עולה לאוויר תוך דקות" },
];

const HeroBg = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div className="absolute -top-40 right-[-10%] w-[45rem] h-[45rem] rounded-full blur-[140px]"
      style={{ background: "radial-gradient(circle, hsl(152 60% 45% / 0.18), transparent 70%)" }}
      animate={{ x: [0, -50, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} />
    <motion.div className="absolute top-1/3 left-[-15%] w-[40rem] h-[40rem] rounded-full blur-[150px]"
      style={{ background: "radial-gradient(circle, hsl(170 70% 40% / 0.12), transparent 70%)" }}
      animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.2, 1] }} transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }} />
    <div className="absolute inset-0" style={{ opacity: 0.04, backgroundImage: "linear-gradient(#3fb950 1px, transparent 1px), linear-gradient(90deg, #3fb950 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
  </div>
);

const hasStoredSession = () => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /^sb-.*-auth-token$/.test(k)) return true;
    }
  } catch { /* ignore */ }
  return false;
};

const HowItWorks = () => {
  const [imgIdx, setImgIdx] = useState(0);
  const activeStep = Math.min(imgIdx, HOW_STEPS.length - 1); // 0-2 map to steps A-C; 3 = finale

  useEffect(() => {
    const t = setInterval(() => setImgIdx(i => (i + 1) % PROCESS_IMGS.length), 3400);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="relative py-28 px-4 overflow-hidden">
      {/* subtle bg glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[60rem] h-[30rem] rounded-full blur-[160px]" style={{ background: "radial-gradient(ellipse, hsl(152 60% 45% / 0.07), transparent 70%)" }} />
      </div>

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-display font-bold pv-strong mb-3">איך זה עובד?</h2>
          <p className="text-lg pv-muted">שלושה צעדים — ואתם באוויר</p>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 items-center">

          {/* ── LEFT: image carousel ── */}
          <div className="order-1">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ border: "1px solid var(--pv-border)", background: "var(--pv-surface2)" }}>
              <div className="relative aspect-[4/3] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.img key={imgIdx}
                    src={PROCESS_IMGS[imgIdx].src}
                    alt={PROCESS_IMGS[imgIdx].caption}
                    initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.55 }}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </AnimatePresence>
                {/* gradient overlay */}
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 50%)" }} />
                {/* step label + dots */}
                <div className="absolute bottom-4 right-4 left-4 flex items-end justify-between">
                  <AnimatePresence mode="wait">
                    <motion.span key={imgIdx}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-white font-semibold text-sm drop-shadow">
                      {PROCESS_IMGS[imgIdx].caption}
                    </motion.span>
                  </AnimatePresence>
                  <div className="flex gap-2">
                    {PROCESS_IMGS.map((_, i) => (
                      <button key={i} onClick={() => setImgIdx(i)}
                        className="transition-all duration-300 rounded-full"
                        style={{
                          width: i === imgIdx ? "20px" : "8px",
                          height: "8px",
                          background: i === imgIdx ? "var(--color-primary, #22c55e)" : "rgba(255,255,255,0.45)",
                        }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: vertical timeline ── */}
          <div className="order-2 flex flex-col gap-0">
            {HOW_STEPS.map((s, i) => {
              const isActive = activeStep === i;
              const isDone = imgIdx > i;
              return (
                <motion.div key={s.letter}
                  initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="flex gap-5 cursor-pointer group"
                  onClick={() => setImgIdx(i)}>

                  {/* Timeline spine */}
                  <div className="flex flex-col items-center shrink-0" style={{ width: 52 }}>
                    {/* Letter circle */}
                    <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl font-bold text-base transition-all duration-500 shrink-0"
                      style={{
                        background: isActive
                          ? "linear-gradient(135deg, #22c55e, #84cc16)"
                          : isDone
                            ? "rgba(34,197,94,0.2)"
                            : "var(--pv-surface2)",
                        border: isActive
                          ? "none"
                          : "1px solid var(--pv-border)",
                        color: isActive ? "#fff" : isDone ? "#22c55e" : "var(--pv-faint)",
                        boxShadow: isActive ? "0 0 24px rgba(34,197,94,0.45)" : "none",
                      }}>
                      {isDone && !isActive
                        ? <Check className="w-5 h-5" strokeWidth={2.5} style={{ color: "#22c55e" }} />
                        : <span>{s.letter}</span>}
                    </div>
                    {/* Connecting line */}
                    {i < HOW_STEPS.length - 1 && (
                      <div className="flex-1 w-0.5 my-2 min-h-[2.5rem] rounded-full transition-all duration-700"
                        style={{ background: isDone || isActive ? "linear-gradient(to bottom, #22c55e, rgba(34,197,94,0.2))" : "var(--pv-border)" }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`pb-7 flex-1 text-right transition-all duration-500 ${isActive ? "opacity-100" : "opacity-55 group-hover:opacity-80"}`}>
                    <div className="flex items-center justify-end gap-3 mb-1.5">
                      <h3 className="text-lg font-bold" style={{ color: isActive ? "var(--pv-strong)" : "var(--pv-text)" }}>
                        {s.title}
                      </h3>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500"
                        style={{
                          background: isActive ? "rgba(34,197,94,0.18)" : "var(--pv-surface2)",
                          border: `1px solid ${isActive ? "rgba(34,197,94,0.4)" : "var(--pv-border)"}`,
                        }}>
                        <s.icon className="w-4 h-4" style={{ color: isActive ? "#22c55e" : "var(--pv-faint)" }} strokeWidth={1.8} />
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--pv-muted)" }}>{s.desc}</p>
                  </div>
                </motion.div>
              );
            })}

            {/* Finale row */}
            <motion.div
              initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.35 }}
              className="flex gap-5 cursor-pointer"
              onClick={() => setImgIdx(3)}>
              <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-500"
                style={{
                  background: imgIdx === 3 ? "linear-gradient(135deg, #22c55e, #84cc16)" : "var(--pv-surface2)",
                  border: imgIdx === 3 ? "none" : "1px solid var(--pv-border)",
                  boxShadow: imgIdx === 3 ? "0 0 24px rgba(34,197,94,0.45)" : "none",
                }}>
                <Rocket className="w-5 h-5" style={{ color: imgIdx === 3 ? "#fff" : "var(--pv-faint)" }} strokeWidth={1.8} />
              </div>
              <div className={`flex-1 text-right transition-all duration-500 ${imgIdx === 3 ? "opacity-100" : "opacity-55"}`}>
                <p className="text-lg font-bold" style={{ color: imgIdx === 3 ? "#22c55e" : "var(--pv-strong)" }}>
                  ואופ! האתר עלה לאוויר
                </p>
                <p className="text-sm mt-0.5" style={{ color: "var(--pv-muted)" }}>תוך 5 דקות — ב-69 ₪ בלבד</p>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
};

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isPreview = new URLSearchParams(window.location.search).has("preview");
  const [resolving, setResolving] = useState(!isPreview && hasStoredSession);
  const [eng, setEng] = useState(0);
  const a = ENGINES[eng];

  useEffect(() => {
    if (isPreview) return;
    if (loading) return;
    if (!user) { setResolving(false); return; }
    let cancelled = false;
    // Safety net: if the profile lookup hangs (Supabase incident), don't spin
    // forever - send the logged-in user to their dashboard after 7s.
    const safety = window.setTimeout(() => {
      if (!cancelled) navigate("/dashboard", { replace: true });
    }, 7000);
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      window.clearTimeout(safety);
      // A logged-in user should land in their workspace, never be stranded on the
      // marketing home (this is exactly where an OAuth Site-URL fallback dumps
      // them). New / mid-onboarding -> onboarding; finished -> dashboard.
      if (!profile || !profile.onboarding_completed_at) {
        navigate("/onboarding", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    })();
    return () => { cancelled = true; window.clearTimeout(safety); };
  }, [user, loading, navigate]);

  if (resolving) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0d1117" }}>
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PreviewThemeRoot>
      <SEOHead />
      <div className="overflow-x-hidden">
        <Header />

        {/* HERO */}
        <section className="relative min-h-screen flex items-center overflow-hidden">
          <HeroBg />
          <div className="container relative z-10 pt-32 pb-16">
            {/* Engine switcher */}
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
                <AnimatePresence mode="wait">
                  <motion.div key={a.key}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }}>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-[1.08] mb-5">
                      <span className="block pv-strong">{a.type}</span>
                      <span className="block bg-gradient-to-l from-primary via-emerald-400 to-lime-500 bg-clip-text text-transparent">תוך 5 דקות</span>
                      <span className="block pv-strong">ב-69 ₪ בלבד</span>
                    </h1>
                  </motion.div>
                </AnimatePresence>
                <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
                  <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
                    התחילו עכשיו <ArrowLeft className="w-5 h-5" />
                  </Link>
                  <Link to={a.to} className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl pv-surface2 border pv-border pv-strong font-semibold pv-hover transition-colors">
                    צפו בדוגמה <ArrowLeft className="w-4 h-4" />
                  </Link>
                </div>
                <p className="text-sm pv-muted mt-4">ללא התחייבות · ללא ידע טכני</p>
              </div>

              {/* Preview image */}
              <AnimatePresence mode="wait">
                <motion.div key={a.key}
                  initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.4 }} className="relative">
                  <div className="absolute -inset-6 bg-primary/15 rounded-[2rem] blur-3xl" />
                  <div className="relative rounded-2xl overflow-hidden border pv-border shadow-2xl pv-surface2">
                    <div className="flex items-center gap-2 px-4 h-10 border-b pv-border">
                      <div className="flex gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-400/70" />
                        <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
                        <span className="w-3 h-3 rounded-full bg-green-400/70" />
                      </div>
                      <div className="mx-auto text-xs pv-muted pv-surface border pv-border rounded-md px-4 py-1">siango.app/{a.key}</div>
                    </div>
                    <div className="relative aspect-[4/3]">
                      <img src={a.img} alt={a.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute bottom-4 right-4 left-4 flex items-center justify-center">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-white text-sm border border-white/10">
                          <a.icon className="w-4 h-4 text-primary" /> {a.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* PER-TAB SUBTITLE SECTION */}
        <section className="relative py-16 px-4 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, var(--pv-bg) 0%, var(--pv-surface2) 40%, var(--pv-surface2) 60%, var(--pv-bg) 100%)" }} />
          </div>
          <div className="max-w-3xl mx-auto relative text-center">
            <AnimatePresence mode="wait">
              <motion.div key={a.key}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}>
                <p className="text-lg md:text-xl leading-relaxed pv-text mb-3">{a.subtitle[0]}</p>
                <p className="text-lg md:text-xl leading-relaxed font-semibold" style={{ color: "var(--color-primary, #22c55e)" }}>{a.subtitle[1]}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* HOW IT WORKS — 3 steps */}
        <HowItWorks />

        {/* Professions strip */}
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

        {/* Example sites */}
        <section className="relative py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
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
                      <div className="px-4 py-2.5 text-xs pv-muted text-right">69 ₪ לחודש · ללא התחייבות</div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Shared tools */}
        <section className="relative py-24 px-4 pv-surface2 border-y pv-border">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-display font-bold pv-strong mb-16 text-center">כלים מותאמים לכל תחום</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {CORE.map((c, i) => (
                <motion.div key={c.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                  <Card hover className="p-5 flex items-start gap-4 text-right">
                    <div className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, hsl(152 60% 45% / 0.18), hsl(152 60% 45% / 0.06))", border: "1px solid hsl(152 60% 45% / 0.25)" }}>
                      <c.icon className="w-5 h-5 text-primary" strokeWidth={1.7} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold pv-strong text-sm leading-snug mb-1">{c.label}</p>
                      <p className="text-xs pv-muted leading-relaxed">{c.desc}</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative py-24 px-4 text-center">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[40rem] h-[40rem] bg-primary/15 rounded-full blur-[140px]" />
          </div>
          <div className="relative max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-display font-bold pv-strong mb-5">
              כל עסק. אתר אחד.{" "}
              <span className="bg-gradient-to-l from-primary via-emerald-400 to-lime-500 bg-clip-text text-transparent">5 דקות.</span>
            </h2>
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

export default Index;
