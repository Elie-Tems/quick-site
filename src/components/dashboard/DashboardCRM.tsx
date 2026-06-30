import { useState } from "react";
import { Users, Truck, TrendingUp } from "lucide-react";
import DashboardCustomers from "./DashboardCustomers";
import DashboardSuppliers from "./DashboardSuppliers";
import DashboardProfitability from "./DashboardProfitability";
import type { Order } from "./DashboardOrders";

type CrmTab = "customers" | "suppliers" | "profitability";

interface DashboardCRMProps {
  orders: Order[];
  businessId?: string;
  demoMode?: boolean;
  initialTab?: CrmTab;
}

const TABS: { id: CrmTab; label: string; icon: typeof Users }[] = [
  { id: "customers", label: "לקוחות", icon: Users },
  { id: "suppliers", label: "ספקים", icon: Truck },
  { id: "profitability", label: "רווחיות", icon: TrendingUp },
];

// Unified CRM hub: customers, suppliers and profitability live as tabs under one
// premium area instead of separate nav items.
const DashboardCRM = ({ orders, businessId, demoMode, initialTab = "customers" }: DashboardCRMProps) => {
  const [tab, setTab] = useState<CrmTab>(initialTab);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="inline-flex items-center gap-1 rounded-xl bg-muted p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "customers" && <DashboardCustomers orders={orders} businessId={businessId} demoMode={demoMode} />}
      {tab === "suppliers" && <DashboardSuppliers businessId={businessId} demoMode={demoMode} />}
      {tab === "profitability" && <DashboardProfitability businessId={businessId} demoMode={demoMode} />}
    </div>
  );
};

export default DashboardCRM;
