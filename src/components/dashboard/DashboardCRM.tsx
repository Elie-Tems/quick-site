import { useState } from "react";
import { Users, Truck, TrendingUp } from "lucide-react";
import DashboardCustomers from "./DashboardCustomers";
import DashboardSuppliers from "./DashboardSuppliers";
import DashboardProfitability from "./DashboardProfitability";
import type { Order } from "./DashboardOrders";
import type { BusinessType } from "@/lib/businessModules";

type CrmTab = "customers" | "suppliers" | "profitability";

interface DashboardCRMProps {
  orders: Order[];
  businessId?: string;
  demoMode?: boolean;
  initialTab?: CrmTab;
  hasCrmAddon?: boolean;
  businessType?: BusinessType;
}

const TABS: { id: CrmTab; label: string; icon: typeof Users }[] = [
  { id: "customers", label: "לקוחות", icon: Users },
  { id: "suppliers", label: "ספקים", icon: Truck },
  { id: "profitability", label: "רווחיות", icon: TrendingUp },
];

function PremiumTabOverlay({ feature }: { feature: string }) {
  return (
    <div className="relative rounded-2xl border border-violet-500/20 bg-violet-500/5 overflow-hidden min-h-[220px]">
      {/* Blurred placeholder rows */}
      <div className="p-4 space-y-3 blur-sm pointer-events-none select-none" aria-hidden>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-muted/60 animate-pulse" />
        ))}
      </div>
      {/* Overlay message */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="text-3xl">✨</div>
        <p className="font-semibold text-foreground">{feature} זמין בתוספת CRM</p>
        <p className="text-sm text-muted-foreground">שדרגו כדי לפתוח גישה לכל הנתונים.</p>
        <button
          type="button"
          className="rounded-xl bg-violet-600 text-white px-5 py-2 text-sm font-medium hover:bg-violet-700 transition-colors"
          onClick={() => window.dispatchEvent(new CustomEvent("open-upgrades"))}
        >
          שדרג לתוספת ←
        </button>
      </div>
    </div>
  );
}

// Unified CRM hub: customers, suppliers and profitability live as tabs under one
// premium area instead of separate nav items.
const DashboardCRM = ({ orders, businessId, demoMode, initialTab = "customers", hasCrmAddon = false, businessType }: DashboardCRMProps) => {
  const [tab, setTab] = useState<CrmTab>(initialTab);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Colorful CRM header */}
      <div className="rounded-2xl bg-gradient-to-l from-emerald-500/15 to-teal-500/5 border border-emerald-500/20 p-5 flex items-center gap-4">
        <div className="text-4xl">👥</div>
        <div>
          <h1 className="text-lg font-bold text-foreground">
            {businessType === "vacation" ? "האורחים שלך" :
             businessType === "nonprofit" || businessType === "synagogue" ? "התורמים שלך" :
             "הלקוחות שלך"}
          </h1>
          <p className="text-sm text-muted-foreground">היסטוריית הלקוחות וניהול הקשרים</p>
        </div>
      </div>

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
      {tab === "suppliers" && (
        hasCrmAddon
          ? <DashboardSuppliers businessId={businessId} demoMode={demoMode} />
          : <PremiumTabOverlay feature="ניהול ספקים" />
      )}
      {tab === "profitability" && (
        hasCrmAddon
          ? <DashboardProfitability businessId={businessId} demoMode={demoMode} />
          : <PremiumTabOverlay feature="ניהול רווחיות" />
      )}
    </div>
  );
};

export default DashboardCRM;
