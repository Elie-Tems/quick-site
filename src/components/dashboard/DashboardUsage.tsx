import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Gauge, Image as ImageIcon, AlertTriangle, CreditCard, Zap } from "lucide-react";
import { AI_CREDIT_PACKAGES } from "@/lib/pricingConfig";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
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

  // The credits payment page (/ai-credits-payment) requires BOTH businessId and a
  // package in the URL - it has no in-page package picker, so linking without them
  // (as this button previously did) immediately bounces the merchant back with a
  // "no valid package selected" error toast. Pre-select the recommended package so
  // the button actually goes to a working checkout.
  const recommendedPackage = AI_CREDIT_PACKAGES.find((p) => p.recommended) ?? AI_CREDIT_PACKAGES[0];
  const creditsLink = businessId && recommendedPackage
    ? `/ai-credits-payment?businessId=${businessId}&package=${recommendedPackage.id}`
    : null;

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
          <Gauge className="w-6 h-6 text-primary" /> {t("dash.usage.page_title")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t("dash.usage.page_subtitle")}</p>
      </div>

      {/* Low credits alert */}
      {low && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              {remaining <= 0
                ? t("dash.usage.credits_depleted")
                : `${t("dash.usage.low_credits_prefix")} ${remaining} ${t("dash.usage.low_credits_suffix")}`}
            </p>
            <p className="text-sm text-amber-700/80 dark:text-amber-400/80 mt-0.5">
              {t("dash.usage.low_alert_desc")}
            </p>
          </div>
        </div>
      )}

      {/* Credits card */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Zap className="w-5 h-5 text-primary" /> {t("dash.usage.credits_card_title")}
          </div>
          {creditsLink ? (
            <Link
              to={creditsLink}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white text-sm font-medium px-3.5 py-2 hover:brightness-105"
            >
              <CreditCard className="w-4 h-4" /> {t("dash.usage.load_credits_button")}
            </Link>
          ) : null}
        </div>

        <div className="flex items-end gap-2 mb-3">
          <span className="text-4xl font-extrabold text-foreground">{remaining}</span>
          <span className="text-muted-foreground mb-1">{t("dash.usage.credits_remaining_label")}</span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full ${low ? "bg-amber-500" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {t("dash.usage.summary_used_prefix")}{used} {t("dash.usage.summary_out_of")} {total} {t("dash.usage.summary_credits_word")} ({FREE_CREDITS} {t("dash.usage.summary_free_word")}{purchased > 0 ? ` + ${purchased} ${t("dash.usage.summary_purchased_word")}` : ""}).
        </p>
      </div>

      {/* Stats */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <ImageIcon className="w-4 h-4" /> {t("dash.usage.images_generated_label")}
        </div>
        <div className="text-2xl font-bold text-foreground">{imagesCount ?? 0}</div>
        <p className="text-xs text-muted-foreground mt-1">{t("dash.usage.credit_per_image_note")}</p>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {t("dash.usage.footer_note")}
      </p>
    </div>
  );
};

export default DashboardUsage;
