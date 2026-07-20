import { useState } from "react";
import { CreditCard, ExternalLink, Mail, ShieldCheck, CircleCheck, Sparkles, ArrowRight, CheckCircle2, AlertTriangle, Pencil } from "lucide-react";
import PayplusConnectForm from "@/components/payments/PayplusConnectForm";
import IcountConnectForm from "@/components/payments/IcountConnectForm";
import PaymentApprovalKit from "@/components/payments/PaymentApprovalKit";
import type { BusinessSettings } from "@/components/dashboard/DashboardSettings";
import { PARTNER_LINKS } from "@/lib/partnerLinks";
import { ProviderLogo } from "@/components/payments/ProviderLogo";
import { supabase } from "@/integrations/supabase/client";
import { usePaymentCredentials } from "@/hooks/usePayplus";
import { useLanguage } from "@/contexts/LanguageContext";

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

// Providers with in-app automated checkout. Others show "coming soon".
const CONNECTABLE = ["payplus", "icount"];

const DashboardPayments = ({ settings }: DashboardPaymentsProps) => {
  const { t } = useLanguage();
  const { data: payplusCreds } = usePaymentCredentials(settings.id);
  const isConnected = !!(settings as any).payment_enabled || !!payplusCreds?.verified_at;
  const connectedProvider = (settings as any).payment_provider as string | undefined;

  // Progressive disclosure: one question at a time, so a non-technical merchant
  // isn't hit with a checklist + a wizard + 7 providers + API fields all at once.
  const [hasAccount, setHasAccount] = useState<null | boolean>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  const goToPartner = (id: string, url: string | null) => {
    if (settings.id) void supabase.from("partner_referrals").insert({ business_id: settings.id, provider: id } as any);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`${t("dash.payments.mailto_subject_prefix")} ${id}`)}`;
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
            <h1 className="text-xl font-semibold text-foreground">{t("dash.payments.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("dash.payments.subtitle")}</p>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-[#085041] bg-[#e1f5ee] rounded-full px-3 py-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> {t("dash.payments.secure_badge")}
        </span>
      </div>

      {/* Connected status banner — shown when payment is already live */}
      {isConnected && !editMode && (
        <div className="rounded-2xl border border-[#639922] bg-[#eaf3de]/60 p-4 flex items-start gap-3 mb-2">
          <CheckCircle2 className="w-5 h-5 text-[#3b6d11] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#27500a]">
              {t("dash.payments.connected_title")}
              {connectedProvider && (
                <span className="mr-1.5 text-xs font-normal bg-[#dcebc7] text-[#27500a] rounded-full px-2 py-0.5 capitalize">{connectedProvider}</span>
              )}
              {payplusCreds?.mode === "test" && (
                <span className="mr-1.5 text-xs font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">TEST MODE</span>
              )}
            </p>
            <p className="text-sm text-[#3b6d11] mt-0.5">{t("dash.payments.connected_desc")}</p>
          </div>
          <button
            type="button"
            onClick={() => { setEditMode(true); setHasAccount(true); setProvider(connectedProvider ?? null); }}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs text-[#3b6d11] hover:underline"
          >
            <Pencil className="w-3.5 h-3.5" /> {t("dash.payments.edit")}
          </button>
        </div>
      )}

      {payplusCreds?.mode === "test" && !editMode && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-3 flex items-start gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            <span className="font-bold">{t("dash.payments.test_mode_active")}</span> — {t("dash.payments.test_mode_desc")}
          </p>
        </div>
      )}

      {/* When connected and not editing — done */}
      {isConnected && !editMode && null}

      {/* Step 0 - the only thing on screen at entry: one simple question. */}
      {!isConnected && hasAccount === null && (
        <div className="space-y-4">
          <p className="text-base font-medium text-foreground text-center">{t("dash.payments.step0_question")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setHasAccount(true)}
              className="group text-right rounded-2xl border-2 border-[#639922] bg-[#eaf3de]/60 p-4 hover:bg-[#eaf3de] transition-colors"
            >
              <CircleCheck className="w-6 h-6 text-[#3b6d11] mb-2" />
              <p className="font-semibold text-foreground">{t("dash.payments.has_account_yes")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("dash.payments.has_account_yes_desc")}</p>
            </button>
            <button
              type="button"
              onClick={() => setHasAccount(false)}
              className="group text-right rounded-2xl border border-border bg-card p-4 hover:border-[#639922]/50 transition-colors"
            >
              <Sparkles className="w-6 h-6 text-muted-foreground mb-2" />
              <p className="font-semibold text-foreground">{t("dash.payments.has_account_no")}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("dash.payments.has_account_no_desc")}</p>
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center">{t("dash.payments.no_processing_note")}</p>
        </div>
      )}

      {/* "No account yet" - open one. ALL providers, neutral, with logos. */}
      {!isConnected && hasAccount === false && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">{t("dash.payments.choose_provider_title")}</h2>
            <button type="button" onClick={() => setHasAccount(true)} className="inline-flex items-center gap-1 text-xs text-[#3b6d11] hover:underline">
              {t("dash.payments.already_have_account")} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{t("dash.payments.providers_intro")}</p>
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
                  {p.url ? (<>{t("dash.payments.open_account")} <ExternalLink className="h-3.5 w-3.5" /></>) : (<>{t("dash.payments.get_offer")} <Mail className="h-3.5 w-3.5" /></>)}
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center pt-2">{t("dash.payments.after_approval_note")}</p>
        </div>
      )}

      {/* "Has account" - pick the provider, then connect. */}
      {(hasAccount === true || editMode) && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">{t("dash.payments.which_provider")}</h2>
            <button type="button" onClick={() => { setHasAccount(null); setProvider(null); }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              {t("dash.payments.back")} <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map((p) => {
              const canConnect = CONNECTABLE.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => canConnect && setProvider(p.id)}
                  disabled={!canConnect}
                  title={!canConnect ? t("dash.payments.direct_connect_soon") : undefined}
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                    !canConnect
                      ? "border-border text-muted-foreground/50 opacity-50 cursor-not-allowed"
                      : provider === p.id
                      ? "border-[#639922] bg-[#eaf3de] text-[#27500a]"
                      : "border-border text-muted-foreground hover:border-[#639922]/40"
                  }`}
                >
                  <ProviderLogo domain={p.domain} name={p.name} className="h-4 w-4" />
                  {p.name}
                  {!canConnect && <span className="text-[9px] font-bold bg-muted rounded-full px-1.5 py-0.5">{t("dash.payments.coming_soon")}</span>}
                </button>
              );
            })}
          </div>

          {/* PayPlus is the acquirer with in-app automatic checkout today. */}
          {provider === "payplus" && (
            settings.id ? (
              <div className="space-y-5">
                <PayplusConnectForm businessId={settings.id} />
                {/* Only surfaced here (after the merchant chose to connect) - never a
                    scary checklist on the entry screen. */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-2">{t("dash.payments.next_step_approval")}</h3>
                  <PaymentApprovalKit />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("dash.payments.save_business_first")}</p>
            )
          )}

          {/* iCount storefront: the merchant connects their own iCount account. */}
          {provider === "icount" && (
            settings.id
              ? <IcountConnectForm businessId={settings.id} />
              : <p className="text-sm text-muted-foreground">{t("dash.payments.save_business_first")}</p>
          )}

        </div>
      )}
    </div>
  );
};

export default DashboardPayments;
