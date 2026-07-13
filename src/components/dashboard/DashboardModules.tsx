import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShoppingBag, CalendarClock, Building2, Heart, Landmark,
  Hotel, ClipboardList, Images, Check, Loader2, Blocks, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getEnabledModules, MODULES, type ModuleKey, type BusinessType,
} from "@/lib/businessModules";

/**
 * "המודולים שלי" - the dashboard module marketplace. A business_type sets a
 * default preset (kept), but here the merchant turns capabilities on/off and
 * adds new ones. Writing to businesses.enabled_modules; getEnabledModules()
 * honors it, so the nav + storefront react immediately. Onboarding stays simple
 * (no module picker) - all composition happens here, per product decision.
 */

interface Props {
  business?: { id?: string; business_type?: string | null; enabled_modules?: string[] | null } | null;
}

type Live = {
  key: ModuleKey;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  title: string;
  desc: string;
};

const LIVE: Live[] = [
  { key: "commerce",  icon: ShoppingBag,   color: "#0b9e77", title: "חנות מוצרים",      desc: "קטלוג, עגלת קניות, הזמנות וסליקה. למכירת מוצרים פיזיים או דיגיטליים." },
  { key: "booking",   icon: CalendarClock, color: "#1785c2", title: "יומן ותורים",      desc: "לקוחות קובעים תור מהאתר, יומן חודשי מסונכרן Google, שירותים ושעות." },
  { key: "listings",  icon: Building2,     color: "#6d4bd0", title: "לוח נכסים ולידים",  desc: "נכסים/פריטים עם סינון, וכל פנייה נכנסת ל-CRM כליד עם מעקב." },
  { key: "donations", icon: Heart,         color: "#c0392b", title: "תרומות",           desc: "תרומה חד-פעמית או חודשית, קמפיינים עם יעד, וסעיף 46." },
  { key: "synagogue", icon: Landmark,      color: "#c07d12", title: "בית כנסת",         desc: "עליות ונדרים, מקומות קבועים וזמני תפילה." },
];

// Phase-2 modules - shown as an invitation, not yet toggleable.
const SOON = [
  { icon: Hotel,         color: "#6d4bd0", title: "חדרים / יחידות אירוח", desc: "יחידות עם זמינות בלוח, מחיר ללילה והזמנה - לצימרים ואירוח." },
  { icon: Images,        color: "#0b9e77", title: "גלריה / תיק עבודות",   desc: "תצוגת עבודות ופרויקטים - לצלמים, מעצבים ובעלי מקצוע." },
  { icon: ClipboardList, color: "#c07d12", title: "טופס לידים עצמאי",     desc: "\"השאירו פרטים\" ללא לוח נכסים - נכנס ישר ל-CRM." },
];

const fade = (d = 0) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay: d } });

const DashboardModules = ({ business }: Props) => {
  const qc = useQueryClient();
  const [pending, setPending] = useState<ModuleKey | null>(null);
  const current = getEnabledModules(business as { business_type?: BusinessType } | null);

  const save = useMutation({
    mutationFn: async (next: ModuleKey[]) => {
      if (!business?.id) throw new Error("no business");
      // enabled_modules is a new column not yet in the generated types.
      const { error } = await (supabase.from("businesses") as unknown as {
        update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
      }).update({ enabled_modules: next }).eq("id", business.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-business"] });
      qc.invalidateQueries({ queryKey: ["business"] });
    },
    onError: () => toast.error("לא הצלחנו לעדכן את המודולים. נסו שוב."),
    onSettled: () => setPending(null),
  });

  const toggle = (key: ModuleKey) => {
    const on = current.includes(key);
    const next = on ? current.filter((k) => k !== key) : [...current, key];
    if (next.length === 0) { toast.error("צריך להשאיר לפחות מודול אחד פעיל."); return; }
    setPending(key);
    save.mutate(next, { onSuccess: () => toast.success(on ? `${MODULES[key].label} כובה` : `${MODULES[key].label} הופעל`) });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      {/* Hero */}
      <motion.div {...fade()} className="rounded-2xl p-7 text-white relative overflow-hidden" style={{ background: "linear-gradient(120deg,#0b9e77,#1785c2,#6d4bd0)" }}>
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(#fff 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0"><Blocks className="w-6 h-6" /></div>
          <div>
            <h1 className="text-2xl font-bold leading-tight">המודולים שלי</h1>
            <p className="text-white/80 text-sm mt-0.5">הרכיבו את האתר בדיוק לפי מה שהעסק צריך - הדליקו והכבו יכולות בקליק.</p>
          </div>
        </div>
      </motion.div>

      {/* Live modules */}
      <div className="grid sm:grid-cols-2 gap-4">
        {LIVE.map((m, i) => {
          const on = current.includes(m.key);
          const Icon = m.icon;
          const busy = pending === m.key;
          return (
            <motion.div key={m.key} {...fade(0.03 * i)}
              className={`rounded-2xl border p-5 transition-colors ${on ? "border-transparent" : "border-border bg-card"}`}
              style={on ? { background: `linear-gradient(120deg, ${m.color}12, transparent)`, borderColor: `${m.color}55` } : undefined}>
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${m.color}1a` }}>
                  <Icon className="w-5 h-5" style={{ color: m.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground">{m.title}</h3>
                    {on && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${m.color}1f`, color: m.color }}><Check className="w-3 h-3" /> פעיל</span>}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">{m.desc}</p>
                </div>
                {/* Toggle */}
                <button
                  onClick={() => toggle(m.key)}
                  disabled={busy}
                  role="switch"
                  aria-checked={on}
                  className={`relative w-12 h-7 rounded-full shrink-0 transition-colors disabled:opacity-60 ${on ? "" : "bg-muted"}`}
                  style={on ? { background: m.color } : undefined}
                  title={on ? "כבה" : "הדלק"}
                >
                  <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all flex items-center justify-center ${on ? "right-1" : "right-6"}`}>
                    {busy && <Loader2 className="w-3 h-3 animate-spin" style={{ color: m.color }} />}
                  </span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Coming soon */}
      <div>
        <div className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground bg-muted px-4 py-1.5 rounded-full mb-3">
          <Sparkles className="w-4 h-4" /> בקרוב - מודולים נוספים בפיתוח
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {SOON.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.title} className="rounded-2xl border border-border bg-card/60 p-4 opacity-80">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: `${m.color}14` }}>
                  <Icon className="w-5 h-5" style={{ color: m.color, opacity: 0.85 }} />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground text-sm">{m.title}</h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">בקרוב</span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug mt-1">{m.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        כשמדליקים מודול - הכלי שלו מופיע אוטומטית בתפריט הדשבורד ובאתר הציבורי. אפשר לשנות בכל רגע.
      </p>
    </div>
  );
};

export default DashboardModules;
