import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Lightbulb, TrendingDown, Eye, ShoppingCart, CreditCard, CheckCircle2 } from "lucide-react";

/**
 * Insights: a simple conversion funnel (visits -> add to cart -> checkout ->
 * purchase) built from page_views + analytics_events, plus plain-language
 * recommendations (e.g. high cart abandonment).
 */
interface Props {
  businessId?: string;
}

const RANGES = [
  { label: "7 ימים", days: 7 },
  { label: "30 ימים", days: 30 },
  { label: "90 ימים", days: 90 },
];

const DashboardInsights = ({ businessId }: Props) => {
  const [days, setDays] = useState(30);

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
    { label: "מבקרים", value: visits, icon: Eye, ofVisits: 100 },
    { label: "הוסיפו לעגלה", value: added, icon: ShoppingCart, ofVisits: pct(added, visits) },
    { label: "התחילו תשלום", value: checkout, icon: CreditCard, ofVisits: pct(checkout, visits) },
    { label: "רכשו", value: purchased, icon: CheckCircle2, ofVisits: pct(purchased, visits) },
  ];

  // Plain-language insights
  const insights: { tone: "good" | "warn"; text: string }[] = [];
  if (visits === 0) {
    insights.push({ tone: "warn", text: "אין עדיין תנועה לאתר בתקופה זו. שתפו את הקישור (וואטסאפ/רשתות) או שקלו פרסום ממומן. ראו גם 'מקורות הגעה'." });
  } else {
    if (added > 0 && purchased / added < 0.5) {
      insights.push({ tone: "warn", text: `נטישת עגלה גבוהה: ${pct(added - purchased, added)}% מהמוסיפים לעגלה לא השלימו רכישה. נסו משלוח חינם מעל סכום מסוים, קופון לרכישה ראשונה, או הפחתת שלבים בקופה.` });
    }
    if (pct(added, visits) < 10) {
      insights.push({ tone: "warn", text: `רק ${pct(added, visits)}% מהמבקרים מוסיפים לעגלה. שווה לשפר תמונות מוצר, תיאורים ומחירים, ולהבליט "הוסף לסל".` });
    }
    if (purchased > 0 && pct(purchased, visits) >= 2) {
      insights.push({ tone: "good", text: `יחס המרה יפה: ${pct(purchased, visits)}% מהמבקרים רכשו. המשיכו להביא תנועה איכותית!` });
    }
    if (purchased === 0 && added > 0) {
      insights.push({ tone: "warn", text: "יש עניין (הוספות לעגלה) אבל אין רכישות. ודאו שהסליקה מחוברת ושאין תקלה בקופה." });
    }
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-primary" /> תובנות
          </h1>
          <p className="text-sm text-muted-foreground mt-1">מסע הלקוח באתר, ואיפה אפשר להשתפר.</p>
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
        <h3 className="font-semibold text-foreground mb-4">משפך המרה</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">טוען...</p>
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
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2"><TrendingDown className="w-5 h-5 text-primary" /> המלצות לשיפור</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">טוען...</p>
        ) : insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">אסוף עוד נתונים (תנועה ורכישות) כדי לקבל המלצות מותאמות.</p>
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
        הנתונים נאספים מרגע שהאתר באוויר. ככל שתהיה יותר תנועה - התובנות מדויקות יותר.
      </p>
    </div>
  );
};

export default DashboardInsights;
