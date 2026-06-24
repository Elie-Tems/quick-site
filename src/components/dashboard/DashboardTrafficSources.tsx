import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Radar, Users, Globe } from "lucide-react";

/**
 * Traffic sources: where the merchant's visitors come from. Built from page_views
 * (referrer + utm_source). Lets the merchant see Google / WhatsApp / direct / our
 * "built by Siango" credit / email, etc., with a date filter.
 */
interface Props {
  businessId?: string;
}

const RANGES = [
  { label: "7 ימים", days: 7 },
  { label: "30 ימים", days: 30 },
  { label: "90 ימים", days: 90 },
];

function categorize(referrer: string | null, utm: string | null): string {
  if (utm) {
    const map: Record<string, string> = {
      store_credit: 'קרדיט "נבנה ע"י Siango"',
      email: "מייל",
      referral: "הפניה",
      whatsapp: "וואטסאפ",
    };
    return map[utm] || utm;
  }
  const r = (referrer || "").toLowerCase();
  if (!r) return "כניסה ישירה";
  if (r.includes("google")) return "גוגל";
  if (r.includes("whatsapp") || r.includes("wa.me")) return "וואטסאפ";
  if (r.includes("instagram")) return "אינסטגרם";
  if (r.includes("facebook") || r.includes("fb.")) return "פייסבוק";
  if (r.includes("tiktok")) return "טיקטוק";
  if (r.includes("siango")) return "סיאנגו";
  try {
    return new URL(referrer!).hostname.replace(/^www\./, "");
  } catch {
    return "אחר";
  }
}

const DashboardTrafficSources = ({ businessId }: Props) => {
  const [days, setDays] = useState(30);

  const { data, isLoading } = useQuery({
    queryKey: ["traffic-sources", businessId, days],
    enabled: !!businessId,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data: rows } = await (supabase as any)
        .from("page_views")
        .select("referrer, utm_source, visitor_id, created_at")
        .eq("business_id", businessId)
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000);

      const list = (rows || []) as { referrer: string | null; utm_source: string | null; visitor_id: string | null }[];
      const counts: Record<string, number> = {};
      const visitors = new Set<string>();
      list.forEach((pv) => {
        const c = categorize(pv.referrer, pv.utm_source);
        counts[c] = (counts[c] || 0) + 1;
        if (pv.visitor_id) visitors.add(pv.visitor_id);
      });
      const sources = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      return { sources, total: list.length, visitors: visitors.size };
    },
  });

  const total = data?.total || 0;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Radar className="w-6 h-6 text-primary" /> מקורות הגעה
          </h1>
          <p className="text-sm text-muted-foreground mt-1">מאיפה המבקרים מגיעים לאתר שלך.</p>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                days === r.days ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Globe className="w-4 h-4" /> כניסות</div>
          <div className="text-2xl font-bold text-foreground">{total}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1"><Users className="w-4 h-4" /> מבקרים ייחודיים</div>
          <div className="text-2xl font-bold text-foreground">{data?.visitors || 0}</div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground mb-4">פילוח לפי מקור</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">טוען...</p>
        ) : !data?.sources.length ? (
          <p className="text-sm text-muted-foreground">אין עדיין נתוני תנועה לתקופה זו.</p>
        ) : (
          <div className="space-y-3">
            {data.sources.map(([name, count]) => {
              const pct = total ? Math.round((count / total) * 100) : 0;
              return (
                <div key={name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-foreground">{name}</span>
                    <span className="text-muted-foreground">{count} · {pct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        טיפ: לינקים מהמיילים ומהקרדיט באתרי הלקוחות מתויגים אוטומטית כדי שתדע מה עובד.
      </p>
    </div>
  );
};

export default DashboardTrafficSources;
