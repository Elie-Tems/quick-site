import { useMyBusiness } from "@/hooks/useBusiness";
import { Check, X, Copy, ExternalLink, ShieldCheck, Info } from "lucide-react";
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
  const allReady = checks.every((c) => c.ok);

  const copy = (url: string) => {
    navigator.clipboard?.writeText(url);
    toast.success("הקישור הועתק");
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 mb-6" dir="rtl">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <h2 className="text-lg font-bold text-foreground">קבלת אישור סליקה מחברת האשראי</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        כדי שחברת האשראי תאשר לכם סליקה, הם צריכים לראות אתר חי עם תקנון, מדיניות, ופרטי קשר.
        הנה כל מה שצריך - מוכן לשליחה:
      </p>

      {/* Readiness checklist */}
      <div className="space-y-1.5 mb-4">
        {checks.map((c, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {c.ok ? (
              <Check className="w-4 h-4 text-green-600 shrink-0" />
            ) : (
              <X className="w-4 h-4 text-destructive shrink-0" />
            )}
            <span className={c.ok ? "text-foreground" : "text-destructive"}>{c.label}</span>
          </div>
        ))}
      </div>

      {!published ? (
        <div className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-lg p-3">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          פרסמו את האתר תחילה (אחרי תשלום המנוי) - ואז תקבלו כאן קישור מוכן לשליחה לחברת האשראי.
        </div>
      ) : (
        <>
          {/* Copy site link */}
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg p-2 mb-3">
            <span className="flex-1 text-sm text-foreground truncate" dir="ltr">{siteUrl}</span>
            <button onClick={() => copy(siteUrl)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-white text-sm px-3 py-1.5 hover:brightness-105 shrink-0">
              <Copy className="w-4 h-4" /> העתק קישור
            </button>
          </div>

          {/* Direct links to legal pages */}
          <div className="flex flex-wrap gap-3 text-sm mb-3">
            <a href={`/store/${slug}/terms`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              <ExternalLink className="w-3.5 h-3.5" /> תקנון
            </a>
            <a href={`/store/${slug}/privacy`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              <ExternalLink className="w-3.5 h-3.5" /> מדיניות פרטיות
            </a>
            <a href={siteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              <ExternalLink className="w-3.5 h-3.5" /> צפייה באתר
            </a>
          </div>

          <p className="text-xs text-muted-foreground">
            {allReady
              ? "✓ הכל מוכן. העתיקו את הקישור ושלחו לחברת האשראי / PayPlus לקבלת אישור."
              : "השלימו את הסעיפים המסומנים באדום (בהגדרות העסק) לפני השליחה."}
          </p>
        </>
      )}
    </div>
  );
};

export default PaymentApprovalKit;
