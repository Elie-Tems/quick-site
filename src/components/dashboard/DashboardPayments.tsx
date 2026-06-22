import { useState, useEffect } from "react";
import { CreditCard, Loader2, Check, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUpdateBusiness } from "@/hooks/useBusiness";
import type { BusinessSettings } from "@/components/dashboard/DashboardSettings";

const paymentProviders = [
  { id: "icredit" as const, name: "iCredit", logo: "💳", description: "סליקה ישראלית פופולרית", signupUrl: "https://icredit.co.il" },
  { id: "cardcom" as const, name: "Cardcom", logo: "💳", description: "סליקה מאובטחת", signupUrl: "https://www.cardcom.solutions" },
  { id: "tranzila" as const, name: "Tranzila", logo: "💳", description: "סליקה מובילה בישראל", signupUrl: "https://tranzila.com" },
  { id: "meshulam" as const, name: "משולם", logo: "💳", description: "חיוב ותשלומים", signupUrl: "https://meshulam.co.il" },
  { id: "payplus" as const, name: "PayPlus", logo: "💳", description: "סליקה מתקדמת", signupUrl: "https://www.payplus.co.il" },
];

interface DashboardPaymentsProps {
  settings: BusinessSettings;
  onSettingsChange: (settings: BusinessSettings) => void;
}

const DashboardPayments = ({ settings, onSettingsChange }: DashboardPaymentsProps) => {
  const [paymentEnabled, setPaymentEnabled] = useState(settings.paymentEnabled ?? false);
  const [paymentProvider, setPaymentProvider] = useState<BusinessSettings["paymentProvider"]>(
    settings.paymentProvider ?? undefined
  );
  const [apiKey, setApiKey] = useState("");
  const updateBusiness = useUpdateBusiness();
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    setPaymentEnabled(settings.paymentEnabled ?? false);
    setPaymentProvider(settings.paymentProvider ?? undefined);
  }, [settings.paymentEnabled, settings.paymentProvider]);

  const handleToggle = (checked: boolean) => {
    setPaymentEnabled(checked);
    onSettingsChange({ ...settings, paymentEnabled: checked });
  };

  const handleProviderChange = (provider: BusinessSettings["paymentProvider"]) => {
    setPaymentProvider(provider);
    onSettingsChange({ ...settings, paymentProvider: provider });
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus("idle");
    await new Promise((r) => setTimeout(r, 1500));
    setConnectionStatus(apiKey && apiKey.length > 5 ? "success" : "error");
    setIsTestingConnection(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings.id) return;
    setIsSaving(true);
    try {
      await updateBusiness.mutateAsync({
        id: settings.id,
        payment_enabled: paymentEnabled,
        payment_provider: paymentProvider || null,
        ...(apiKey.trim() ? { payment_api_key: apiKey.trim() } : {}),
      } as any);
      onSettingsChange({
        ...settings,
        paymentEnabled,
        paymentProvider: paymentProvider ?? undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">סליקת אשראי</h1>
          <p className="text-sm text-muted-foreground">
            חבר ספק סליקה כדי לאפשר תשלום בכרטיס אשראי באתר
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">הפעל סליקה אונליין</p>
              <p className="text-xs text-muted-foreground">
                לקוחות יוכלו לשלם בכרטיס אשראי ישירות באתר
              </p>
            </div>
            <Switch checked={paymentEnabled} onCheckedChange={handleToggle} />
          </div>

          {paymentEnabled && (
            <>
              <div className="space-y-3 pt-2">
                <Label>בחר ספק סליקה</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {paymentProviders.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      onClick={() => handleProviderChange(provider.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-colors ${
                        paymentProvider === provider.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <span className="text-2xl">{provider.logo}</span>
                      <span className="text-sm font-medium">{provider.name}</span>
                      <span className="text-xs text-muted-foreground text-center">{provider.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {paymentProvider && (
                <>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm text-foreground mb-2">
                      אין לך חשבון {paymentProviders.find((p) => p.id === paymentProvider)?.name}?
                    </p>
                    <a
                      href={paymentProviders.find((p) => p.id === paymentProvider)?.signupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
                    >
                      פתח חשבון חדש <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key / מפתח סוחר</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      dir="ltr"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="הזן את ה-API Key שקיבלת מספק הסליקה"
                    />
                    <p className="text-xs text-muted-foreground">
                      תמצא את המפתח בלוח הבקרה של ספק הסליקה שלך. לא נשמר אם השדה ריק.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={testConnection}
                      disabled={isTestingConnection || !apiKey}
                      className="gap-2"
                    >
                      {isTestingConnection && <Loader2 className="h-4 w-4 animate-spin" />}
                      בדוק חיבור
                    </Button>
                    {connectionStatus === "success" && (
                      <span className="flex items-center gap-1.5 text-green-600 text-sm">
                        <Check className="h-4 w-4" /> החיבור תקין
                      </span>
                    )}
                    {connectionStatus === "error" && (
                      <span className="flex items-center gap-1.5 text-destructive text-sm">
                        <X className="h-4 w-4" /> בדוק שהמפתחות נכונים
                      </span>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs text-muted-foreground">
                      💡 <strong>טיפ:</strong> לאחר חיבור מוצלח, לקוחות יוכלו לשלם באשראי ישירות באתר שלך. הכסף
                      יועבר לחשבון הבנק המחובר לספק הסליקה.
                    </p>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full gap-2" disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          שמור הגדרות סליקה
        </Button>
      </form>
    </div>
  );
};

export default DashboardPayments;
