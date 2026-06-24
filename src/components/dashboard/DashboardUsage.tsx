import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Image as ImageIcon, AlertTriangle, Bot, CreditCard, Zap } from "lucide-react";

/**
 * Usage & AI — lets the merchant see how much of the paid AI (image generation)
 * they've consumed, with a low-balance alert. The support bot is included in the
 * plan, so it's shown as "included" rather than metered.
 */
const LOW_THRESHOLD = 10;
const FREE_CREDITS = 50;

interface Props {
  businessId?: string;
}

const DashboardUsage = ({ businessId }: Props) => {
  const { data: credits } = useQuery({
    queryKey: ["ai-credits", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("ai_credits")
        .select("credits_remaining, total_credits_purchased, free_credits_granted")
        .eq("business_id", businessId)
        .maybeSingle();
      return data as { credits_remaining: number; total_credits_purchased: number; free_credits_granted: boolean } | null;
    },
  });

  const { data: imagesCount } = useQuery({
    queryKey: ["ai-jobs-count", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("ai_image_jobs")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId);
      return count ?? 0;
    },
  });

  const remaining = credits?.credits_remaining ?? 0;
  const purchased = credits?.total_credits_purchased ?? 0;
  const total = FREE_CREDITS + purchased;
  const used = Math.max(0, total - remaining);
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const low = remaining <= LOW_THRESHOLD;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" /> שימוש ו-AI
        </h1>
        <p className="text-muted-foreground text-sm mt-1">מעקב אחר השימוש שלך בכלי ה-AI בתשלום.</p>
      </div>

      {/* Low credits alert */}
      {low && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              {remaining <= 0 ? "נגמרו הקרדיטים ליצירת תמונות AI" : `נשארו רק ${remaining} קרדיטים`}
            </p>
            <p className="text-sm text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              טענו קרדיטים נוספים כדי להמשיך ליצור ולשדרג תמונות מוצר.
            </p>
          </div>
        </div>
      )}

      {/* Credits card */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Zap className="w-5 h-5 text-primary" /> קרדיטים ליצירת תמונות AI
          </div>
          <Link
            to="/ai-credits-payment"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white text-sm font-medium px-3.5 py-2 hover:brightness-105"
          >
            <CreditCard className="w-4 h-4" /> טען קרדיטים
          </Link>
        </div>

        <div className="flex items-end gap-2 mb-3">
          <span className="text-4xl font-extrabold text-foreground">{remaining}</span>
          <span className="text-muted-foreground mb-1">קרדיטים נותרו</span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${low ? "bg-amber-500" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          השתמשת ב-{used} מתוך {total} קרדיטים ({FREE_CREDITS} חינם{purchased > 0 ? ` + ${purchased} שנרכשו` : ""}).
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <ImageIcon className="w-4 h-4" /> תמונות AI שנוצרו
          </div>
          <div className="text-2xl font-bold text-foreground">{imagesCount ?? 0}</div>
          <p className="text-xs text-muted-foreground mt-1">כל יצירה/שדרוג תמונה מנכה קרדיט אחד.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Bot className="w-4 h-4" /> בוט שירות ותמיכה
          </div>
          <div className="text-lg font-bold text-primary">כלול בתוכנית</div>
          <p className="text-xs text-muted-foreground mt-1">ללא הגבלת שימוש וללא צריכת קרדיטים.</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        אם תהיה בעיה בתשלום או בחשבון - תקפוץ לך התראה בראש הדשבורד, ונעדכן אותך גם במייל.
      </p>
    </div>
  );
};

export default DashboardUsage;
