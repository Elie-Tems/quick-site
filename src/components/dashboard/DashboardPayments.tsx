import { useState } from "react";
import { CreditCard, Check, Clock, Mail, Star } from "lucide-react";
import PayplusConnectForm from "@/components/payments/PayplusConnectForm";
import PaymentsQuickStart from "@/components/payments/PaymentsQuickStart";
import type { BusinessSettings } from "@/components/dashboard/DashboardSettings";

interface DashboardPaymentsProps {
  settings: BusinessSettings;
  onSettingsChange: (settings: BusinessSettings) => void;
}

// PayPlus is the primary/recommended provider. The rest are shown small and
// secondary ("coming soon") so the focus stays on PayPlus.
const COMING_SOON = [
  { id: "meshulam", name: "משולם / Grow" },
  { id: "cardcom", name: "קארדקום" },
  { id: "icount", name: "iCount" },
  { id: "tranzila", name: "Tranzila" },
];
const SUPPORT_EMAIL = "office@siango.app";

const DashboardPayments = ({ settings }: DashboardPaymentsProps) => {
  const [selected, setSelected] = useState<string>("payplus");
  const comingSoon = COMING_SOON.find((p) => p.id === selected);

  return (
    <div className="p-4 md:p-6 max-w-2xl" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">סליקת אשראי</h1>
          <p className="text-sm text-muted-foreground">חברו סליקה כדי לקבל תשלומים בכרטיס אשראי ישירות לחשבון שלכם</p>
        </div>
      </div>

      <PaymentsQuickStart />

      {/* Primary / recommended provider */}
      <button
        type="button"
        onClick={() => setSelected("payplus")}
        className={`w-full text-right rounded-xl border-2 p-5 mb-4 transition-colors ${
          selected === "payplus" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/12 rounded-full px-2 py-0.5">
            <Star className="h-3 w-3" /> מומלץ
          </span>
          {selected === "payplus" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-600">
              <Check className="h-3.5 w-3.5" /> נבחר
            </span>
          )}
        </div>
        <p className="text-lg font-bold text-foreground">PayPlus</p>
        <p className="text-sm text-muted-foreground">מעטפת מלאה — סליקה · דף תשלום · חשבוניות. חיבור מהיר.</p>
      </button>

      {/* Selected body */}
      {selected === "payplus" ? (
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
          <h3 className="font-semibold text-foreground">חיבור ל{comingSoon?.name} — בקרוב!</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            רוצים להיות הראשונים שמתחברים ל{comingSoon?.name}? כתבו לנו ונחבר אתכם אישית.
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`בקשה לחיבור סליקת ${comingSoon?.name}`)}`}
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium text-sm"
          >
            <Mail className="h-4 w-4" /> {SUPPORT_EMAIL}
          </a>
        </div>
      )}

      {/* Secondary, de-emphasized providers */}
      <div className="mt-8">
        <p className="text-xs text-muted-foreground mb-2">ספקים נוספים — בקרוב</p>
        <div className="flex flex-wrap gap-2">
          {COMING_SOON.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={`text-xs rounded-full border px-3 py-1.5 transition-colors ${
                selected === p.id ? "border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPayments;
