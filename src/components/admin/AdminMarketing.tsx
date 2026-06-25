import { useState } from "react";
import { Megaphone, Eye, Target, Wallet, TrendingUp } from "lucide-react";
import { useAdminMarketing } from "@/hooks/useAdminMarketing";

const fmt = (n: number) => n.toLocaleString("he-IL");
const ils = (n: number) => `₪${fmt(Math.round(n))}`;

const RANGES = [
  { label: "7 ימים", days: 7 },
  { label: "30 ימים", days: 30 },
  { label: "90 ימים", days: 90 },
];

/**
 * Super-admin marketing view: ad budget per channel + per-source performance
 * (views, conversions, revenue) across ALL stores. Each ad link is UTM-tagged,
 * so we attribute conversions to the buyer's traffic source.
 */
const AdminMarketing = () => {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useAdminMarketing(days);

  const stats = [
    { label: "תקציב פרסום (סה\"כ)", value: data ? ils(data.totals.budget) : undefined, icon: Wallet },
    { label: "צפיות מפרסום", value: data ? fmt(data.totals.views) : undefined, icon: Eye },
    { label: "המרות", value: data ? fmt(data.totals.conversions) : undefined, icon: Target },
    { label: "הכנסות משויכות", value: data ? ils(data.totals.revenue) : undefined, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Megaphone className="w-7 h-7 text-primary shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-foreground">פרסום ושיווק</h2>
            <p className="text-sm text-muted-foreground mt-0.5">תקציב לפי ערוץ + ביצועי כל מקור (צפיות, המרות, הכנסות) על פני כל החנויות.</p>
          </div>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${days === r.days ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold text-foreground truncate">{isLoading || s.value === undefined ? "…" : s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Budget per channel */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground mb-3">תקציב פרסום לפי ערוץ</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">טוען...</p>
        ) : !data?.channels.length ? (
          <p className="text-sm text-muted-foreground">עדיין אין ערוצי פרסום מוגדרים בחנויות.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-right font-medium py-2">ערוץ</th>
                  <th className="text-left font-medium py-2">תקציב</th>
                  <th className="text-left font-medium py-2">מחזור</th>
                  <th className="text-left font-medium py-2">חנויות</th>
                </tr>
              </thead>
              <tbody>
                {data.channels.map((c) => (
                  <tr key={c.name} className="border-b border-border/50">
                    <td className="py-2.5 text-foreground font-medium">{c.name}</td>
                    <td className="py-2.5 text-left text-foreground">{ils(c.totalBudget)}</td>
                    <td className="py-2.5 text-left text-muted-foreground">{c.period === "monthly" ? "חודשי" : c.period === "weekly" ? "שבועי" : c.period}</td>
                    <td className="py-2.5 text-left text-muted-foreground">{c.businesses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Source performance */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground mb-3">ביצועים לפי מקור (כל לינק)</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">טוען...</p>
        ) : !data?.sources.length ? (
          <p className="text-sm text-muted-foreground">אין עדיין נתוני תנועה מתויגי-UTM לתקופה זו.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-right font-medium py-2">מקור</th>
                  <th className="text-left font-medium py-2">צפיות</th>
                  <th className="text-left font-medium py-2">המרות</th>
                  <th className="text-left font-medium py-2">יחס המרה</th>
                  <th className="text-left font-medium py-2">הכנסות</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map((s) => (
                  <tr key={s.source} className="border-b border-border/50">
                    <td className="py-2.5 text-foreground font-medium" dir="ltr">{s.source}</td>
                    <td className="py-2.5 text-left text-foreground">{fmt(s.views)}</td>
                    <td className="py-2.5 text-left text-foreground">{fmt(s.conversions)}</td>
                    <td className="py-2.5 text-left text-muted-foreground">{s.convRate}%</td>
                    <td className="py-2.5 text-left text-primary font-medium">{s.revenue ? ils(s.revenue) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          המרות משויכות למקור לפי ה-UTM שדרכו הגיע המבקר שביצע רכישה. לינקים מתויגים נוצרים בדשבורד הסוחר (פרסום ותקציב).
        </p>
      </div>
    </div>
  );
};

export default AdminMarketing;
