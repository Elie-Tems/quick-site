import { useState } from "react";
import {
  LayoutDashboard, Users, CreditCard, TrendingUp, Handshake,
  MessageCircle, Settings, ChevronRight, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlatformStats } from "@/hooks/useAdmin";
import AdminStatsCards from "./AdminStatsCards";
import AdminBusinessesList from "./AdminBusinessesList";
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
import AdminActivityFeed from "./AdminActivityFeed";
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

// The overview landing (command center + activity + revenue + KPI cards).
function OverviewPanel({ stats, statsLoading }: { stats: any; statsLoading: boolean }) {
  return (
    <div className="space-y-6">
      <AdminCommandCenter />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">פעילות אחרונה</h3>
          <AdminActivityFeed />
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">הכנסה חודשית</h3>
          <AdminMRR />
        </div>
      </div>
      <AdminStatsCards stats={stats} isLoading={statsLoading} />
    </div>
  );
}

// ── The 7 areas from the admin spec. Each area is ONE screen with internal tabs;
// the tabs reuse the existing screens as panels. Nothing removed - just unified so
// the merchant-management / revenue reports live together instead of scattered nav.
interface Tab { key: string; label: string; render: (ctx: { stats: any; statsLoading: boolean }) => JSX.Element; }
interface Area { id: string; label: string; icon: React.ComponentType<{ className?: string }>; tabs: Tab[]; }

const AREAS: Area[] = [
  {
    id: "control", label: "מרכז שליטה", icon: LayoutDashboard, tabs: [
      { key: "overview", label: "סקירה", render: ({ stats, statsLoading }) => <OverviewPanel stats={stats} statsLoading={statsLoading} /> },
      { key: "activity", label: "פעילות חיה", render: () => <AdminActivityFeed /> },
    ],
  },
  {
    id: "merchants", label: "ניהול הסוחרים", icon: Users, tabs: [
      { key: "customers", label: "כל הסוחרים", render: () => <AdminCustomers /> },
      { key: "dormant", label: "בסיכון ורדומים", render: () => <AdminDormant /> },
      { key: "businesses", label: "חנויות", render: () => <AdminBusinessesList /> },
      { key: "orders", label: "הזמנות", render: () => <AdminOrdersList /> },
    ],
  },
  {
    id: "revenue", label: "הכנסות ודוחות", icon: TrendingUp, tabs: [
      { key: "mrr", label: "הכנסה חודשית ושנתית", render: () => <AdminMRR /> },
      { key: "funnel", label: "מסלול הרשמה", render: () => <AdminFunnel /> },
      { key: "churn", label: "נטישת מנויים", render: () => <AdminChurnRate /> },
      { key: "cohort", label: "שימור לאורך זמן", render: () => <AdminCohortRetention /> },
      { key: "analytics", label: "צפיות וביקורים", render: () => <AdminAnalytics /> },
      { key: "marketplace", label: "תמונת שוק", render: () => <AdminMarketplace /> },
      { key: "top", label: "הסוחרים המובילים", render: () => <AdminTopPerformers /> },
      { key: "categories", label: "קטגוריות", render: () => <AdminCategoryMap /> },
    ],
  },
  {
    id: "payments", label: "תשלומים", icon: CreditCard, tabs: [
      { key: "payments", label: "תשלומים", render: () => <AdminPayments /> },
      { key: "cancellations", label: "ביטולים", render: () => <AdminCancellations /> },
      { key: "payment-errors", label: "שגיאות תשלום", render: () => <AdminPaymentErrors /> },
    ],
  },
  {
    id: "pricing", label: "תמחור ושותפים", icon: Handshake, tabs: [
      { key: "domains", label: "דומיינים", render: () => <AdminDomainSettings /> },
      { key: "email-pricing", label: "מייל עסקי", render: () => <AdminEmailSettings /> },
      { key: "coupons", label: "קופוני מנוי", render: () => <AdminSubscriptionCoupons /> },
      { key: "partners", label: "רווחי שותפים", render: () => <AdminPartnerEarnings /> },
      { key: "marketing", label: "פרסום ושיווק", render: () => <AdminMarketing /> },
      { key: "referrals", label: "הפניות", render: () => <AdminReferrals /> },
    ],
  },
  {
    id: "comms", label: "תקשורת ודיוור", icon: MessageCircle, tabs: [
      { key: "whatsapp", label: "וואטסאפ", render: () => <AdminWhatsApp /> },
      { key: "whatsapp-bot", label: "הבוט שלנו", render: () => <AdminWhatsAppBot /> },
      { key: "unsubscribes", label: "רשימת הסרות", render: () => <AdminUnsubscribes /> },
      { key: "email-log", label: "יומן מיילים", render: () => <AdminEmailLog /> },
    ],
  },
  {
    id: "system", label: "מערכת", icon: Settings, tabs: [
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
        {AREAS.map((area) => {
          const Icon = area.icon;
          const active = currentArea === area.id;
          return (
            <button
              key={area.id}
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
          );
        })}
      </nav>
    </aside>
  );
}

const AdminDashboardContent = () => {
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const [areaId, setAreaId] = useState<string>("control");
  const [tabKey, setTabKey] = useState<string>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
          {tab.render({ stats, statsLoading })}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboardContent;
