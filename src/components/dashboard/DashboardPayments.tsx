import { useState } from "react";
import { CreditCard, Check, Clock, Mail } from "lucide-react";
import PayplusConnectForm from "@/components/payments/PayplusConnectForm";
import PaymentsQuickStart from "@/components/payments/PaymentsQuickStart";
import type { BusinessSettings } from "@/components/dashboard/DashboardSettings";

interface DashboardPaymentsProps {
  settings: BusinessSettings;
  onSettingsChange: (settings: BusinessSettings) => void;
}

type ProviderStatus = "active" | "coming_soon";
interface Provider {
  id: string;
  name: string;
  description: string;
  status: ProviderStatus;
}

// PayPlus is live. The rest are shown to signal breadth; when a merchant picks
// one we collect interest + do a validated integration before enabling it.
// (No fake/unverified adapters — see office@siango.app contact flow.)
const PROVIDERS: Provider[] = [
  { id: "payplus", name: "PayPlus", description: "סליקה · דף תשלום · חשבוניות", status: "active" },
  { id: "meshulam", name: "משולם / Grow", description: "סליקה · דף תשלום · חשבוניות", status: "coming_soon" },
  { id: "cardcom", name: "קארדקום", description: "סליקה · דף תשלום", status: "coming_soon" },
  { id: "tranzila", name: "Tranzila", description: "סליקה · דף תשלום (iframe)", status: "coming_soon" },
  { id: "icount", name: "iCount", description: "חשבוניות · דף תשלום", status: "coming_soon" },
];

const SUPPORT_EMAIL = "office@siango.app";

const DashboardPayments = ({ settings }: DashboardPaymentsProps) => {
  const [selected, setSelected] = useState<string>("payplus");
  const selectedProvider = PROVIDERS.find((p) => p.id === selected)!;

  return (
    <div className="p-4 md:p-6 max-w-2xl" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">סליקת אשראי</h1>
          <p className="text-sm text-muted-foreground">
            בחרו ספק סליקה כדי לקבל תשלומים בכרטיס אשראי ישירות לחשבון שלכם
          </p>
        </div>
      </div>

      <PaymentsQuickStart />

      {/* Provider picker */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {PROVIDERS.map((p) => {
          const isSelected = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={`relative flex flex-col items-start gap-1 p-4 rounded-lg border text-right transition-colors ${
                isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              }`}
            >
              <span className="absolute top-2 left-2">
                {p.status === "active" ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-500/10 rounded-full px-2 py-0.5">
                    <Check className="h-3 w-3" /> פעיל
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    <Clock className="h-3 w-3" /> בקרוב
                  </span>
                )}
              </span>
              <span className="font-semibold text-foreground mt-4">{p.name}</span>
              <span className="text-xs text-muted-foreground">{p.description}</span>
            </button>
          );
        })}
      </div>

      {/* Selected provider body */}
      {selectedProvider.status === "active" ? (
        settings.id ? (
          <PayplusConnectForm businessId={settings.id} />
        ) : (
          <p className="text-sm text-muted-foreground">יש לשמור את פרטי העסק לפני חיבור סליקה.</p>
        )
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground">
            חיבור ל{selectedProvider.name} — בקרוב!
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            אנחנו כבר עובדים על זה. רוצים להיות הראשונים שמתחברים ל{selectedProvider.name}?
            כתבו לנו ונחבר אתכם אישית.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
              `בקשה לחיבור סליקת ${selectedProvider.name}`,
            )}`}
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-sm"
          >
            <Mail className="h-4 w-4" /> {SUPPORT_EMAIL}
          </a>
        </div>
      )}
    </div>
  );
};

export default DashboardPayments;
