import { ShoppingCart, DollarSign, Package, Eye, ChevronLeft } from "lucide-react";
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
  };
  businessId?: string;
  isPublished?: boolean;
  /** Has an active, paid Siango subscription (decides if the site is live). */
  isSubscribed?: boolean;
  hasAbout?: boolean;
  onNavigate: (view: DashboardView) => void;
}

const DashboardHome = ({ stats, businessId, isSubscribed, hasAbout, onNavigate }: DashboardHomeProps) => {
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
    { id: "orders", label: "הזמנות", value: String(stats.totalOrders), Icon: ShoppingCart, bg: "bg-blue-100", fg: "text-blue-600" },
    { id: "sales", label: "מכירות", value: formatPrice(stats.totalSales), Icon: DollarSign, bg: "bg-green-100", fg: "text-green-600" },
    { id: "products", label: "מוצרים", value: String(stats.totalProducts), Icon: Package, bg: "bg-purple-100", fg: "text-purple-600" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">דשבורד</h1>

      {/* Subscription banner - the one urgent thing. Without a paid subscription the
          store isn't live. Elegant, not scary; disappears once subscribed. */}
      {!isSubscribed && (
        <div className="rounded-2xl bg-primary text-primary-foreground p-6 md:p-7 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-lg md:text-xl font-bold">כמעט שם! החנות שלך מוכנה</p>
            <p className="text-sm text-primary-foreground/80 mt-1">נשאר רק לפתוח אותה לאוויר - והיא עולה מיד.</p>
          </div>
          <Button
            onClick={() => onNavigate("subscription")}
            className="bg-white text-primary hover:bg-white/90 font-semibold gap-2 shrink-0"
          >
            התחל - 69 ₪ לחודש <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  ? "border-emerald-500/50 bg-emerald-50 hover:bg-emerald-100/70"
                  : "border-border bg-card hover:bg-muted/50"
              }`}
            >
              <span className={`flex-1 font-medium ${t.emphasized ? "text-emerald-800" : "text-foreground"}`}>{t.label}</span>
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
