import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Lightbulb, TrendingDown, Eye, ShoppingCart, CreditCard, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Insights: a simple conversion funnel (visits -> add to cart -> checkout ->
 * purchase) built from page_views + analytics_events, plus plain-language
 * recommendations (e.g. high cart abandonment).
 */
interface Props {
  businessId?: string;
}

const getRanges = (t: (key: string) => string) => [
  { label: t("dash.insights.range_7d"), days: 7 },
  { label: t("dash.insights.range_30d"), days: 30 },
  { label: t("dash.insights.range_90d"), days: 90 },
];

const DashboardInsights = ({ businessId }: Props) => {
  const { t } = useLanguage();
  const [days, setDays] = useState(30);
  const RANGES = getRanges(t);

  const { data, isLoading } = useQuery({
    queryKey: ["insights", businessId, days],
    enabled: !!businessId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceIso = since.toISOString();

      const [pv, ev] = await Promise.all([
        (supabase as any).from("page_views").select("visitor_id").eq("business_id", businessId).gte("created_at", sinceIso).limit(20000),
        (supabase as any).from("analytics_events").select("visitor_id, event_type").eq("business_id", businessId).gte("created_at", sinceIso).limit(20000),
      ]);

      const visitors = new Set((pv.data || []).map((r: any) => r.visitor_id).filter(Boolean));
      const setFor = (type: string) =>
        new Set((ev.data || []).filter((r: any) => r.event_type === type).map((r: any) => r.visitor_id).filter(Boolean));

      const added = setFor("add_to_cart");
      const checkout = setFor("begin_checkout");
      const purchased = setFor("purchase");

      return {
        visits: visitors.size,
        added: added.size,
        checkout: checkout.size,
        purchased: purchased.size,
      };
    },
  });

  const visits = data?.visits || 0;
  const added = data?.added || 0;
  const checkout = data?.checkout || 0;
  const purchased = data?.purchased || 0;

  const pct = (n: number, base: number) => (base > 0 ? Math.round((n / base) * 100) : 0);
  const funnel = [
    { label: t("dash.insights.funnel_visitors"), value: visits, icon: Eye, ofVisits: 100 },
    { label: t("dash.insights.funnel_added_to_cart"), value: added, icon: ShoppingCart, ofVisits: pct(added, visits) },
    { label: t("dash.insights.funnel_began_checkout"), value: checkout, icon: CreditCard, ofVisits: pct(checkout, visits) },
    { label: t("dash.insights.funnel_purchased"), value: purchased, icon: CheckCircle2, ofVisits: pct(purchased, visits) },
  ];

  // Plain-language insights
  const insights: { tone: "good" | "warn"; text: string }[] = [];
  if (visits === 0) {
    insights.push({ tone: "warn", text: t("dash.insights.no_traffic") });
  } else {
    if (added > 0 && purchased / added < 0.5) {
      insights.push({ tone: "warn", text: `${t("dash.insights.cart_abandonment_prefix")} ${pct(added - purchased, added)}${t("dash.insights.cart_abandonment_suffix")}` });
    }
    if (pct(added, visits) < 10) {
      insights.push({ tone: "warn", text: `${t("dash.insights.low_add_to_cart_prefix")} ${pct(added, visits)}${t("dash.insights.low_add_to_cart_suffix")}` });
    }
    if (purchased > 0 && pct(purchased, visits) >= 2) {
      insights.push({ tone: "good", text: `${t("dash.insights.good_conversion_prefix")} ${pct(purchased, visits)}${t("dash.insights.good_conversion_suffix")}` });
    }
    if (purchased === 0 && added > 0) {
      insights.push({ tone: "warn", text: t("dash.insights.interest_no_purchase") });
    }
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-primary" /> {t("dash.insights.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{t("dash.insights.subtitle")}</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {RANGES.map((r) => (
            <button key={r.days} onClick={() => setDays(r.days)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${days === r.days ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Funnel */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground mb-4">{t("dash.insights.funnel_title")}</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("dash.insights.loading")}</p>
        ) : (
          <div className="space-y-3">
            {funnel.map((step) => (
              <div key={step.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="flex items-center gap-2 text-foreground"><step.icon className="w-4 h-4 text-primary" /> {step.label}</span>
                  <span className="text-muted-foreground">{step.value} · {step.ofVisits}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${step.ofVisits}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Insights */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-primary" /> {t("dash.insights.recommendations_title")}</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t("dash.insights.loading")}</p>
        ) : insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dash.insights.empty_recommendations")}</p>
        ) : (
          <div className="space-y-2.5">
            {insights.map((ins, i) => (
              <div key={i} className={`rounded-lg p-3 text-sm border ${ins.tone === "good" ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400" : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"}`}>
                {ins.text}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {t("dash.insights.footer_note")}
      </p>
    </div>
  );
};

export default DashboardInsights;
