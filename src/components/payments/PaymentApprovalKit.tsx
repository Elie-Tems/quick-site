import { useMyBusiness } from "@/hooks/useBusiness";
import { Copy, ExternalLink, ShieldCheck, Info, CircleCheck, CircleX } from "lucide-react";
import { toast } from "sonner";

/**
 * "Payment approval kit": helps a merchant get approved for credit-card
 * processing. The card company requires a LIVE site with terms/privacy/refund
 * + contact details. This shows a readiness checklist and a one-click copy of
 * the site link to send them. Only meaningful once the site is published.
 */
const SITE_BASE = "https://siango.app";

const PaymentApprovalKit = () => {
  const { data: business } = useMyBusiness();
  const biz = business as any;

  if (!biz) return null;

  const slug = biz.slug;
  const siteUrl = `${SITE_BASE}/store/${slug}`;
  const published = !!biz.is_published;

  const checks = [
    { ok: published, label: "האתר חי ומפורסם" },
    { ok: !!biz.name, label: "שם העסק" },
    { ok: !!biz.phone, label: "טלפון ליצירת קשר" },
    { ok: !!(biz.delivery_address || biz.address), label: "כתובת העסק" },
    { ok: true, label: "תקנון ומדיניות פרטיות (נוצרו אוטומטית)" },
  ];
  const ready = checks.filter((c) => c.ok).length;
  const allReady = ready === checks.length;

  const copy = (url: string) => {
    navigator.clipboard?.writeText(url);
    toast.success("הקישור הועתק");
  };

  return (
    <div dir="rtl" className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-3 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-[#eaf3de] flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5 text-[#3b6d11]" />
        </div>
        <div className="flex-1">
          <h2 className="text-[15px] font-semibold text-foreground">אישור סליקה מחברת האשראי</h2>
          <p className="text-xs text-muted-foreground mt-0.5">כדי לאשר סליקה, חברת האשראי צריכה לראות אתר חי עם תקנון, מדיניות ופרטי קשר.</p>
        </div>
        <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-[#085041] bg-[#e1f5ee] rounded-full px-3 py-1.5 whitespace-nowrap">
          {ready}/{checks.length} מוכן
        </span>
      </div>

      <div className="px-5 py-4">
        {/* Readiness checklist */}
        <div className="space-y-2 mb-4">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center gap-2.5 text-sm">
              {c.ok ? (
                <CircleCheck className="w-[18px] h-[18px] text-[#1d9e75] shrink-0" />
              ) : (
                <CircleX className="w-[18px] h-[18px] text-destructive shrink-0" />
              )}
              <span className={c.ok ? "text-foreground" : "text-destructive"}>{c.label}</span>
            </div>
          ))}
        </div>

        {!published ? (
          <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-xl p-3">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            פרסמו את האתר תחילה (אחרי תשלום המנוי) - ואז יופיע כאן קישור מוכן לשליחה לחברת האשראי.
          </div>
        ) : (
          <>
            {/* Copy site link */}
            <div className="flex items-center gap-2 bg-[#f1f4ec] dark:bg-muted/40 border border-border rounded-xl p-2 mb-3">
              <span className="flex-1 text-[13px] font-mono text-foreground truncate px-1" dir="ltr">{siteUrl}</span>
              <button onClick={() => copy(siteUrl)} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1d9e75] hover:bg-[#178a65] text-white text-sm px-3 py-2 shrink-0 transition-colors">
                <Copy className="w-4 h-4" /> העתק קישור
              </button>
            </div>

            {/* Direct links to legal pages */}
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { href: `/store/${slug}/terms`, label: "תקנון" },
                { href: `/store/${slug}/privacy`, label: "מדיניות פרטיות" },
                { href: siteUrl, label: "צפייה באתר" },
              ].map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#3b6d11] bg-[#eaf3de] hover:bg-[#dcebc7] rounded-lg px-3 py-1.5 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> {l.label}
                </a>
              ))}
            </div>

            <p className={`text-xs flex items-center gap-1.5 ${allReady ? "text-[#0f6e56]" : "text-muted-foreground"}`}>
              {allReady ? <CircleCheck className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
              {allReady
                ? "הכל מוכן. העתיקו את הקישור ושלחו לחברת האשראי / PayPlus לקבלת אישור."
                : "השלימו את הסעיפים המסומנים באדום (בהגדרות העסק) לפני השליחה."}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentApprovalKit;
