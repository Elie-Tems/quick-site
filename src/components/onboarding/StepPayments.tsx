import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingData } from "@/pages/Onboarding";
import { ArrowLeft, ArrowRight, Check, AlertCircle, Loader2 } from "lucide-react";
import { StepNavigation } from "./StepNavigation";

interface StepPaymentsProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const providers = [
  {
    id: "icredit" as const,
    name: "iCredit",
    logo: "💳",
    description: "סליקת אשראי מובילה בישראל",
  },
  {
    id: "cardcom" as const,
    name: "Cardcom",
    logo: "🔐",
    description: "פתרון סליקה אמין ומהיר",
  },
  {
    id: "paypal" as const,
    name: "PayPal",
    logo: "🌍",
    description: "תשלומים בינלאומיים",
  },
];

const StepPayments = ({ data, updateData, onNext, onBack }: StepPaymentsProps) => {
  const [apiKey, setApiKey] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState("");

  const handleSelectProvider = (id: typeof providers[number]["id"]) => {
    updateData({ paymentProvider: id, paymentConnected: false });
    setApiKey("");
    setError("");
  };

  const handleConnect = async () => {
    if (!apiKey) {
      setError("נא להזין מפתח API");
      return;
    }
    
    setIsConnecting(true);
    setError("");
    
    // Simulate API connection
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    updateData({ paymentConnected: true });
    setIsConnecting(false);
  };

  const handleSkip = () => {
    updateData({ paymentProvider: null, paymentConnected: false });
    onNext();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <span className="inline-block text-sm font-semibold text-primary mb-3 px-3 py-1 rounded-full bg-primary/10">
          שלב 6
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          חיבור סליקה
        </h1>
        <p className="text-muted-foreground">
          בחר ספק סליקה וחבר את החשבון שלך
        </p>
      </div>

      {/* Provider selection */}
      <div className="space-y-3">
        {providers.map((provider) => (
          <button
            key={provider.id}
            onClick={() => handleSelectProvider(provider.id)}
            className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-right ${
              data.paymentProvider === provider.id
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-surface-1 flex items-center justify-center text-2xl shrink-0">
                {provider.logo}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{provider.name}</h3>
                <p className="text-sm text-muted-foreground">{provider.description}</p>
              </div>
              {data.paymentProvider === provider.id && !data.paymentConnected && (
                <div className="w-6 h-6 rounded-full border-2 border-primary shrink-0" />
              )}
              {data.paymentProvider === provider.id && data.paymentConnected && (
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* API Key input */}
      {data.paymentProvider && !data.paymentConnected && (
        <div className="p-6 rounded-xl bg-card border border-border space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">מפתח API</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="הזן את מפתח ה-API שלך"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="h-11"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground">
              ניתן למצוא את המפתח בהגדרות החשבון אצל ספק הסליקה
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                מתחבר...
              </>
            ) : (
              "חבר חשבון"
            )}
          </Button>
        </div>
      )}

      {/* Connected state */}
      {data.paymentConnected && (
        <div className="p-6 rounded-xl bg-green-50 border border-green-200 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
            <Check className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-green-800">החיבור הצליח!</h3>
            <p className="text-sm text-green-600">חשבון הסליקה מחובר ומוכן לקבלת תשלומים</p>
          </div>
        </div>
      )}

      {/* Skip option */}
      {!data.paymentConnected && (
        <button
          onClick={handleSkip}
          className="w-full text-center text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          אני אוסיף סליקה אחר כך →
        </button>
      )}

      {/* Navigation */}
      <StepNavigation
        onNext={onNext}
        onSaveAndContinue={onNext}
        onBack={onBack}
        nextLabel="הבא"
        saveLabel="שמור והמשך"
        showPreview={true}
        showSave={true}
      />
    </div>
  );
};

export default StepPayments;
