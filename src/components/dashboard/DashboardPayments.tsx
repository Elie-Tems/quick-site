import { CreditCard, Star, ExternalLink, Mail } from "lucide-react";
import PayplusConnectForm from "@/components/payments/PayplusConnectForm";
import PaymentsQuickStart from "@/components/payments/PaymentsQuickStart";
import PaymentApprovalKit from "@/components/payments/PaymentApprovalKit";
import type { BusinessSettings } from "@/components/dashboard/DashboardSettings";
import { PARTNER_LINKS, PAYPLUS_AFFILIATE_URL } from "@/lib/partnerLinks";
import { supabase } from "@/integrations/supabase/client";

interface DashboardPaymentsProps {
  settings: BusinessSettings;
  onSettingsChange: (settings: BusinessSettings) => void;
}

const SUPPORT_EMAIL = "office@siango.app";

const DashboardPayments = ({ settings }: DashboardPaymentsProps) => {
  // Log the referral (so we can track who we sent to each partner) then open
  // the partner's signup link, or fall back to contacting us if not live yet.
  const goToPartner = (id: string, url: string | null) => {
    if (settings.id) {
      void supabase.from("partner_referrals").insert({ business_id: settings.id, provider: id } as any);
    }
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`בקשה לפתיחת חשבון ${id}`)}`;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">סליקת אשראי</h1>
          <p className="text-sm text-muted-foreground">חברו סליקה כדי לקבל תשלומים בכרטיס אשראי ישירות לחשבון שלכם</p>
        </div>
      </div>

      <PaymentApprovalKit />

      <PaymentsQuickStart />

      {/* Primary in-app sliqa: PayPlus */}
      <div className="rounded-xl border-2 border-primary bg-primary/5 p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/12 rounded-full px-2 py-0.5">
            <Star className="h-3 w-3" /> מומלץ
          </span>
        </div>
        <p className="text-lg font-bold text-foreground">PayPlus</p>
        <p className="text-sm text-muted-foreground mb-4">מעטפת מלאה - סליקה · דף תשלום · חשבוניות. חיבור מהיר.</p>
        {settings.id ? (
          <PayplusConnectForm businessId={settings.id} />
        ) : (
          <p className="text-sm text-muted-foreground">יש לשמור את פרטי העסק לפני חיבור סליקה.</p>
        )}
        {PAYPLUS_AFFILIATE_URL && (
          <button
            type="button"
            onClick={() => goToPartner("payplus", PAYPLUS_AFFILIATE_URL)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            אין לכם עדיין חשבון PayPlus? פתחו דרכנו <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Partner providers - open an account through us (preferred terms) */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-foreground mb-1">שותפי סליקה וחשבוניות</h2>
        <p className="text-xs text-muted-foreground mb-3">פתחו חשבון דרכנו ותיהנו מתנאים מועדפים.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PARTNER_LINKS.map((p) => (
            <div key={p.id} className={`rounded-xl border bg-card p-4 flex flex-col ${p.highlight ? "border-primary ring-1 ring-primary/30" : "border-border"}`}>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-foreground">{p.name}</p>
                {p.highlight && <span className="text-[10px] font-bold text-primary bg-primary/10 rounded-full px-1.5 py-0.5">מומלץ</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-1 flex-1">{p.blurb}</p>
              <button
                type="button"
                onClick={() => goToPartner(p.id, p.url)}
                className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium px-3 py-2 hover:bg-primary/15 transition-colors"
              >
                {p.url ? (<>פתח חשבון <ExternalLink className="h-3.5 w-3.5" /></>) : (<>קבל הצעה <Mail className="h-3.5 w-3.5" /></>)}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPayments;
