import { ShoppingCart, DollarSign, Package, Users, Eye, ChevronLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardView } from "./DashboardNav";
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
  /** Last charge attempt failed — card declined/blocked. */
  hasPaymentFailure?: boolean;
  hasAbout?: boolean;
  onNavigate: (view: DashboardView) => void;
}

const DashboardHome = ({ stats, businessId, isSubscribed, hasPaymentFailure, hasAbout, onNavigate }: DashboardHomeProps) => {
  const formatPrice = (price: number) =>
    new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);

  // Two very different "payments": the Siango subscription (below, banner) decides
  // if the site is live at all - urgent. The merchant's own acquirer (סליקה) only
  // decides if shoppers can pay online - a "what's left" row, not a banner.
  const todos: { id: string; label: string; emphasized?: boolean; view: DashboardView }[] = [
    ...(!stats.paymentEnabled ? [{ id: "payments", label: "חבר סליקה לקבלת תשלומים", emphasized: true, view: "payments" as DashboardView }] : []),
    ...(!hasAbout ? [{ id: "about", label: 'כתוב "אודות"', view: "about" as DashboardView }] : []),
    ...(stats.totalProducts === 0 ? [{ id: "products", label: "הוסף מוצרים", view: "products" as DashboardView }] : []),
  ];

  const cards = [
    { id: "orders", label: "הזמנות", value: String(stats.totalOrders), Icon: ShoppingCart, bg: "bg-blue-500/15", fg: "text-blue-500" },
    { id: "sales", label: "מכירות", value: formatPrice(stats.totalSales), Icon: DollarSign, bg: "bg-emerald-500/15", fg: "text-emerald-500" },
    { id: "products", label: "מוצרים", value: String(stats.totalProducts), Icon: Package, bg: "bg-violet-500/15", fg: "text-violet-500" },
    { id: "customers", label: "לקוחות", value: String(stats.totalCustomers), Icon: Users, bg: "bg-amber-500/15", fg: "text-amber-500" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">דשבורד</h1>

      {/* Subscription banner - the one urgent thing. Without a paid subscription the
          store isn't live. Elegant, not scary; disappears once subscribed. */}
      {!isSubscribed && (
        <div className="rounded-2xl bg-gradient-to-l from-orange-600 to-amber-500 text-white p-6 md:p-7 flex flex-col sm:flex-row sm:items-center gap-4 shadow-lg">
          <div className="flex-1">
            <p className="text-lg md:text-xl font-bold">האתר שלך במצב תצוגה מוקדמת</p>
            <p className="text-sm text-white/85 mt-1">שדרג ל-69 ₪ לחודש ללא התחייבות כדי שהחנות תעלה לאוויר.</p>
          </div>
          <Button
            onClick={() => onNavigate("subscription")}
            className="bg-white text-amber-700 hover:bg-white/90 font-bold gap-2 shrink-0"
          >
            שדרג עכשיו <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Failed charge banner — card declined or blocked on the last billing attempt */}
      {isSubscribed && hasPaymentFailure && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5 sm:mt-0" />
          <div className="flex-1">
            <p className="font-semibold text-red-600 dark:text-red-400">חיוב החשבון נכשל</p>
            <p className="text-sm text-muted-foreground mt-0.5">הכרטיס שלך נחסם או סורב בחיוב האחרון. עדכן את פרטי התשלום כדי שהאתר ימשיך לפעול.</p>
          </div>
          <Button
            variant="outline"
            onClick={() => onNavigate("subscription")}
            className="border-red-500/40 text-red-600 hover:bg-red-500/10 shrink-0"
          >
            עדכן כרטיס <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map(({ id, label, value, Icon, bg, fg }) => (
          <div key={id} className="bg-card rounded-xl border border-border p-5 shadow-soft">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg}`}>
                <Icon className={`h-5 w-5 ${fg}`} />
              </div>
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* What's left - only incomplete items; a finished item disappears entirely. */}
      {todos.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">מה עוד נשאר</h2>
          {todos.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onNavigate(t.view)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border text-right transition-colors ${
                t.emphasized
                  ? "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15"
                  : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              <span className={`flex-1 font-medium ${t.emphasized ? "text-emerald-500" : "text-foreground"}`}>{t.label}</span>
              <span className="flex items-center gap-1 text-sm font-medium text-primary shrink-0">
                המשך <ChevronLeft className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Link to the store - always shown */}
      <button
        type="button"
        onClick={() => onNavigate("preview")}
        className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors text-right"
      >
        <span className="flex items-center gap-2 font-medium text-foreground">
          <Eye className="h-5 w-5 text-primary" /> הכנס לחנות שלך
        </span>
        <ChevronLeft className="h-5 w-5 text-muted-foreground" />
      </button>

      <ReferralBox />
      <DashboardAnalytics businessId={businessId} />
    </div>
  );
};

export default DashboardHome;
