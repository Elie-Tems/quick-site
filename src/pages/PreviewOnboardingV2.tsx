import { useState } from "react";
import {
  Store, Palette, Package, CreditCard, Rocket, ArrowRight, ArrowLeft,
  Check, Clock, Upload, Sparkles, ShoppingBag, FileText, CheckCircle2,
} from "lucide-react";

/**
 * PREVIEW ONLY - a clickable prototype of a shortened onboarding (5 steps
 * instead of 8), so the owner can evaluate the flow before we implement it
 * for real. Nothing is saved; no Supabase calls. Route: /preview/onboarding-v2.
 *
 * Consolidation map (old 8 -> new 5):
 *   1 על העסק       = קטגוריה + פרטי עסק (שם, טלפון, שעות)         [old 2 + 4]
 *   2 עיצוב ומיתוג  = סגנון/לוגו/צבעים + באנר                      [old 1 + 3]
 *   3 המוצרים שלי   = סוג הזמנה + הוספת מוצרים                     [old 5 + 6]
 *   4 תשלומים       = PayPlus (אפשר לדלג ולחבר אחר כך מהדשבורד)   [old 7]
 *   5 פרסום         = פרסום האתר                                   [old 8]
 */

const STEPS = [
  { id: 1, label: "על העסק", icon: Store },
  { id: 2, label: "עיצוב ומיתוג", icon: Palette },
  { id: 3, label: "המוצרים שלי", icon: Package },
  { id: 4, label: "תשלומים", icon: CreditCard },
  { id: 5, label: "פרסום", icon: Rocket },
];

const Field = ({ label, placeholder, hint }: { label: string; placeholder?: string; hint?: string }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium text-foreground">{label}</label>
    <input
      className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
      placeholder={placeholder}
    />
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const PreviewOnboardingV2 = () => {
  const [step, setStep] = useState(1);
  const [orderType, setOrderType] = useState<"store" | "orders">("store");
  const [open247, setOpen247] = useState(true);
  const [skipPay, setSkipPay] = useState(false);
  const [done, setDone] = useState(false);

  const next = () => setStep((s) => Math.min(5, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      {/* Preview banner */}
      <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-700 dark:text-amber-400 text-center text-xs py-2 px-4">
        תצוגה מקדימה • Onboarding מקוצר (5 שלבים במקום 8) • שום דבר לא נשמר - רק כדי שתתרשם מהזרימה
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-500" />
          <span className="font-bold text-lg text-foreground">siango</span>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = s.id === step;
            const completed = s.id < step;
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      completed
                        ? "bg-primary border-primary text-white"
                        : active
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {completed ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-[11px] ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 mb-5 ${completed ? "bg-primary" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          {done ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">האתר באוויר! 🎉</h2>
              <p className="text-muted-foreground">זו רק תצוגה מקדימה - בפועל כאן האתר היה מתפרסם.</p>
              <button
                onClick={() => { setDone(false); setStep(1); }}
                className="text-sm text-primary underline"
              >
                התחל שוב מההתחלה
              </button>
            </div>
          ) : (
            <>
              {/* STEP 1 - על העסק */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <Store className="w-5 h-5 text-primary" /> נספר על העסק
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">קטגוריה ופרטים בסיסיים - הכל במסך אחד.</p>
                  </div>
                  <Field label="שם העסק" placeholder="לדוגמה: הקפה של דנה" />
                  <Field label="קטגוריה" placeholder="התחל להקליד... (בית קפה, חנות בגדים, מאפייה)" hint="חיפוש עם השלמה אוטומטית" />
                  <Field label="טלפון / וואטסאפ" placeholder="050-0000000" />
                  <div className="rounded-lg border border-border p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      <span className="text-sm text-foreground">פתוח 24/7</span>
                    </div>
                    <button
                      onClick={() => setOpen247((v) => !v)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${open247 ? "bg-primary" : "bg-muted"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${open247 ? "right-0.5" : "right-5"}`} />
                    </button>
                  </div>
                  {!open247 && <p className="text-xs text-muted-foreground">(כאן ייפתחו שדות שעות מותאמות לכל יום)</p>}
                </div>
              )}

              {/* STEP 2 - עיצוב ומיתוג */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <Palette className="w-5 h-5 text-primary" /> עיצוב ומיתוג
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">לוגו, צבעים ותמונת באנר - יחד.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="rounded-xl border-2 border-primary bg-primary/5 p-4 text-center">
                      <Sparkles className="w-6 h-6 text-primary mx-auto mb-1" />
                      <span className="text-sm font-medium text-foreground">צור לי אוטומטית</span>
                      <p className="text-xs text-muted-foreground mt-0.5">AI יבחר עיצוב</p>
                    </button>
                    <button className="rounded-xl border border-border p-4 text-center hover:border-primary/40">
                      <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                      <span className="text-sm font-medium text-foreground">יש לי לוגו/חומרים</span>
                      <p className="text-xs text-muted-foreground mt-0.5">העלאה</p>
                    </button>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">צבע ראשי</label>
                    <div className="flex gap-2 mt-1.5">
                      {["bg-primary", "bg-purple-500", "bg-rose-500", "bg-emerald-500", "bg-sky-500", "bg-amber-500"].map((c) => (
                        <span key={c} className={`w-8 h-8 rounded-full ${c} cursor-pointer ring-offset-2 ring-offset-card hover:ring-2 ring-foreground/30`} />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border-2 border-dashed border-border p-6 text-center text-muted-foreground">
                    <Upload className="w-7 h-7 mx-auto mb-2" />
                    <p className="text-sm">גרור לכאן תמונת באנר (אופציונלי)</p>
                  </div>
                </div>
              )}

              {/* STEP 3 - המוצרים שלי */}
              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary" /> המוצרים שלי
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">איך מוכרים, ומה מוכרים - יחד.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setOrderType("store")}
                      className={`rounded-xl border-2 p-4 text-center ${orderType === "store" ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <ShoppingBag className="w-6 h-6 text-primary mx-auto mb-1" />
                      <span className="text-sm font-medium text-foreground">חנות עם עגלה</span>
                      <p className="text-xs text-muted-foreground mt-0.5">תשלום אונליין</p>
                    </button>
                    <button
                      onClick={() => setOrderType("orders")}
                      className={`rounded-xl border-2 p-4 text-center ${orderType === "orders" ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <FileText className="w-6 h-6 text-primary mx-auto mb-1" />
                      <span className="text-sm font-medium text-foreground">קבלת הזמנות</span>
                      <p className="text-xs text-muted-foreground mt-0.5">בלי תשלום באתר</p>
                    </button>
                  </div>
                  <div className="rounded-xl border border-border p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">מוצר ראשון</p>
                    <Field label="שם המוצר" placeholder="לדוגמה: קפוצ'ינו" />
                    {orderType === "store" && <Field label="מחיר (₪)" placeholder="14" />}
                    <button className="text-sm text-primary flex items-center gap-1"><span className="text-lg leading-none">+</span> הוסף עוד מוצר</button>
                  </div>
                </div>
              )}

              {/* STEP 4 - תשלומים */}
              {step === 4 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-primary" /> תשלומים
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">חבר סליקה - או דלג וחבר אחר כך מהדשבורד.</p>
                  </div>
                  <div className="rounded-xl border border-border p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">PayPlus</p>
                      <p className="text-xs text-muted-foreground">סליקת אשראי מאובטחת</p>
                    </div>
                    <button className="rounded-lg bg-primary text-white text-sm px-4 py-2">חבר</button>
                  </div>
                  <button
                    onClick={() => setSkipPay((v) => !v)}
                    className={`w-full rounded-xl border p-3 text-sm transition-colors ${skipPay ? "border-primary bg-primary/5 text-foreground" : "border-dashed border-border text-muted-foreground hover:border-primary/40"}`}
                  >
                    {skipPay ? "✓ אדלג ואחבר אחר כך - האתר יעלה מהר יותר" : "אין לי סליקה עכשיו? דלג וחבר אחר כך"}
                  </button>
                </div>
              )}

              {/* STEP 5 - פרסום */}
              {step === 5 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-primary" /> מוכן לפרסום
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">הכל מוכן - אפשר להעלות את האתר לאוויר.</p>
                  </div>
                  <div className="rounded-xl border border-border divide-y divide-border">
                    {[
                      ["שם וקטגוריה", "מולא"],
                      ["עיצוב ומיתוג", "מולא"],
                      [`מוצרים (${orderType === "store" ? "חנות" : "הזמנות"})`, "מולא"],
                      ["תשלומים", skipPay ? "ידולג - יחובר אחר כך" : "מחובר"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="text-foreground">{k}</span>
                        <span className="text-muted-foreground flex items-center gap-1"><Check className="w-3.5 h-3.5 text-green-500" />{v}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-center text-muted-foreground">אפשר לערוך הכל גם אחרי שהאתר באוויר.</p>
                </div>
              )}
            </>
          )}

          {/* Nav */}
          {!done && (
            <div className="flex items-center justify-between mt-7 pt-4 border-t border-border">
              <button
                onClick={back}
                disabled={step === 1}
                className="flex items-center gap-1 text-sm text-muted-foreground disabled:opacity-30 hover:text-foreground"
              >
                <ArrowRight className="w-4 h-4" /> חזרה
              </button>
              {step < 5 ? (
                <button onClick={next} className="flex items-center gap-1.5 rounded-lg bg-primary text-white text-sm font-medium px-5 py-2.5">
                  המשך <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={() => setDone(true)} className="flex items-center gap-1.5 rounded-lg bg-green-600 text-white text-sm font-medium px-5 py-2.5">
                  <Rocket className="w-4 h-4" /> פרסם את האתר
                </button>
              )}
            </div>
          )}
        </div>

        {/* Before/after note */}
        <div className="mt-6 rounded-xl bg-muted/40 border border-border p-4 text-center">
          <p className="text-sm text-foreground font-medium">לפני: 8 שלבים • עכשיו: 5 שלבים</p>
          <p className="text-xs text-muted-foreground mt-1">
            איחדנו: קטגוריה+פרטים, עיצוב+באנר, סוג-הזמנה+מוצרים. תשלומים ניתנים לדילוג כדי שהאתר יעלה מהר.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PreviewOnboardingV2;
