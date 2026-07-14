import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, CalendarClock, Building2, Heart, ArrowLeft, Check, Sparkles,
  Palette, CreditCard, BarChart3, Mail, Globe, Share2,
  Camera, Tent, Car, Wrench, Compass, HandHeart, Store, Scissors, Loader2,
  Package, Upload, Rocket, Tag, Users, ImagePlus,
  UtensilsCrossed, Dumbbell, BookOpen, Music2, Baby, Dog, Flower2, Truck, Plus,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { PreviewThemeRoot, Card } from "@/components/preview-redesign/kit";
import { useLanguage } from "@/contexts/LanguageContext";

// Non-translatable config (icons, routes, images) stays outside component
const ENGINE_CONFIG = [
  { key: "commerce", icon: ShoppingBag, to: "/preview/redesign/home-multi", img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1400&q=80", stepIcons: [Store, Upload, Package] },
  { key: "booking",  icon: CalendarClock, to: "/preview/redesign/services", img: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=1400&q=80", stepIcons: [Store, Upload, Package] },
  { key: "donations", icon: Heart, to: "/preview/redesign/nonprofit", img: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1400&q=80", stepIcons: [Store, Upload, Package] },
];

const PROFESSIONS_CONFIG = [
  { icon: Store, key: "store" },
  { icon: Scissors, key: "beauty" },
  { icon: Camera, key: "photography" },
  { icon: Tent, key: "vacation" },
  { icon: Building2, key: "realestate" },
  { icon: Car, key: "car" },
  { icon: Wrench, key: "trades" },
  { icon: Compass, key: "developer" },
  { icon: Heart, key: "nonprofit" },
  { icon: HandHeart, key: "crowdfunding" },
  { icon: UtensilsCrossed, key: "restaurant" },
  { icon: Dumbbell, key: "fitness" },
  { icon: BookOpen, key: "courses" },
  { icon: Music2, key: "music" },
  { icon: Baby, key: "childcare" },
  { icon: Dog, key: "pets" },
  { icon: Flower2, key: "flowers" },
  { icon: Truck, key: "logistics" },
  { icon: Plus, key: "other", highlight: true },
];

const CORE_CONFIG = [
  { icon: BarChart3, key: "stats" },
  { icon: Package, key: "products" },
  { icon: Tag, key: "promotions" },
  { icon: Mail, key: "email" },
  { icon: ImagePlus, key: "ai" },
  { icon: Globe, key: "domain" },
];

const EXAMPLES_CONFIG = [
  { key: "boutique", img: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=600&q=80", to: "/preview/redesign/boutique" },
  { key: "beauty", img: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80", to: "/preview/redesign/services" },
  { key: "photography", img: "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80", to: "/preview/redesign/photographer" },
  { key: "vacation", img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80", to: "/preview/redesign/vacation" },
  { key: "realestate", img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80", to: "/preview/redesign/realestate" },
  { key: "project", img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80", to: "/preview/redesign/project" },
  { key: "car", img: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80", to: "/preview/redesign/car-dealer" },
  { key: "homepro", img: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=600&q=80", to: "/preview/redesign/home-pro" },
  { key: "nonprofit", img: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=600&q=80", to: "/preview/redesign/nonprofit" },
];

const HOW_STEP_META = [
  { letter: "A", icon: Store },
  { letter: "B", icon: Upload },
  { letter: "C", icon: Package },
];

const PROCESS_IMGS: Record<string, Array<{ src: string; pos: string }>> = {
  commerce: [
    { src: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&q=80", pos: "center center" },
    { src: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=900&q=80", pos: "center top" },
    { src: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&q=80", pos: "center center" },
    { src: "", pos: "" },
  ],
  donations: [
    { src: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=900&q=80", pos: "center center" },
    { src: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=900&q=80", pos: "center center" },
    { src: "https://images.unsplash.com/photo-1593113598332-cd288d649433?w=900&q=80", pos: "center center" },
    { src: "", pos: "" },
  ],
  booking: [
    { src: "https://images.unsplash.com/photo-1521791136064-7986c2920216?w=900&q=80", pos: "center center" },
    { src: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=900&q=80", pos: "center top" },
    { src: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=900&q=80", pos: "center top" },
    { src: "", pos: "" },
  ],
};
const getProcessImgs = (engKey: string) => PROCESS_IMGS[engKey] ?? PROCESS_IMGS.commerce;

const HeroBg = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div className="absolute -top-40 right-[-10%] w-[45rem] h-[45rem] rounded-full blur-[140px]"
      style={{ background: "radial-gradient(circle, hsl(152 60% 45% / 0.18), transparent 70%)" }}
      animate={{ x: [0, -50, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }} transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }} />
    <motion.div className="absolute top-1/3 left-[-15%] w-[40rem] h-[40rem] rounded-full blur-[150px]"
      style={{ background: "radial-gradient(circle, hsl(170 70% 40% / 0.12), transparent 70%)" }}
      animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.2, 1] }} transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }} />
    <div className="absolute inset-0" style={{ opacity: "var(--pv-grid-op)", backgroundImage: "linear-gradient(var(--pv-grid) 1px, transparent 1px), linear-gradient(90deg, var(--pv-grid) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
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

// True right after an OAuth provider redirect, when the URL still carries the
// auth result (?code= for PKCE, #access_token= for implicit) or an error. Google
// login's redirect can land on the apex "/" (Supabase Site-URL fallback), and at
// that instant the session isn't persisted yet - so hasStoredSession() is still
// false. Without this we briefly render the marketing home before the auth state
// resolves and routes the user to their workspace (the "home flash"). Detecting
// the return params lets us show the spinner immediately instead.
const hasOAuthReturn = () => {
  try {
    const s = `${window.location.search}${window.location.hash}`;
    return /[?&#](code|access_token|error_description)=/.test(s);
  } catch { return false; }
};

const HowItWorks = ({ engKey, stepKeys }: { engKey: string; stepKeys: string[] }) => {
  const { t } = useLanguage();
  const [imgIdx, setImgIdx] = useState(0);
  const processImgs = getProcessImgs(engKey);
  const HOW_STEPS = HOW_STEP_META.map((m, i) => ({
    ...m,
    title: t(`engine.${engKey}.step${i + 1}.title`),
    desc: t(`engine.${engKey}.step${i + 1}.desc`),
  }));
  const activeStep = Math.min(imgIdx, HOW_STEPS.length - 1);

  const imgCaptions = [
    t("howItWorks.img.a"),
    t("howItWorks.img.b"),
    t("howItWorks.img.c"),
    "",
  ];

  useEffect(() => {
    const ti = setInterval(() => setImgIdx(i => (i + 1) % processImgs.length), 3400);
    return () => clearInterval(ti);
  }, [processImgs.length]);

  return (
    <section className="relative py-28 px-4 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[60rem] h-[30rem] rounded-full blur-[160px]" style={{ background: "radial-gradient(ellipse, hsl(152 60% 45% / 0.07), transparent 70%)" }} />
      </div>

      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-display font-bold pv-strong mb-3">{t("howItWorks.mainTitle")}</h2>
          <p className="text-lg pv-muted">{t("howItWorks.mainSubtitle")}</p>
        </div>

        <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">

          {/* vertical timeline — right side (primary in RTL) */}
          <div className="order-1 flex flex-col gap-0">
            {HOW_STEPS.map((s, i) => {
              const isActive = activeStep === i;
              const isDone = imgIdx > i;
              return (
                <motion.div key={s.letter}
                  initial={{ opacity: 0, x: 24 }} whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                  className="flex gap-5 cursor-pointer group"
                  onClick={() => setImgIdx(i)}>
                  <div className="flex flex-col items-center shrink-0" style={{ width: 52 }}>
                    <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl font-bold text-base transition-all duration-500 shrink-0"
                      style={{
                        background: isActive ? "linear-gradient(135deg, #22c55e, #84cc16)" : isDone ? "rgba(34,197,94,0.2)" : "var(--pv-surface2)",
                        border: isActive ? "none" : "1px solid var(--pv-border)",
                        color: isActive ? "#fff" : isDone ? "#22c55e" : "var(--pv-faint)",
                        boxShadow: isActive ? "0 0 24px rgba(34,197,94,0.45)" : "none",
                      }}>
                      {isDone && !isActive
                        ? <Check className="w-5 h-5" strokeWidth={2.5} style={{ color: "#22c55e" }} />
                        : <span>{s.letter}</span>}
                    </div>
                    {i < HOW_STEPS.length - 1 && (
                      <div className="flex-1 w-0.5 my-2 min-h-[2.5rem] rounded-full transition-all duration-700"
                        style={{ background: isDone || isActive ? "linear-gradient(to bottom, #22c55e, rgba(34,197,94,0.2))" : "var(--pv-border)" }} />
                    )}
                  </div>
                  <div className={`pb-7 flex-1 text-right transition-all duration-500 ${isActive ? "opacity-100" : "opacity-50 group-hover:opacity-75"}`}>
                    <div className="flex items-center justify-end gap-3 mb-1.5">
                      <h3 className="text-lg font-bold" style={{ color: isActive ? "var(--pv-strong)" : "var(--pv-text)" }}>{s.title}</h3>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500"
                        style={{ background: isActive ? "rgba(34,197,94,0.18)" : "var(--pv-surface2)", border: `1px solid ${isActive ? "rgba(34,197,94,0.4)" : "var(--pv-border)"}` }}>
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
                  background: imgIdx === 3 ? "linear-gradient(135deg, #22c55e, #84cc16)" : "#e2e8f0",
                  border: imgIdx === 3 ? "none" : "1px solid #cbd5e1",
                  boxShadow: imgIdx === 3 ? "0 0 24px rgba(34,197,94,0.35)" : "none",
                }}>
                <Rocket className="w-5 h-5" style={{ color: imgIdx === 3 ? "#fff" : "#94a3b8" }} strokeWidth={1.8} />
              </div>
              <div className={`flex-1 text-right transition-all duration-500 ${imgIdx === 3 ? "opacity-100" : "opacity-50"}`}>
                <p className="text-lg font-bold" style={{ color: imgIdx === 3 ? "#22c55e" : "#0f172a" }}>
                  {t("howItWorks.finale.title")}
                </p>
                <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>{t("howItWorks.finale.desc")}</p>
              </div>
            </motion.div>
          </div>

          {/* image carousel — left side, tilted */}
          <div className="order-2" style={{ transform: "rotate(-2deg)" }}>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ border: "1px solid var(--pv-border)", background: "var(--pv-surface2)" }}>
              <div className="relative aspect-[16/9] overflow-hidden">
                <AnimatePresence mode="wait">
                  {imgIdx === 3 ? (
                    <motion.div key="siango-mockup"
                      initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.55 }}
                      className="absolute inset-0 flex flex-col" dir="rtl"
                      style={{ background: "#0f172a" }}>
                      {/* browser chrome */}
                      <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ background: "#1e293b", borderBottom: "1px solid #334155" }}>
                        <div className="flex gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                        </div>
                        <div className="flex-1 mx-3 px-3 py-1 rounded text-xs text-center" style={{ background: "#0f172a", color: "#94a3b8" }}>
                          {engKey === "donations" ? "siango.app/campaign/אוכל-לכל" : engKey === "booking" ? "siango.app/book/סטודיו-יפה" : "siango.app/store/בוטיק-שלי"}
                        </div>
                      </div>
                      {engKey === "donations" ? (
                        <>
                          <div className="px-4 py-2 shrink-0 flex items-center justify-between" style={{ background: "#dc2626" }}>
                            <span className="text-xs font-bold text-white">❤️ עמותת אוכל לכל</span>
                            <span className="text-xs text-white/80">מאז 2010</span>
                          </div>
                          <div className="flex-1 overflow-hidden" style={{ background: "#fff7f7" }}>
                            <img src="https://images.unsplash.com/photo-1593113598332-cd288d649433?w=400&q=70" alt="food baskets" className="w-full object-cover" style={{ height: "52%", objectPosition: "center" }} />
                            <div className="px-3 pt-2">
                              <div className="text-xs font-bold mb-1" style={{ color: "#7f1d1d", fontSize: "9px" }}>קמפיין: חבילות מזון לחגים</div>
                              <div className="w-full rounded-full mb-1.5" style={{ height: 5, background: "#fee2e2" }}>
                                <div className="rounded-full h-full" style={{ width: "68%", background: "#dc2626" }} />
                              </div>
                              <div className="flex justify-between" style={{ fontSize: "8px", color: "#991b1b" }}>
                                <span>₪6,800 נאסף</span><span>יעד: ₪10,000</span>
                              </div>
                              <button className="mt-2 w-full rounded text-white font-bold py-1 text-xs" style={{ background: "#dc2626", fontSize: "9px" }}>תרמו עכשיו ←</button>
                            </div>
                          </div>
                        </>
                      ) : engKey === "booking" ? (
                        <>
                          <div className="px-4 py-2 shrink-0 flex items-center justify-between" style={{ background: "#6366f1" }}>
                            <span className="text-xs font-bold text-white">✂️ סטודיו יפה</span>
                            <span className="text-xs text-white/80">הזמנת תורים</span>
                          </div>
                          <div className="flex-1 p-3 overflow-hidden" style={{ background: "#f8fafc" }}>
                            {[
                              { name: "תספורת + פן", price: "₪180", time: "60 דק'" },
                              { name: "צבע שיער", price: "₪350", time: "120 דק'" },
                              { name: "טיפול פנים", price: "₪220", time: "75 דק'" },
                            ].map((s) => (
                              <div key={s.name} className="flex items-center justify-between mb-1.5 rounded-lg px-2 py-1.5" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
                                <button className="rounded text-white px-2 py-0.5" style={{ background: "#6366f1", fontSize: "8px" }}>הזמן</button>
                                <div className="text-right">
                                  <div style={{ fontSize: "9px", fontWeight: 600, color: "#0f172a" }}>{s.name}</div>
                                  <div style={{ fontSize: "8px", color: "#6366f1" }}>{s.price} · {s.time}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="px-4 py-2 shrink-0 flex items-center justify-between" style={{ background: "#22c55e" }}>
                            <span className="text-xs font-bold text-white">🛍️ בוטיק שלי</span>
                            <span className="text-xs text-white/80">עגלה (0)</span>
                          </div>
                          <div className="flex-1 p-3 overflow-hidden" style={{ background: "#f8fafc" }}>
                            <div className="grid grid-cols-3 gap-2 h-full">
                              {[
                                { name: "שמלת ערב", price: "₪320", img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=120&q=70" },
                                { name: "חולצת לינן", price: "₪185", img: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=120&q=70" },
                                { name: "מכנסיים", price: "₪240", img: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=120&q=70" },
                              ].map((p) => (
                                <div key={p.name} className="rounded-lg overflow-hidden flex flex-col" style={{ background: "#fff", border: "1px solid #e2e8f0" }}>
                                  <div className="flex-1 overflow-hidden" style={{ maxHeight: "65%" }}>
                                    <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="p-1.5">
                                    <div className="text-xs font-semibold text-right" style={{ color: "#0f172a", fontSize: "9px" }}>{p.name}</div>
                                    <div className="text-xs font-bold" style={{ color: "#22c55e", fontSize: "9px" }}>{p.price}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </motion.div>
                  ) : (
                    <motion.img key={imgIdx}
                      src={processImgs[imgIdx].src}
                      alt={imgCaptions[imgIdx]}
                      initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.55 }}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{ objectPosition: processImgs[imgIdx].pos }}
                    />
                  )}
                </AnimatePresence>
                {imgIdx !== 3 && (
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 50%)" }} />
                )}
                <div className="absolute bottom-4 right-4 left-4 flex items-end justify-between">
                  <AnimatePresence mode="wait">
                    {imgIdx !== 3 && (
                      <motion.span key={imgIdx}
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="text-white font-semibold text-sm drop-shadow">
                        {imgCaptions[imgIdx]}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <div className="flex gap-2 mr-auto">
                    {processImgs.map((_, i) => (
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

        </div>
      </div>
    </section>
  );
};

const Index = () => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isPreview = new URLSearchParams(window.location.search).has("preview");
  const [resolving, setResolving] = useState(() => !isPreview && (hasStoredSession() || hasOAuthReturn()));
  const [eng, setEng] = useState(0);

  const ENGINES = ENGINE_CONFIG.map(cfg => ({
    ...cfg,
    label: t(`engine.${cfg.key}.label`),
    type: t(`engine.${cfg.key}.type`),
    subtitle: [t(`engine.${cfg.key}.subtitle1`), t(`engine.${cfg.key}.subtitle2`)],
  }));

  const a = ENGINES[eng];

  useEffect(() => {
    if (isPreview) return;
    if (loading) return;
    if (!user) { setResolving(false); return; }
    let cancelled = false;
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
        <section className="relative overflow-hidden">
          <HeroBg />
          <div className="container relative z-10 pt-32 pb-0">
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

            {/* Centered text block */}
            <div className="text-center max-w-3xl mx-auto mb-10">
              <AnimatePresence mode="wait">
                <motion.div key={a.key}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.35 }}>
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-[1.05] mb-6">
                    <span className="block pv-strong" style={{ whiteSpace: "pre-line" }}>{a.type}</span>
                    <span className="block bg-gradient-to-l from-primary via-emerald-400 to-lime-500 bg-clip-text text-transparent">{t("hero.fiveMin")}</span>
                    <span className="block pv-strong">{t("hero.price79")}</span>
                  </h1>
                </motion.div>
              </AnimatePresence>
              <div className="flex items-center justify-center">
                <Link to="/register" className="inline-flex items-center gap-2 px-9 py-4 rounded-2xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
                  {t("hero.startNow")} <ArrowLeft className="w-5 h-5" />
                </Link>
              </div>
              <p className="text-sm pv-muted mt-4">{t("hero.monthlyNote")}</p>
            </div>

          </div>
        </section>

        {/* PER-TAB SUBTITLE SECTION — a.img as background */}
        <section className="relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.img key={a.key}
              src={a.img}
              alt=""
              aria-hidden="true"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 w-full h-full object-cover object-center"
              style={{ filter: "brightness(0.3) saturate(0.7)" }}
            />
          </AnimatePresence>
          {/* Green tint overlay */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(4,47,46,0.8) 0%, rgba(6,78,59,0.7) 50%, rgba(0,0,0,0.55) 100%)" }} />

          <div className="relative px-4 py-10 max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div key={a.key}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
                className="text-center">

                <p className="text-lg md:text-xl leading-relaxed font-light italic mb-6 max-w-2xl mx-auto"
                  style={{ color: "rgba(255,255,255,0.7)" }}>{a.subtitle[0]}</p>

                <p className="text-2xl md:text-4xl leading-snug font-bold max-w-2xl mx-auto"
                  style={{ color: "#fff" }}>{a.subtitle[1]}</p>

              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <HowItWorks engKey={a.key} stepKeys={[]} />

        {/* Professions strip */}
        <section className="relative py-12 px-4 border-y pv-border pv-surface2">
          <p className="text-center text-xs pv-muted mb-5 tracking-widest uppercase">{t("core.sectionTitle")}</p>
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-2">
            {PROFESSIONS_CONFIG.map((p, i) => (
              <motion.span key={p.key}
                initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.03 }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${p.highlight
                  ? "bg-primary text-white shadow-md shadow-primary/30"
                  : "pv-surface border pv-border pv-text hover:border-primary/40"
                }`}>
                <p.icon className={`w-4 h-4 ${p.highlight ? "text-white" : "text-primary"}`} />
                {t(`profession.${p.key}`)}
              </motion.span>
            ))}
          </div>
        </section>

        {/* Example sites */}
        <section className="relative py-24 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-5xl font-display font-bold pv-strong mb-3">{t("examples.sectionTitle")}</h2>
              <p className="text-lg pv-muted">{t("examples.sectionSubtitle")}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {EXAMPLES_CONFIG.map((e, i) => (
                <motion.div key={e.key} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                  <Link to={e.to} className="group block">
                    <Card hover className="overflow-hidden">
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img src={e.img} alt={t(`example.${e.key}.title`)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between">
                          <span className="font-display font-bold text-white text-lg">{t(`example.${e.key}.title`)}</span>
                          <ArrowLeft className="w-5 h-5 text-white opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                        </div>
                      </div>
                      <div className="px-4 py-2.5 text-xs pv-muted text-right">{t("examples.priceNote")}</div>
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
            <h2 className="text-3xl md:text-5xl font-display font-bold pv-strong mb-16 text-center">{t("core.sectionTitle")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {CORE_CONFIG.map((c, i) => (
                <motion.div key={c.key} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                  <Card hover className="p-5 flex items-start gap-4 text-right">
                    <div className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, hsl(152 60% 45% / 0.18), hsl(152 60% 45% / 0.06))", border: "1px solid hsl(152 60% 45% / 0.25)" }}>
                      <c.icon className="w-5 h-5 text-primary" strokeWidth={1.7} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold pv-strong text-sm leading-snug mb-1">{t(`core.${c.key}.label`)}</p>
                      <p className="text-xs pv-muted leading-relaxed">{t(`core.${c.key}.desc`)}</p>
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
            <h2 className="text-3xl md:text-5xl font-display font-bold pv-strong mb-4">
              {t("finalCta.line1")}<br />
              <span className="bg-gradient-to-l from-primary via-emerald-400 to-lime-500 bg-clip-text text-transparent">{t("finalCta.gradientLine")}</span>
            </h2>
            <p className="text-lg pv-muted mb-2">{t("finalCta.desc1")}</p>
            <p className="text-lg font-semibold pv-strong mb-6">{t("finalCta.price79")}</p>
            <Link to="/register" className="inline-flex items-center gap-2 px-9 py-4 rounded-2xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
              {t("finalCta.cta")} <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>
        </section>

        <Footer />
      </div>
    </PreviewThemeRoot>
  );
};

export default Index;
