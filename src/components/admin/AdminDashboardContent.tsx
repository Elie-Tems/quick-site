import React, { useState } from "react";
import {
  LayoutDashboard, Users, CreditCard, TrendingUp, BarChart3,
  MessageCircle, Settings, ChevronRight, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlatformStats } from "@/hooks/useAdmin";
import AdminStatsCards from "./AdminStatsCards";
import AdminMerchantProfile from "./AdminMerchantProfile";
import AdminOrdersList from "./AdminOrdersList";
import AdminAnalytics from "./AdminAnalytics";
import AdminPayments from "./AdminPayments";
import AdminReferrals from "./AdminReferrals";
import AdminCancellations from "./AdminCancellations";
import AdminMRR from "./AdminMRR";
import AdminFunnel from "./AdminFunnel";
import AdminChurnRate from "./AdminChurnRate";
import AdminTopPerformers from "./AdminTopPerformers";
import AdminDormant from "./AdminDormant";
import AdminCategoryMap from "./AdminCategoryMap";
import AdminPaymentErrors from "./AdminPaymentErrors";
import AdminCohortRetention from "./AdminCohortRetention";
import AdminCustomers from "./AdminCustomers";
import AdminSubscriptionCoupons from "./AdminSubscriptionCoupons";
import AdminEmailLog from "./AdminEmailLog";
import AdminPartnerEarnings from "./AdminPartnerEarnings";
import AdminMarketplace from "./AdminMarketplace";
import AdminDomainSettings from "./AdminDomainSettings";
import AdminCommandCenter from "./AdminCommandCenter";
import AdminMarketing from "./AdminMarketing";
import AdminWhatsApp from "./AdminWhatsApp";
import AdminWhatsAppBot from "./AdminWhatsAppBot";
import AdminEmailSettings from "./AdminEmailSettings";
import AdminUnsubscribes from "./AdminUnsubscribes";
import AdminSystem from "./AdminSystem";

function OverviewPanel({ stats, statsLoading, onNavigate, onSelectMerchant }: {
  stats: any;
  statsLoading: boolean;
  onNavigate: (areaId: string) => void;
  onSelectMerchant: (businessId: string) => void;
}) {
  return (
    <div className="space-y-6">
      <AdminCommandCenter onNavigate={onNavigate} onSelectMerchant={onSelectMerchant} />
      <AdminStatsCards stats={stats} isLoading={statsLoading} />
    </div>
  );
}

interface Tab {
  key: string;
  label: string;
  render: (ctx: {
    stats: any;
    statsLoading: boolean;
    onNavigate: (areaId: string) => void;
    onSelectMerchant: (businessId: string) => void;
  }) => JSX.Element;
}
interface Area { id: string; label: string; icon: React.ComponentType<{ className?: string }>; tabs: Tab[]; }

const AREAS: Area[] = [
  {
    id: "home", label: "בוקר טוב", icon: LayoutDashboard, tabs: [
      { key: "overview", label: "סקירה", render: ({ stats, statsLoading, onNavigate, onSelectMerchant }) =>
          <OverviewPanel stats={stats} statsLoading={statsLoading} onNavigate={onNavigate} onSelectMerchant={onSelectMerchant} /> },
    ],
  },
  {
    id: "merchants", label: "סוחרים", icon: Users, tabs: [
      { key: "customers", label: "כל הסוחרים", render: ({ onSelectMerchant }) =>
          <AdminCustomers onSelectMerchant={onSelectMerchant} /> },
      { key: "dormant", label: "בסיכון ורדומים", render: ({ onSelectMerchant }) =>
          <AdminDormant onSelectMerchant={onSelectMerchant} /> },
    ],
  },
  {
    id: "payments", label: "תשלומים", icon: CreditCard, tabs: [
      { key: "payments", label: "תשלומים", render: () => <AdminPayments /> },
      { key: "cancellations", label: "ביטולים", render: () => <AdminCancellations /> },
      { key: "payment-errors", label: "שגיאות תשלום", render: () => <AdminPaymentErrors /> },
      { key: "orders", label: "הזמנות", render: () => <AdminOrdersList /> },
    ],
  },
  {
    id: "revenue", label: "הכנסות", icon: TrendingUp, tabs: [
      { key: "mrr", label: "MRR / ARR", render: () => <AdminMRR /> },
      { key: "funnel", label: "מסלול הרשמה", render: () => <AdminFunnel /> },
      { key: "churn", label: "נטישת מנויים", render: () => <AdminChurnRate /> },
      { key: "cohort", label: "שימור לאורך זמן", render: () => <AdminCohortRetention /> },
    ],
  },
  {
    id: "growth", label: "גדילה ושוק", icon: BarChart3, tabs: [
      { key: "top", label: "הסוחרים המובילים", render: () => <AdminTopPerformers /> },
      { key: "categories", label: "קטגוריות", render: () => <AdminCategoryMap /> },
      { key: "marketplace", label: "תמונת שוק", render: () => <AdminMarketplace /> },
      { key: "analytics", label: "צפיות וביקורים", render: () => <AdminAnalytics /> },
      { key: "referrals", label: "הפניות", render: () => <AdminReferrals /> },
      { key: "partners", label: "רווחי שותפים", render: () => <AdminPartnerEarnings /> },
      { key: "marketing", label: "פרסום ושיווק", render: () => <AdminMarketing /> },
    ],
  },
  {
    id: "comms", label: "תקשורת", icon: MessageCircle, tabs: [
      { key: "whatsapp", label: "וואטסאפ", render: () => <AdminWhatsApp /> },
      { key: "whatsapp-bot", label: "הבוט שלנו", render: () => <AdminWhatsAppBot /> },
      { key: "email-log", label: "יומן מיילים", render: () => <AdminEmailLog /> },
      { key: "unsubscribes", label: "רשימת הסרות", render: () => <AdminUnsubscribes /> },
    ],
  },
  {
    id: "settings", label: "הגדרות", icon: Settings, tabs: [
      { key: "domains", label: "דומיינים", render: () => <AdminDomainSettings /> },
      { key: "email-pricing", label: "מייל עסקי", render: () => <AdminEmailSettings /> },
      { key: "coupons", label: "קופוני מנוי", render: () => <AdminSubscriptionCoupons /> },
      { key: "system", label: "מערכת", render: () => <AdminSystem /> },
    ],
  },
];

function Sidebar({ currentArea, onChange, collapsed, onToggle }: {
  currentArea: string;
  onChange: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside className={cn(
      "flex flex-col border-l border-border bg-card transition-all duration-200 shrink-0",
      collapsed ? "w-14" : "w-56"
    )}>
      <div className="flex items-center justify-between h-14 px-3 border-b border-border">
        {!collapsed && <span className="text-sm font-bold text-foreground">ניהול מערכת</span>}
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
          {collapsed ? <ChevronRight className="h-4 w-4 rotate-180" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {AREAS.map((area, idx) => {
          const Icon = area.icon;
          const active = currentArea === area.id;
          return (
            <React.Fragment key={area.id}>
              {idx === 3 && (
                <div className={cn("my-1 border-t border-border", collapsed ? "mx-1" : "mx-2")} />
              )}
              {idx === 6 && (
                <div className={cn("my-1 border-t border-border", collapsed ? "mx-1" : "mx-2")} />
              )}
              <button
                onClick={() => onChange(area.id)}
                title={collapsed ? area.label : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-sm transition-colors text-right",
                  active ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{area.label}</span>}
              </button>
            </React.Fragment>
          );
        })}
      </nav>
    </aside>
  );
}

const AdminDashboardContent = () => {
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const [areaId, setAreaId] = useState<string>("home");
  const [tabKey, setTabKey] = useState<string>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string | null>(null);

  const area = AREAS.find((a) => a.id === areaId) ?? AREAS[0];
  const tab = area.tabs.find((t) => t.key === tabKey) ?? area.tabs[0];

  const selectArea = (id: string) => {
    const a = AREAS.find((x) => x.id === id) ?? AREAS[0];
    setAreaId(a.id);
    setTabKey(a.tabs[0].key); // land on the area's first tab
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]" dir="rtl">
      <div className="hidden md:flex">
        <Sidebar currentArea={areaId} onChange={selectArea} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 w-56 h-full">
            <Sidebar currentArea={areaId} onChange={(id) => { selectArea(id); setMobileOpen(false); }} collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto">
        {selectedMerchantId ? (
          <AdminMerchantProfile
            businessId={selectedMerchantId}
            onBack={() => setSelectedMerchantId(null)}
          />
        ) : (
          <>
            <div className="sticky top-0 z-10 flex items-center gap-3 px-6 h-14 border-b border-border bg-background/95 backdrop-blur">
              <button className="md:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground" onClick={() => setMobileOpen(true)}>
                <Menu className="h-5 w-5" />
              </button>
              <h2 className="font-bold text-lg">{area.label}</h2>
            </div>

            {/* Area tabs (only when the area has more than one) */}
            {area.tabs.length > 1 && (
              <div className="sticky top-14 z-[9] flex gap-1 overflow-x-auto px-6 py-2 border-b border-border bg-background/95 backdrop-blur">
                {area.tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTabKey(t.key)}
                    className={cn(
                      "shrink-0 px-3 py-1.5 rounded-lg text-sm transition-colors whitespace-nowrap",
                      tab.key === t.key ? "bg-primary/12 text-primary font-medium" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            <div className="p-6">
              {tab.render({ stats, statsLoading, onNavigate: selectArea, onSelectMerchant: (id) => { setSelectedMerchantId(id); } })}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboardContent;
