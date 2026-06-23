import { CreditCard } from "lucide-react";
import PayplusConnectForm from "@/components/payments/PayplusConnectForm";
import type { BusinessSettings } from "@/components/dashboard/DashboardSettings";

interface DashboardPaymentsProps {
  settings: BusinessSettings;
  onSettingsChange: (settings: BusinessSettings) => void;
}

const DashboardPayments = ({ settings }: DashboardPaymentsProps) => {
  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">סליקת אשראי</h1>
          <p className="text-sm text-muted-foreground">
            חברו את PayPlus כדי לקבל תשלומים בכרטיס אשראי ישירות לחשבון שלכם
          </p>
        </div>
      </div>

      {settings.id ? (
        <PayplusConnectForm businessId={settings.id} />
      ) : (
        <p className="text-sm text-muted-foreground">יש לשמור את פרטי העסק לפני חיבור סליקה.</p>
      )}
    </div>
  );
};

export default DashboardPayments;
