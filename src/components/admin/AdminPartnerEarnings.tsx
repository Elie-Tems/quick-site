import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Handshake, ExternalLink, Info } from "lucide-react";

/**
 * Partner earnings: what Siango is owed from each payment/billing partner.
 * Terms are the real signed-agreement values. Merchant counts come from
 * businesses.payment_provider (admin-readable; we never touch the sensitive
 * payment_credentials here). Exact %-based amounts come from each provider's
 * own dashboard - we show our referral count + an estimate where computable.
 */

interface Partner {
  key: string;
  name: string;
  match: string[]; // values of businesses.payment_provider that count for this partner
  commission: string;
  model: string;
  qualifying: string;
  cycle: string;
  perMerchant: number | null; // flat ₪ per qualifying merchant (one-time), else null
  note?: string;
  link?: string;
}

// Real terms from the signed agreements (2026-06-25). Update here if they change.
const PARTNERS: Partner[] = [
  {
    key: "hyp",
    name: "HYP (היפ)",
    match: ["hyp", "yaad"],
    commission: "50% מעלות ההקמה (מינ׳ ₪100)",
    model: "חד-פעמי לכל עסק",
    qualifying: "עסק חדש, פעיל 3 חודשים ושילם",
    cycle: "רבעוני · שוטף+60 · מול חשבונית",
    perMerchant: 100,
  },
  {
    key: "cardcom",
    name: "Cardcom",
    match: ["cardcom"],
    commission: "20% מ-(עמלת הסליקה − 0.65%) × מחזור חודשי",
    model: "חוזר חודשי, לכל חיי הלקוח",
    qualifying: "נרשם דרך הלינק שלנו",
    cycle: "התחשבנות ב-25 לחודש · מינ׳ ₪500 · מול חשבונית",
    perMerchant: null,
    note: "הסכום המדויק תלוי במחזור של כל עסק - מגיע מדוח Cardcom.",
  },
  {
    key: "icount",
    name: "iCount",
    match: [],
    commission: "15% ממה ש-iCount מקבל",
    model: "חוזר",
    qualifying: "דרך קוד שותף 862330",
    cycle: "מדשבורד iCount",
    perMerchant: null,
    note: "לא נמדד אצלנו - הסכום המדויק בדשבורד השותפים של iCount.",
    link: "https://app.icount.co.il/admin/affiliate.php",
  },
  {
    key: "payplus",
    name: "PayPlus",
    match: ["payplus"],
    commission: "ממתין לתנאים",
    model: "-",
    qualifying: "-",
    cycle: "-",
    perMerchant: null,
    note: "התנאים טרם התקבלו מ-PayPlus.",
  },
];

const usePartnerCounts = () =>
  useQuery({
    queryKey: ["partner-provider-counts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("businesses")
        .select("payment_provider")
        .not("payment_provider", "is", null)
        .limit(10000);
      const counts: Record<string, number> = {};
      (data || []).forEach((r: { payment_provider: string | null }) => {
        const p = (r.payment_provider || "").toLowerCase().trim();
        if (p) counts[p] = (counts[p] || 0) + 1;
      });
      return counts;
    },
  });

const AdminPartnerEarnings = () => {
  const { data: counts, isLoading } = usePartnerCounts();

  const countFor = (p: Partner) =>
    p.match.reduce((sum, m) => sum + (counts?.[m] || 0), 0);

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-start gap-3">
        <Handshake className="w-7 h-7 text-primary shrink-0" />
        <div>
          <h2 className="text-xl font-bold text-foreground">רווחי שותפים</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            כמה מגיע לנו מכל חברה. ספירת החנויות מהמערכת; סכומים מבוססי-אחוז מגיעים מהדוח של כל ספק.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PARTNERS.map((p) => {
          const n = countFor(p);
          const estimate = p.perMerchant != null ? n * p.perMerchant : null;
          return (
            <div key={p.key} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground">{p.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{p.model}</span>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {isLoading ? "…" : p.match.length ? n : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">חנויות מחוברות דרכנו</div>
                </div>
                {estimate != null && (
                  <div className="text-left">
                    <div className="text-2xl font-bold text-primary">₪{estimate.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">הערכה (חד-פעמי)</div>
                  </div>
                )}
              </div>

              <dl className="text-sm space-y-1 pt-2 border-t border-border">
                <div className="flex justify-between gap-2"><dt className="text-muted-foreground">עמלה</dt><dd className="text-foreground text-left">{p.commission}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted-foreground">מזכה</dt><dd className="text-foreground text-left">{p.qualifying}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-muted-foreground">מחזור תשלום</dt><dd className="text-foreground text-left">{p.cycle}</dd></div>
              </dl>

              {p.note && (
                <p className="text-xs text-muted-foreground flex items-start gap-1.5 bg-muted/40 rounded-lg p-2">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {p.note}
                </p>
              )}
              {p.link && (
                <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                  פתח דשבורד שותפים <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        ההערכה ל-HYP היא רצפה (₪100 לעסק מזכה); הסכום בפועל תלוי בעלות ההקמה ובכך שהעסק פעיל 3 חודשים ושילם.
      </p>
    </div>
  );
};

export default AdminPartnerEarnings;
