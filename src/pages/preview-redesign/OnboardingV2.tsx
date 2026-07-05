import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, Palette, Package, CreditCard, Rocket, Check, ArrowLeft, ArrowRight,
  Upload, Sparkles,
} from "lucide-react";
import { AuroraBg, Card, PreviewBanner, PreviewThemeRoot } from "@/components/preview-redesign/kit";

/** PREVIEW-ONLY redesigned onboarding wizard mockup. No data saved. */

const STEPS = [
  { id: 1, label: "על העסק", icon: Store },
  { id: 2, label: "עיצוב ומיתוג", icon: Palette },
  { id: 3, label: "המוצרים שלי", icon: Package },
  { id: 4, label: "תשלומים", icon: CreditCard },
  { id: 5, label: "פרסום", icon: Rocket },
];

const Field = ({ label, placeholder, value }: { label: string; placeholder?: string; value?: string }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium pv-text">{label}</label>
    <div className="w-full rounded-xl pv-surface2 border pv-border px-4 py-3 text-sm focus-within:border-primary/40 transition-colors">
      {value ? <span className="pv-text">{value}</span> : <span className="pv-faint">{placeholder}</span>}
    </div>
  </div>
);

const THEMES = [
  { name: "אורבני", c: ["#1e6b6b", "#0f3d3d"] },
  { name: "חם וביתי", c: ["#2d5a4a", "#173028"] },
  { name: "מינימליסטי", c: ["#1a1a1a", "#333"] },
  { name: "יוקרתי", c: ["#3d2a1a", "#6d5a4a"] },
];

const OnboardingV2 = () => {
  const [step, setStep] = useState(1);
  const [theme, setTheme] = useState(0);
  const pct = (step / STEPS.length) * 100;

  return (
    <PreviewThemeRoot>
      <AuroraBg />
      <PreviewBanner title="הקמת חנות (Onboarding)" />

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            {STEPS.map((s) => {
              const done = s.id < step;
              const on = s.id === step;
              return (
                <div key={s.id} className="flex flex-col items-center gap-2 flex-1">
                  <motion.div
                    animate={{ scale: on ? 1.1 : 1 }}
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-colors ${
                      done ? "bg-primary border-primary text-white"
                        : on ? "bg-primary/15 border-primary/50 text-primary"
                        : "pv-surface2 pv-border pv-faint"
                    }`}
                  >
                    {done ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                  </motion.div>
                  <span className={`text-[11px] md:text-xs text-center ${on ? "text-primary font-medium" : "pv-muted"}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
          <div className="h-1.5 rounded-full pv-surface2 overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-l from-primary via-emerald-400 to-lime-500"
              animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>

        {/* Step content */}
        <Card className="p-6 md:p-8 min-h-[340px]">
          <AnimatePresence mode="wait">
            <motion.div key={step}
              initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.35 }}>
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-display font-bold pv-strong mb-1">קצת על העסק</h2>
                    <p className="pv-muted text-sm">נתחיל מהבסיס - שם, תחום ופרטי קשר</p>
                  </div>
                  <Field label="שם העסק" value="בוטיק הדוגמה" />
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="קטגוריה" value="אופנה ובוטיקים" />
                    <Field label="טלפון" placeholder="050-0000000" />
                  </div>
                </div>
              )}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-display font-bold pv-strong mb-1">עיצוב ומיתוג</h2>
                    <p className="pv-muted text-sm">בחרו סגנון והעלו לוגו - או תנו ל-Siango לבחור</p>
                  </div>
                  <motion.div
                    animate={{ borderColor: ["hsl(152 44% 41% / 0.3)", "hsl(152 44% 41% / 0.6)", "hsl(152 44% 41% / 0.3)"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="h-28 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center gap-2">
                    <Upload className="w-6 h-6 text-primary" />
                    <span className="text-sm pv-muted">גררו לוגו או לחצו להעלאה</span>
                  </motion.div>
                  <div>
                    <div className="text-sm pv-text mb-2">סגנון עיצוב</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {THEMES.map((t, i) => (
                        <button key={t.name} onClick={() => setTheme(i)}
                          className={`rounded-2xl overflow-hidden border-2 transition-all ${theme === i ? "border-primary shadow-[0_0_20px_hsl(152_44%_41%/0.4)]" : "pv-border"}`}>
                          <div className="h-14 flex" style={{ background: `linear-gradient(135deg, ${t.c[0]}, ${t.c[1]})` }} />
                          <div className="py-2 text-xs pv-text pv-surface2">{t.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-display font-bold pv-strong mb-1">המוצרים שלי</h2>
                    <p className="pv-muted text-sm">הוסיפו מוצרים עם תמונה, מחיר ותיאור</p>
                  </div>
                  {[
                    { n: "שמלת קיץ פרחונית", p: "₪189", img: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=100&q=80" },
                    { n: "נעלי ספורט", p: "₪599", img: "https://images.unsplash.com/photo-1560343090-f0409e92791a?w=100&q=80" },
                  ].map((m, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl pv-surface border pv-border">
                      <img src={m.img} alt="" className="w-12 h-12 rounded-xl object-cover" />
                      <div className="flex-1 text-sm pv-strong">{m.n}</div>
                      <div className="text-sm font-bold text-primary">{m.p}</div>
                    </div>
                  ))}
                  <button className="w-full h-11 rounded-xl border border-primary/30 bg-primary/10 text-primary text-sm font-medium flex items-center justify-center gap-2">
                    <Package className="w-4 h-4" /> הוספת מוצר
                  </button>
                </div>
              )}
              {step === 4 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-2xl font-display font-bold pv-strong mb-1">תשלומים</h2>
                    <p className="pv-muted text-sm">חברו סליקה עכשיו או דלגו וחברו אחר כך מהדשבורד</p>
                  </div>
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center"><CreditCard className="w-6 h-6 text-primary" /></div>
                    <div className="flex-1">
                      <div className="font-bold pv-strong">חיבור סליקה</div>
                      <div className="text-sm pv-muted">התשלום עובר ישירות מחברת האשראי אליכם</div>
                    </div>
                    <span className="w-11 h-6 rounded-full bg-primary flex items-center px-0.5 justify-end"><span className="w-5 h-5 rounded-full bg-white" /></span>
                  </div>
                  <button className="text-sm pv-muted hover:text-primary transition-colors">דלג לעכשיו →</button>
                </div>
              )}
              {step === 5 && (
                <div className="text-center py-6 space-y-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200 }}
                    className="w-20 h-20 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center mx-auto">
                    <Rocket className="w-10 h-10 text-primary" />
                  </motion.div>
                  <h2 className="text-3xl font-display font-bold pv-strong">הכל מוכן!</h2>
                  <p className="pv-muted max-w-sm mx-auto">החנות שלכם מוכנה לעלות לאוויר. לחיצה אחת ואתם מוכרים.</p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full pv-surface2 border pv-border text-sm pv-text">
                    <Sparkles className="w-4 h-4 text-primary" /> siango.app/my-store
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </Card>

        {/* Nav */}
        <div className="flex items-center justify-between mt-6">
          <button onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl pv-surface2 border pv-border pv-text disabled:opacity-30 pv-hover transition">
            <ArrowRight className="w-4 h-4" /> חזרה
          </button>
          {step < STEPS.length ? (
            <button onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition">
              המשך <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-l from-primary via-emerald-400 to-lime-500 text-white font-bold shadow-lg shadow-primary/40">
              פרסמו את החנות <Rocket className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </PreviewThemeRoot>
  );
};

export default OnboardingV2;
