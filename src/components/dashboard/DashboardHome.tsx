import { ShoppingCart, DollarSign, Package, Users, Eye, ChevronLeft, AlertTriangle, Heart, Building2, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardView } from "./DashboardNav";
import type { BusinessType } from "@/lib/businessModules";
import DashboardAnalytics from "./DashboardAnalytics";
import ReferralBox from "./ReferralBox";

interface DashboardHomeProps {
  stats: {
    totalOrders: number;
    totalSales: number;
    paymentEnabled: boolean;
    totalProducts: number;
    totalCategories: number;
    totalCustomers: number;
  };
  businessId?: string;
  isPublished?: boolean;
  isSubscribed?: boolean;
  hasPaymentFailure?: boolean;
  hasAbout?: boolean;
  businessType?: BusinessType;
  onNavigate: (view: DashboardView) => void;
}

// Per-type label/icon config for the 4 stat cards
const TYPE_LABELS: Record<BusinessType, {
  items: { label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> };
  transactions: { label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }> };
  revenue: { label: string };
  contacts: { label: string; icon: React.ComponentType<{ className?: string }> };
  productsNav: DashboardView;
  ordersNav: DashboardView;
  todosProductsLabel: string;
  todosPaymentLabel: string;
}> = {
  products: {
    items: { label: "מוצרים", shortLabel: "מוצרים", icon: Package },
    transactions: { label: "הזמנות", shortLabel: "הזמנות", icon: ShoppingCart },
    revenue: { label: "מכירות" },
    contacts: { label: "לקוחות", icon: Users },
    productsNav: "products",
    ordersNav: "orders",
    todosProductsLabel: "הוסיפו מוצרים",
    todosPaymentLabel: "חברו סליקה לקבלת תשלומים",
  },
  services: {
    items: { label: "מוצרים", shortLabel: "מוצרים", icon: Package },
    transactions: { label: "הזמנות", shortLabel: "הזמנות", icon: ShoppingCart },
    revenue: { label: "הכנסות" },
    contacts: { label: "לקוחות", icon: Users },
    productsNav: "products",
    ordersNav: "orders",
    todosProductsLabel: "הוסיפו שירותים / מוצרים",
    todosPaymentLabel: "חברו סליקה לקבלת תשלומים",
  },
  nonprofit: {
    items: { label: "פרויקטים", shortLabel: "פרויקטים", icon: Heart },
    transactions: { label: "תרומות", shortLabel: "תרומות", icon: HandCoins },
    revenue: { label: "סכום שגויס" },
    contacts: { label: "תורמים", icon: Users },
    productsNav: "products",
    ordersNav: "orders",
    todosProductsLabel: "הוסיפו פרויקטים / מיזמים",
    todosPaymentLabel: "הגדירו קבלת תרומות אונליין",
  },
  synagogue: {
    items: { label: "פרויקטים", shortLabel: "פרויקטים", icon: Heart },
    transactions: { label: "תרומות ועליות", shortLabel: "תרומות", icon: HandCoins },
    revenue: { label: "סכום שגויס" },
    contacts: { label: "מתפללים ותורמים", icon: Users },
    productsNav: "products",
    ordersNav: "orders",
    todosProductsLabel: "הוסיפו פרויקטים / מיזמים",
    todosPaymentLabel: "הגדירו קבלת תרומות אונליין",
  },
  realestate: {
    items: { label: "נכסים", shortLabel: "נכסים", icon: Building2 },
    transactions: { label: "לידים", shortLabel: "לידים", icon: Users },
    revenue: { label: "עסקאות סגורות" },
    contacts: { label: "לקוחות", icon: Users },
    productsNav: "products",
    ordersNav: "orders",
    todosProductsLabel: "הוסיפו נכסים",
    todosPaymentLabel: "הגדירו קבלת תשלומים / עמלות",
  },
};

const DashboardHome = ({
  stats,
  businessId,
  isSubscribed,
  hasPaymentFailure,
  hasAbout,
  businessType = "products",
  onNavigate,
}: DashboardHomeProps) => {
  const t = TYPE_LABELS[businessType];

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);

  const todos: { id: string; label: string; emphasized?: boolean; view: DashboardView }[] = [
    ...(!stats.paymentEnabled ? [{ id: "payments", label: t.todosPaymentLabel, emphasized: true, view: "payments" as DashboardView }] : []),
    ...(!hasAbout ? [{ id: "about", label: 'כתבו "אודות"', view: "content" as DashboardView }] : []),
    ...(stats.totalProducts === 0 ? [{ id: "products", label: t.todosProductsLabel, view: t.productsNav }] : []),
  ];

  const cards = [
    {
      id: "transactions",
      label: t.transactions.label,
      value: String(stats.totalOrders),
      Icon: t.transactions.icon,
      bg: "bg-blue-500/10",
      fg: "text-blue-600 dark:text-blue-400",
      view: t.ordersNav as DashboardView,
    },
    {
      id: "revenue",
      label: t.revenue.label,
      value: formatPrice(stats.totalSales),
      Icon: DollarSign,
      bg: "bg-emerald-500/10",
      fg: "text-emerald-600 dark:text-emerald-400",
      view: null,
    },
    {
      id: "items",
      label: t.items.label,
      value: String(stats.totalProducts),
      Icon: t.items.icon,
      bg: "bg-violet-500/10",
      fg: "text-violet-600 dark:text-violet-400",
      view: t.productsNav as DashboardView,
    },
    {
      id: "contacts",
      label: t.contacts.label,
      value: String(stats.totalCustomers),
      Icon: t.contacts.icon,
      bg: "bg-amber-500/10",
      fg: "text-amber-600 dark:text-amber-400",
      view: null,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <h1 className="text-xl font-semibold text-foreground">סקירה כללית</h1>

      {/* Subscription banner */}
      {!isSubscribed && (
        <div className="rounded-2xl bg-gradient-to-l from-orange-600 to-amber-500 text-white p-5 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4 shadow">
          <div className="flex-1">
            <p className="text-base font-semibold">האתר שלך במצב תצוגה מוקדמת</p>
            <p className="text-sm text-white/80 mt-0.5">שדרגו ל-69 ₪ לחודש ללא התחייבות כדי שהחנות תעלה לאוויר.</p>
          </div>
          <Button onClick={() => onNavigate("subscription")} className="bg-white text-amber-700 hover:bg-white/90 font-semibold gap-2 shrink-0">
            שדרגו עכשיו <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Failed payment banner */}
      {isSubscribed && hasPaymentFailure && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/8 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-red-600 dark:text-red-400 text-sm">חיוב החשבון נכשל</p>
            <p className="text-xs text-muted-foreground mt-0.5">הכרטיס שלך נחסם או סורב בחיוב האחרון. עדכנו את פרטי התשלום כדי שהאתר ימשיך לפעול.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate("subscription")} className="border-red-500/35 text-red-600 hover:bg-red-500/8 shrink-0">
            עדכנו כרטיס <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map(({ id, label, value, Icon, bg, fg, view }) => (
          <button
            key={id}
            type="button"
            onClick={() => view && onNavigate(view)}
            className={`bg-card rounded-2xl border border-border p-4 text-right transition-colors ${view ? "hover:bg-muted/40 cursor-pointer" : "cursor-default"}`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
              <Icon className={`h-4.5 w-4.5 ${fg}`} />
            </div>
            <p className="text-2xl font-bold text-foreground leading-none mb-1">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </button>
        ))}
      </div>

      {/* What's left */}
      {todos.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">מה עוד נשאר</h2>
          {todos.map((todo) => (
            <button
              key={todo.id}
              type="button"
              onClick={() => onNavigate(todo.view)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-right transition-colors ${
                todo.emphasized
                  ? "border-emerald-500/35 bg-emerald-500/8 hover:bg-emerald-500/12"
                  : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              <span className={`flex-1 text-sm font-medium ${todo.emphasized ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>{todo.label}</span>
              <span className="flex items-center gap-1 text-xs font-medium text-primary shrink-0">
                המשיכו <ChevronLeft className="h-3.5 w-3.5" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Link to store */}
      <button
        type="button"
        onClick={() => onNavigate("preview")}
        className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors text-right"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Eye className="h-4.5 w-4.5 text-primary" /> הכניסו לחנות שלך
        </span>
        <ChevronLeft className="h-4.5 w-4.5 text-muted-foreground" />
      </button>

      <ReferralBox />
      <DashboardAnalytics businessId={businessId} />
    </div>
  );
};

export default DashboardHome;
