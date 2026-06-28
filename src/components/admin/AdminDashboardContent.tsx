import { useState } from "react";
import {
  LayoutDashboard, Users, Building2, ShoppingCart, CreditCard,
  Gift, XCircle, TrendingUp, BarChart3, GitMerge, Users2,
  Trophy, Moon, PieChart, AlertCircle, Settings, Zap,
  ChevronRight, Menu, X, Ticket, Handshake, Globe, Megaphone, MessageCircle, AtSign, MailX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlatformStats } from "@/hooks/useAdmin";
import AdminStatsCards from "./AdminStatsCards";
import AdminBusinessesList from "./AdminBusinessesList";
import AdminOrdersList from "./AdminOrdersList";
import AdminAnalytics from "./AdminAnalytics";
import AdminUsersList from "./AdminUsersList";
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
import AdminPartnerEarnings from "./AdminPartnerEarnings";
import AdminMarketplace from "./AdminMarketplace";
import AdminDomainSettings from "./AdminDomainSettings";
import AdminCommandCenter from "./AdminCommandCenter";
import AdminMarketing from "./AdminMarketing";
import AdminWhatsApp from "./AdminWhatsApp";
import AdminWhatsAppBot from "./AdminWhatsAppBot";
import AdminEmailSettings from "./AdminEmailSettings";
import AdminUnsubscribes from "./AdminUnsubscribes";

type AdminView =
  | "overview" | "customers" | "businesses" | "orders" | "payments"
  | "referrals" | "cancellations" | "activity"
  | "mrr" | "funnel" | "churn" | "cohort" | "analytics"
  | "top" | "dormant" | "categories" | "payment-errors"
  | "coupons" | "partners" | "marketing" | "whatsapp" | "whatsapp-bot" | "marketplace" | "domains" | "email-pricing" | "unsubscribes" | "settings";

interface NavItem {
  id: AdminView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
}

const NAV: NavItem[] = [
  // ראשי
  { id: "overview",       label: "סקירה כללית",    icon: LayoutDashboard, group: "ראשי" },
  { id: "activity",       label: "פעילות חיה",      icon: Zap,             group: "ראשי" },
  // לקוחות וחנויות
  { id: "customers",      label: "לקוחות",          icon: Users,           group: "לקוחות וחנויות" },
  { id: "businesses",     label: "חנויות",           icon: Building2,       group: "לקוחות וחנויות" },
  // הזמנות ותשלומים
  { id: "orders",         label: "הזמנות",           icon: ShoppingCart,    group: "הזמנות ותשלומים" },
  { id: "payments",       label: "תשלומים",          icon: CreditCard,      group: "הזמנות ותשלומים" },
  { id: "cancellations",  label: "ביטולים",          icon: XCircle,         group: "הזמנות ותשלומים" },
  { id: "referrals",      label: "הפניות",           icon: Gift,            group: "הזמנות ותשלומים" },
  { id: "payment-errors", label: "שגיאות תשלום",    icon: AlertCircle,     group: "הזמנות ותשלומים" },
  // תמחור ושותפים
  { id: "domains",        label: "דומיינים",          icon: Globe,           group: "תמחור ושותפים" },
  { id: "email-pricing",  label: "מייל עסקי",         icon: AtSign,          group: "תמחור ושותפים" },
  { id: "coupons",        label: "קופוני מנוי",      icon: Ticket,          group: "תמחור ושותפים" },
  { id: "partners",       label: "רווחי שותפים",     icon: Handshake,       group: "תמחור ושותפים" },
  { id: "marketing",      label: "פרסום ושיווק",     icon: Megaphone,       group: "תמחור ושותפים" },
  // תקשורת ודיוור
  { id: "whatsapp",       label: "וואטסאפ",           icon: MessageCircle,   group: "תקשורת ודיוור" },
  { id: "whatsapp-bot",   label: "הבוט שלנו",         icon: MessageCircle,   group: "תקשורת ודיוור" },
  { id: "unsubscribes",   label: "רשימת הסרות",      icon: MailX,           group: "תקשורת ודיוור" },
  // הכנסות
  { id: "mrr",            label: "MRR / ARR",        icon: TrendingUp,      group: "הכנסות" },
  { id: "funnel",         label: "Funnel",            icon: GitMerge,        group: "הכנסות" },
  { id: "churn",          label: "נטישה",             icon: BarChart3,       group: "הכנסות" },
  { id: "cohort",         label: "Cohort Retention", icon: Users2,          group: "הכנסות" },
  // תובנות ושוק
  { id: "analytics",      label: "צפיות",             icon: BarChart3,       group: "תובנות ושוק" },
  { id: "marketplace",    label: "Marketplace",       icon: Globe,           group: "תובנות ושוק" },
  { id: "top",            label: "Top Performers",   icon: Trophy,          group: "תובנות ושוק" },
  { id: "dormant",        label: "רדומים",            icon: Moon,            group: "תובנות ושוק" },
  { id: "categories",     label: "קטגוריות",          icon: PieChart,        group: "תובנות ושוק" },
  // הגדרות
  { id: "settings",       label: "הגדרות",            icon: Settings,        group: "הגדרות" },
];

const GROUPS = ["ראשי", "לקוחות וחנויות", "הזמנות ותשלומים", "תמחור ושותפים", "תקשורת ודיוור", "הכנסות", "תובנות ושוק", "הגדרות"];

const VIEW_TITLES: Record<AdminView, string> = {
  overview: "סקירה כללית", customers: "ניהול לקוחות", businesses: "חנויות",
  orders: "הזמנות", payments: "תשלומים", referrals: "הפניות",
  cancellations: "ביטולים", activity: "פעילות חיה",
  mrr: "MRR / ARR", funnel: "Conversion Funnel", churn: "שיעור נטישה",
  cohort: "Cohort Retention", analytics: "צפיות וביקורים",
  top: "Top Performers", dormant: "עסקים רדומים", categories: "פילוח קטגוריות",
  "payment-errors": "שגיאות תשלום", coupons: "קופוני מנוי", partners: "רווחי שותפים", marketing: "פרסום ושיווק", whatsapp: "וואטסאפ", "whatsapp-bot": "הבוט של Siango", marketplace: "Marketplace", domains: "תמחור דומיינים", "email-pricing": "תמחור מייל עסקי", unsubscribes: "רשימת הסרות (הסרות דיוור)", settings: "הגדרות מערכת",
};

function Sidebar({ current, onChange, collapsed, onToggle }: {
  current: AdminView;
  onChange: (v: AdminView) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside className={cn(
      "flex flex-col border-l border-border bg-card transition-all duration-200 shrink-0",
      collapsed ? "w-14" : "w-56"
    )}>
      {/* Toggle */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-border">
        {!collapsed && <span className="text-sm font-bold text-foreground">ניהול מערכת</span>}
        <button onClick={onToggle} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
          {collapsed ? <ChevronRight className="h-4 w-4 rotate-180" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {GROUPS.map(group => {
          const items = NAV.filter(n => n.group === group);
          return (
            <div key={group}>
              {!collapsed && (
                <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-2 mb-1">
                  {group}
                </p>
              )}
              {items.map(item => {
                const Icon = item.icon;
                const active = current === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onChange(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors text-right",
                      active
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function ViewContent({ view, stats, statsLoading }: {
  view: AdminView;
  stats: any;
  statsLoading: boolean;
}) {
  switch (view) {
    case "overview":
      return (
        <div className="space-y-6">
          <AdminCommandCenter />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">פעילות אחרונה</h3>
              <AdminActivityFeed />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">MRR</h3>
              <AdminMRR />
            </div>
          </div>
          <AdminStatsCards stats={stats} isLoading={statsLoading} />
        </div>
      );
    case "activity":       return <AdminActivityFeed />;
    case "customers":      return <AdminCustomers />;
    case "businesses":     return <AdminBusinessesList />;
    case "orders":         return <AdminOrdersList />;
    case "payments":       return <AdminPayments />;
    case "referrals":      return <AdminReferrals />;
    case "cancellations":  return <AdminCancellations />;
    case "coupons":        return <AdminSubscriptionCoupons />;
    case "partners":       return <AdminPartnerEarnings />;
    case "marketing":      return <AdminMarketing />;
    case "whatsapp":       return <AdminWhatsApp />;
    case "whatsapp-bot":   return <AdminWhatsAppBot />;
    case "marketplace":    return <AdminMarketplace />;
    case "domains":        return <AdminDomainSettings />;
    case "email-pricing":  return <AdminEmailSettings />;
    case "unsubscribes":   return <AdminUnsubscribes />;
    case "mrr":            return <AdminMRR />;
    case "funnel":         return <AdminFunnel />;
    case "churn":          return <AdminChurnRate />;
    case "cohort":         return <AdminCohortRetention />;
    case "analytics":      return <AdminAnalytics />;
    case "top":            return <AdminTopPerformers />;
    case "dormant":        return <AdminDormant />;
    case "categories":     return <AdminCategoryMap />;
    case "payment-errors": return <AdminPaymentErrors />;
    case "settings":
      return (
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xl font-bold mb-2">הגדרות מערכת</h2>
          <p className="text-muted-foreground">הגדרות נוספות יתווספו בקרוב...</p>
        </div>
      );
    default:
      return null;
  }
}

const AdminDashboardContent = () => {
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const [view, setView] = useState<AdminView>("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-[calc(100vh-4rem)]" dir="rtl">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar current={view} onChange={setView} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative z-10 w-56 h-full">
            <Sidebar current={view} onChange={v => { setView(v); setMobileOpen(false); }} collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-6 h-14 border-b border-border bg-background/95 backdrop-blur">
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <h2 className="font-bold text-lg">{VIEW_TITLES[view]}</h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <ViewContent view={view} stats={stats} statsLoading={statsLoading} />
        </div>
      </main>
    </div>
  );
};

export default AdminDashboardContent;
