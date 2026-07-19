import { OnboardingData } from "@/pages/Onboarding";
import { Check, Info } from "lucide-react";
import { StepNavigation } from "./StepNavigation";
import { providerLogo } from "@/lib/partnerLinks";
import { useLanguage } from "@/contexts/LanguageContext";

interface StepPaymentsProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// PayPlus is the only live provider; others are listed as "coming soon".
const comingSoon = [
  { name: "משולם / Grow", domain: "meshulam.co.il" },
  { name: "קארדקום", domain: "cardcom.co.il" },
  { name: "iCount", domain: "icount.co.il" },
  { name: "Tranzila", domain: "tranzila.com" },
  { name: "PayPal", domain: "paypal.com" },
];

const StepPayments = ({ data, updateData, onNext, onBack }: StepPaymentsProps) => {
  const { t } = useLanguage();
  const selected = data.paymentProvider === "payplus";

  const handleSkip = () => {
    updateData({ paymentProvider: null, paymentConnected: false });
    onNext();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <span className="inline-block text-sm font-semibold text-primary mb-3 px-3 py-1 rounded-full bg-primary/10">
          {t("ob.pay.step6")}
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{t("ob.pay.title")}</h1>
        <p className="text-muted-foreground">{t("ob.pay.subtitle")}</p>
      </div>

      {/* PayPlus - the live provider */}
      <button
        onClick={() => updateData({ paymentProvider: "payplus", paymentConnected: false })}
        className={`w-full p-5 rounded-xl border-2 transition-all duration-200 text-right ${
          selected ? "border-primary bg-primary/5 shadow-soft" : "border-border bg-card hover:border-primary/30"
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 border border-border overflow-hidden">
            <img src={providerLogo("payplus.co.il")} alt="PayPlus" className="w-7 h-7" loading="lazy" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">PayPlus</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium">{t("ob.pay.recommended")}</span>
            </div>
            <p className="text-sm text-muted-foreground">{t("ob.pay.payplus_desc")}</p>
          </div>
          {selected && (
            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
      </button>

      {/* What happens next */}
      {selected && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            {t("ob.pay.next_info")}
          </p>
        </div>
      )}

      {/* Coming soon */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <p className="text-xs font-medium text-muted-foreground mb-2">{t("ob.pay.coming_soon")}</p>
        <div className="flex flex-wrap gap-2">
          {comingSoon.map((p) => (
            <span key={p.name} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-surface-1 text-muted-foreground">
              <img src={providerLogo(p.domain)} alt={p.name} className="w-4 h-4 rounded-sm" loading="lazy" />
              {p.name}
            </span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {t("ob.pay.want_provider")}<span dir="ltr">office@siango.app</span>
        </p>
      </div>

      {/* Skip */}
      <button
        onClick={handleSkip}
        className="w-full text-center text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        {t("ob.pay.skip")}
      </button>

      {/* Navigation */}
      <StepNavigation
        onNext={onNext}
        onSaveAndContinue={onNext}
        onBack={onBack}
        nextLabel={t("ob.common.next")}
        saveLabel={t("ob.common.save")}
        showPreview={true}
        showSave={true}
      />
    </div>
  );
};

export default StepPayments;
