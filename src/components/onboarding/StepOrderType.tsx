import { Button } from "@/components/ui/button";
import { OnboardingData } from "@/pages/Onboarding";
import { ArrowLeft, ArrowRight, ShoppingCart, CreditCard, Check } from "lucide-react";
import { StepNavigation } from "./StepNavigation";

interface StepOrderTypeProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const options = [
  {
    id: "orders-only" as const,
    icon: ShoppingCart,
    title: "מערכת הזמנות בלבד",
    description: "קבלת הזמנות ללא סליקה אונליין. אפשר לגבות בהעברה או במזומן.",
    features: ["קבלת הזמנות", "ניהול לקוחות", "התראות אימייל"],
  },
  {
    id: "orders-payments" as const,
    icon: CreditCard,
    title: "הזמנות + סליקה אונליין",
    description: "קבלת תשלום מיידי דרך כרטיס אשראי או ביט.",
    features: ["קבלת הזמנות", "סליקה אונליין", "חשבוניות אוטומטיות"],
  },
];

const StepOrderType = ({ data, updateData, onNext, onBack }: StepOrderTypeProps) => {
  const handleSelect = (id: typeof options[number]["id"]) => {
    updateData({ orderType: id });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <span className="inline-block text-sm font-semibold text-primary mb-3 px-3 py-1 rounded-full bg-primary/10">
          שלב 5
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          איך תרצו לקבל הזמנות?
        </h1>
        <p className="text-muted-foreground">
          תמיד אפשר לשנות את זה בהמשך
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
                  <h3 className="font-semibold text-lg text-foreground">{option.title}</h3>
                  {data.orderType === option.id && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">{option.description}</p>
                <div className="flex flex-wrap gap-2">
                  {option.features.map((feature, idx) => (
                    <span 
                      key={idx}
                      className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground"
                    >
                      {feature}
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
        nextLabel="הבא"
        saveLabel="שמרו והמשיכו"
        showPreview={true}
        showSave={true}
      />
    </div>
  );
};

export default StepOrderType;
