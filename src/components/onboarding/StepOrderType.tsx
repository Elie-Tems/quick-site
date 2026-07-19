import { Button } from "@/components/ui/button";
import { OnboardingData } from "@/pages/Onboarding";
import { ArrowLeft, ArrowRight, ShoppingCart, CreditCard, Check } from "lucide-react";
import { StepNavigation } from "./StepNavigation";
import { useLanguage } from "@/contexts/LanguageContext";

interface StepOrderTypeProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// titleKey/descKey/featureKeys resolve with t() at render (localized).
const options = [
  {
    id: "orders-only" as const,
    icon: ShoppingCart,
    titleKey: "ob.order.orders_only.title",
    descKey: "ob.order.orders_only.desc",
    featureKeys: ["ob.order.feat.orders", "ob.order.feat.crm", "ob.order.feat.email"],
  },
  {
    id: "orders-payments" as const,
    icon: CreditCard,
    titleKey: "ob.order.orders_payments.title",
    descKey: "ob.order.orders_payments.desc",
    featureKeys: ["ob.order.feat.orders", "ob.order.feat.online", "ob.order.feat.invoices"],
  },
];

const StepOrderType = ({ data, updateData, onNext, onBack }: StepOrderTypeProps) => {
  const { t } = useLanguage();
  const handleSelect = (id: typeof options[number]["id"]) => {
    updateData({ orderType: id });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <span className="inline-block text-sm font-semibold text-primary mb-3 px-3 py-1 rounded-full bg-primary/10">
          {t("ob.order.step5")}
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          {t("ob.order.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("ob.order.subtitle")}
        </p>
      </div>

      {/* Options */}
      <div className="space-y-4">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            className={`w-full p-6 rounded-xl border-2 transition-all duration-200 text-right ${
              data.orderType === option.id
                ? "border-primary bg-primary/5 shadow-soft"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
                data.orderType === option.id
                  ? "bg-gradient-to-br from-primary to-[hsl(280_60%_50%)]"
                  : "bg-surface-1"
              }`}>
                <option.icon className={`w-7 h-7 ${
                  data.orderType === option.id ? "text-white" : "text-foreground"
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg text-foreground">{t(option.titleKey)}</h3>
                  {data.orderType === option.id && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">{t(option.descKey)}</p>
                <div className="flex flex-wrap gap-2">
                  {option.featureKeys.map((featureKey, idx) => (
                    <span
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground"
                    >
                      {t(featureKey)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

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

export default StepOrderType;
