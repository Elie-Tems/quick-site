import { useState } from "react";
import { CreditCard, ExternalLink, Mail, Clock, ShieldCheck, CircleCheck, Sparkles, ArrowRight } from "lucide-react";
import PayplusConnectForm from "@/components/payments/PayplusConnectForm";
import IcountConnectForm from "@/components/payments/IcountConnectForm";
import PaymentApprovalKit from "@/components/payments/PaymentApprovalKit";
import type { BusinessSettings } from "@/components/dashboard/DashboardSettings";
import { PARTNER_LINKS } from "@/lib/partnerLinks";
import { ProviderLogo } from "@/components/payments/ProviderLogo";
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
      {/* Section header - polished with green accents; the bold green "secure"
          band is reserved for the connect step (the climax) so it isn't diluted. */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#eaf3de] flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 text-[#3b6d11]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">סליקת אשראי</h1>
            <p className="text-sm text-muted-foreground">קבלו תשלומים בכרטיס ישירות לחשבון הבנק שלכם</p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-[#085041] bg-[#e1f5ee] rounded-full px-3 py-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> מאובטח
        </span>
      </div>

      {/* Step 0 - the only thing on screen at entry: one simple question. */}
      {hasAccount === null && (
        <div className="space-y-4">
          <p className="text-base font-medium text-foreground text-center">האם כבר פתחת חשבון אצל ספק סליקה?</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setHasAccount(true)}
              className="group text-right rounded-2xl border-2 border-[#639922] bg-[#eaf3de]/60 p-4 hover:bg-[#eaf3de] transition-colors"
            >
              <CircleCheck className="w-6 h-6 text-[#3b6d11] mb-2" />
              <p className="font-semibold text-foreground">כן, יש לי חשבון</p>
              <p className="text-xs text-muted-foreground mt-0.5">נחבר אותו לאתר תוך 2 דקות</p>
            </button>
            <button
              type="button"
              onClick={() => setHasAccount(false)}
              className="group text-right rounded-2xl border border-border bg-card p-4 hover:border-[#639922]/50 transition-colors"
            >
              <Sparkles className="w-6 h-6 text-muted-foreground mb-2" />
              <p className="font-semibold text-foreground">לא, אני מתחיל</p>
              <p className="text-xs text-muted-foreground mt-0.5">נעזור לפתוח חשבון סליקה</p>
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
            <button type="button" onClick={() => setHasAccount(true)} className="inline-flex items-center gap-1 text-xs text-[#3b6d11] hover:underline">
              כבר יש לי חשבון <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">כל הספקים שאנחנו עובדים איתם. פתיחת חשבון דרכנו לרוב מזכה בתנאים מועדפים. בוחרים מי שנוח לכם.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PARTNER_LINKS.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-card p-4 flex flex-col hover:border-[#639922]/40 transition-colors">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <ProviderLogo domain={p.domain} name={p.name} className="h-6 w-6" />
                  <p className="font-bold text-foreground">{p.name}</p>
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">{p.category}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 flex-1 leading-relaxed">{p.blurb}</p>
                <button
                  type="button"
                  onClick={() => goToPartner(p.id, p.url)}
                  className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#eaf3de] text-[#3b6d11] text-sm font-medium px-3 py-2 hover:bg-[#dcebc7] transition-colors"
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
            <button type="button" onClick={() => { setHasAccount(null); setProvider(null); }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              חזרה <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProvider(p.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                  provider === p.id ? "border-[#639922] bg-[#eaf3de] text-[#27500a]" : "border-border text-muted-foreground hover:border-[#639922]/40"
                }`}
              >
                <ProviderLogo domain={p.domain} name={p.name} className="h-4 w-4" />
                {p.name}
              </button>
            ))}
          </div>

          {/* PayPlus is the acquirer with in-app automatic checkout today. */}
          {provider === "payplus" && (
            settings.id ? (
              <div className="space-y-5">
                <PayplusConnectForm businessId={settings.id} />
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

          {/* iCount storefront: the merchant connects their own iCount account. */}
          {provider === "icount" && (
            settings.id
              ? <IcountConnectForm businessId={settings.id} />
              : <p className="text-sm text-muted-foreground">יש לשמור את פרטי העסק לפני חיבור סליקה.</p>
          )}

          {provider && provider !== "payplus" && provider !== "icount" && (
            <div className="rounded-2xl border border-border bg-muted/30 p-4 flex items-start gap-3">
              <Clock className="h-5 w-5 text-[#3b6d11] shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="text-foreground font-medium mb-1">חיבור ישיר ל-{providerName(provider)} - בקרוב</p>
                <p>
                  בינתיים אפשר לקבל הזמנות באתר ולגבות דרך {providerName(provider)} מול הלקוח, או לחבר עכשיו את <b>PayPlus</b> לסליקה אוטומטית באתר.
                  נשמח לעזור - <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#3b6d11] hover:underline">{SUPPORT_EMAIL}</a>.
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
