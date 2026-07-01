import { useState } from "react";
import { CreditCard, ExternalLink, Mail, Clock } from "lucide-react";
import PayplusConnectForm from "@/components/payments/PayplusConnectForm";
import PaymentApprovalKit from "@/components/payments/PaymentApprovalKit";
import type { BusinessSettings } from "@/components/dashboard/DashboardSettings";
import { PARTNER_LINKS, providerLogo } from "@/lib/partnerLinks";
import { supabase } from "@/integrations/supabase/client";

interface DashboardPaymentsProps {
  settings: BusinessSettings;
  onSettingsChange: (settings: BusinessSettings) => void;
}

const SUPPORT_EMAIL = "office@siango.app";

// Every acquirer we present - PayPlus (the in-app automatic checkout) plus all
// partners - shown NEUTRALLY. We deliberately don't push one provider over the
// others; the merchant chooses whoever suits them.
const PROVIDERS = [
  { id: "payplus", name: "PayPlus", domain: "payplus.co.il" },
  ...PARTNER_LINKS.map((p) => ({ id: p.id, name: p.name, domain: p.domain })),
];

const DashboardPayments = ({ settings }: DashboardPaymentsProps) => {
  // Progressive disclosure: one question at a time, so a non-technical merchant
  // isn't hit with a checklist + a wizard + 7 providers + API fields all at once.
  const [hasAccount, setHasAccount] = useState<null | boolean>(null);
  const [provider, setProvider] = useState<string | null>(null);

  const goToPartner = (id: string, url: string | null) => {
    if (settings.id) void supabase.from("partner_referrals").insert({ business_id: settings.id, provider: id } as any);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`בקשה לפתיחת חשבון ${id}`)}`;
  };

  const providerName = (id: string | null) => PROVIDERS.find((x) => x.id === id)?.name || "";

  return (
    <div className="p-4 md:p-6 max-w-xl" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">סליקת אשראי</h1>
          <p className="text-sm text-muted-foreground">חיבור סליקה מאפשר ללקוחות לשלם בכרטיס אשראי ישירות לחשבון שלכם.</p>
        </div>
      </div>

      {/* Step 0 - the only thing on screen at entry: one simple question. */}
      {hasAccount === null && (
        <div className="space-y-4">
          <p className="text-base font-medium text-foreground text-center">האם כבר פתחת חשבון אצל ספק סליקה?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setHasAccount(true)}
              className="rounded-xl bg-primary text-primary-foreground font-semibold py-4 px-5 hover:bg-primary/90 transition-colors"
            >
              כן, יש לי חשבון
            </button>
            <button
              type="button"
              onClick={() => setHasAccount(false)}
              className="rounded-xl border-2 border-border bg-card font-semibold py-4 px-5 hover:border-primary/40 transition-colors"
            >
              לא, אני מתחיל
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center">אפשר גם לקבל הזמנות בלי סליקה ולגבות תשלום ישירות מול הלקוח.</p>
        </div>
      )}

      {/* "No account yet" - open one. ALL providers, neutral, with logos. */}
      {hasAccount === false && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">בחרו ספק ופתחו חשבון</h2>
            <button type="button" onClick={() => setHasAccount(true)} className="text-xs text-primary hover:underline">
              כבר יש לי חשבון ←
            </button>
          </div>
          <p className="text-xs text-muted-foreground">כל הספקים שאנחנו עובדים איתם. פתיחת חשבון דרכנו לרוב מזכה בתנאים מועדפים. בוחרים מי שנוח לכם.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PARTNER_LINKS.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-4 flex flex-col">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <img src={providerLogo(p.domain)} alt={p.name} className="h-5 w-5 rounded" loading="lazy" />
                  <p className="font-bold text-foreground">{p.name}</p>
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{p.category}</span>
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
          <p className="text-xs text-muted-foreground text-center pt-2">לאחר שתקבלו אישור - חזרו לכאן ולחצו "כבר יש לי חשבון".</p>
        </div>
      )}

      {/* "Has account" - pick the provider, then connect. */}
      {hasAccount === true && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">באיזה ספק החשבון שלך?</h2>
            <button type="button" onClick={() => { setHasAccount(null); setProvider(null); }} className="text-xs text-muted-foreground hover:text-foreground">
              חזרה
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProvider(p.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors ${
                  provider === p.id ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                <img src={providerLogo(p.domain)} alt={p.name} className="h-4 w-4 rounded" loading="lazy" />
                {p.name}
              </button>
            ))}
          </div>

          {/* PayPlus is the acquirer with in-app automatic checkout today. */}
          {provider === "payplus" && (
            settings.id ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-border bg-card p-5">
                  <PayplusConnectForm businessId={settings.id} />
                </div>
                {/* Only surfaced here (after the merchant chose to connect) - never a
                    scary checklist on the entry screen. */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">השלב הבא: אישור לסליקת אשראי</h3>
                  <PaymentApprovalKit />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">יש לשמור את פרטי העסק לפני חיבור סליקה.</p>
            )
          )}

          {provider && provider !== "payplus" && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-start gap-3">
              <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="text-foreground font-medium mb-1">חיבור ישיר ל-{providerName(provider)} - בקרוב</p>
                <p>
                  בינתיים אפשר לקבל הזמנות באתר ולגבות דרך {providerName(provider)} מול הלקוח, או לחבר עכשיו את <b>PayPlus</b> לסליקה אוטומטית באתר.
                  נשמח לעזור - <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardPayments;
