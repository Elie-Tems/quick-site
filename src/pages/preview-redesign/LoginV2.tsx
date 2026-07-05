import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowLeft, Check } from "lucide-react";
import { AuroraBg, PreviewBanner, PreviewThemeRoot, PreviewLogo } from "@/components/preview-redesign/kit";

/** PREVIEW-ONLY redesigned auth screen mockup (login + register). No auth performed. */

const REEL = [
  "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
  "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
];

const Field = ({ icon: Icon, label, placeholder, type = "text" }: { icon: typeof Mail; label: string; placeholder: string; type?: string }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium pv-text">{label}</label>
    <div className="flex items-center gap-3 rounded-xl pv-surface2 border pv-border px-4 py-3 focus-within:border-primary/40 transition-colors">
      <Icon className="w-4 h-4 pv-muted shrink-0" />
      <input type={type} placeholder={placeholder} className="bg-transparent outline-none text-sm w-full pv-strong placeholder:text-[color:var(--pv-faint)]" />
    </div>
  </div>
);

const LoginV2 = () => {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <PreviewThemeRoot>
      <AuroraBg />
      <PreviewBanner title="התחברות / הרשמה" />

      <div className="min-h-[calc(100vh-3rem)] grid lg:grid-cols-2">
        {/* Form side */}
        <div className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-sm">
            <PreviewLogo className="h-8 w-auto mb-8" />

            {/* Toggle */}
            <div className="flex p-1 rounded-2xl pv-surface2 border pv-border mb-8">
              {(["login", "register"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors relative ${mode === m ? "pv-strong" : "pv-muted"}`}>
                  {mode === m && <motion.span layoutId="authpill" className="absolute inset-0 rounded-xl bg-primary/20 border border-primary/40" />}
                  <span className="relative">{m === "login" ? "התחברות" : "הרשמה"}</span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={mode}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }} className="space-y-4">
                <div>
                  <h1 className="text-3xl font-display font-bold pv-strong mb-1">
                    {mode === "login" ? "ברוך שובך" : "בואו נתחיל"}
                  </h1>
                  <p className="pv-muted text-sm">
                    {mode === "login" ? "התחברו לניהול החנות שלכם" : "חנות אונליין תוך 5 דקות"}
                  </p>
                </div>

                {mode === "register" && <Field icon={User} label="שם מלא" placeholder="ישראל ישראלי" />}
                <Field icon={Mail} label="אימייל" placeholder="you@example.com" type="email" />
                <Field icon={Lock} label="סיסמה" placeholder="••••••••" type="password" />

                <button className="group w-full mt-2 inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow">
                  {mode === "login" ? "התחברות" : "יצירת חשבון"}
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                </button>

                <div className="flex items-center gap-3 pv-faint text-xs">
                  <span className="flex-1 h-px" style={{ background: "var(--pv-border)" }} /> או <span className="flex-1 h-px" style={{ background: "var(--pv-border)" }} />
                </div>

                <button className="w-full flex items-center justify-center gap-3 py-3 rounded-xl pv-surface2 border pv-border pv-text text-sm font-medium pv-hover transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M12 11v2h5.5c-.2 1.2-1.6 3.5-5.5 3.5-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.9 1.5l1.6-1.6C16.5 3.4 14.5 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1-.2-1.2H12z" /></svg>
                  המשך עם Google
                </button>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Visual side - intentionally dark in both themes (photo panel) */}
        <div className="hidden lg:block relative overflow-hidden border-r pv-border">
          <div className="absolute inset-0 grid grid-cols-2 gap-3 p-6 opacity-90">
            {REEL.concat(REEL).map((img, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="rounded-2xl overflow-hidden">
                <motion.img src={img} alt="" className="w-full h-full object-cover"
                  animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 12, repeat: Infinity, delay: i * 0.5 }} />
              </motion.div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1512] via-[#0a1512]/70 to-[#0a1512]/20" />
          <div className="absolute bottom-0 right-0 left-0 p-10">
            <h2 className="text-3xl font-display font-bold text-white mb-3 leading-tight">
              כל מה שצריך כדי<br /><span className="bg-gradient-to-l from-primary via-emerald-400 to-lime-300 bg-clip-text text-transparent">למכור אונליין</span>
            </h2>
            <div className="space-y-2">
              {["אתר מקצועי מותאם נייד", "סליקה והזמנות ישירות באתר", "דשבורד ניהול פשוט"].map((t) => (
                <div key={t} className="flex items-center gap-2 text-white/80 text-sm">
                  <span className="w-5 h-5 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center"><Check className="w-3 h-3 text-primary" /></span>
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PreviewThemeRoot>
  );
};

export default LoginV2;
