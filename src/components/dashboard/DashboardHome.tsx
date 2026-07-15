import { Eye, ChevronLeft, AlertTriangle, ShoppingCart, TrendingUp, Package, Users, CreditCard, FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardView } from "./DashboardNav";
import type { BusinessType } from "@/lib/businessModules";
import DashboardAnalytics from "./DashboardAnalytics";
import ReferralBox from "./ReferralBox";
import WowStrip from "./WowStrip";
import type { PopupId, PopupState } from "./PostLaunchPopups";

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
  /** Set when the subscription was CANCELLED but the site is still live until this date (grace period). */
  cancelledUntil?: string | null;
  hasPaymentFailure?: boolean;
  hasAbout?: boolean;
  legalApprovedAt?: string | null;
  businessType?: BusinessType;
  onNavigate: (view: DashboardView) => void;
  popupState?: PopupState | null;
  onReopenPopup?: (id: PopupId) => void;
}

const DashboardHome = ({
  stats,
  businessId,
  isSubscribed,
  cancelledUntil,
  hasPaymentFailure,
  hasAbout,
  legalApprovedAt,
  businessType = "products",
  onNavigate,
  popupState,
  onReopenPopup,
}: DashboardHomeProps) => {
  // Per-business-type label mapping
  const typeLabels: Record<string, { orders: string; sales: string; products: string; customers: string; addProducts: string }> = {
    nonprofit:  { orders: 'תרומות',       sales: 'סה"כ תרומות', products: 'מיזמים',  customers: 'תורמים',  addProducts: 'הוסף פרויקטים ומיזמים' },
    synagogue:  { orders: 'תרומות ועליות', sales: 'סה"כ תרומות', products: 'מיזמים',  customers: 'תורמים',  addProducts: 'הוסף פרויקטים ומיזמים' },
    vacation:   { orders: 'הזמנות לינה',  sales: 'הכנסות',       products: 'חדרים',   customers: 'אורחים',  addProducts: 'הוסף חדרים ויחידות' },
    realestate: { orders: 'לידים',        sales: 'ערך עסקאות',    products: 'נכסים',   customers: 'לקוחות',  addProducts: 'הוסף נכסים' },
    services:   { orders: 'הזמנות',       sales: 'מכירות',       products: 'שירותים', customers: 'לקוחות',  addProducts: 'הוסף שירותים' },
    products:   { orders: 'הזמנות',       sales: 'מכירות',       products: 'מוצרים',  customers: 'לקוחות',  addProducts: 'הוסף את המוצרים שלך' },
  };
  const lbl = typeLabels[businessType] ?? typeLabels.products;

  const todos: { key: string; icon: typeof CreditCard; label: string; view: DashboardView; highlight: boolean }[] = [
    ...(!stats.paymentEnabled ? [{ key: 'payments', icon: CreditCard, label: 'חבר סליקה לקבלת תשלומים', view: 'payments' as DashboardView, highlight: true }] : []),
    ...(!hasAbout ? [{ key: 'about', icon: FileText, label: 'כתוב "אודות" בחנות', view: 'about' as DashboardView, highlight: false }] : []),
    ...(stats.totalProducts === 0 ? [{ key: 'products', icon: Package, label: lbl.addProducts, view: 'products' as DashboardView, highlight: false }] : []),
    ...(!legalApprovedAt ? [{ key: 'legal', icon: FileText, label: 'עדכן את התקנון שלך', view: 'legal' as DashboardView, highlight: false }] : []),
  ];

  const statCards = [
    { value: String(stats.totalOrders), label: lbl.orders, icon: ShoppingCart, view: 'orders' as DashboardView },
    { value: `₪${stats.totalSales?.toLocaleString('he-IL') ?? 0}`, label: lbl.sales, icon: TrendingUp, view: 'orders' as DashboardView },
    { value: String(stats.totalProducts), label: lbl.products, icon: Package, view: 'products' as DashboardView },
    { value: String(stats.totalCustomers ?? 0), label: lbl.customers, icon: Users, view: 'customers' as DashboardView },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* 1. Cancelled subscription warning - urgent, stays at top */}
      {!isSubscribed && cancelledUntil && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-base font-semibold text-foreground">המנוי בוטל - אבל האתר עדיין באוויר</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              האתר יישאר פעיל עד <b>{new Date(cancelledUntil).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}</b>, ואז יירד. אפשר לחדש בכל רגע ולהמשיך בדיוק מאיפה שהפסקת.
            </p>
          </div>
          <Button onClick={() => onNavigate("subscription")} className="bg-primary text-primary-foreground hover:opacity-90 font-semibold gap-2 shrink-0">
            חידוש המנוי <ChevronLeft className="h-4 w-4" />
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

      {/* 2. Stats - 4 cards with icons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <button key={s.label} onClick={() => onNavigate(s.view)}
            className="group rounded-2xl bg-card border border-border p-4 text-right hover:border-primary/40 hover:shadow-sm transition-all">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/15 transition-colors">
              <s.icon className="w-4 h-4 text-primary" strokeWidth={1.8} />
            </div>
            <p className="text-2xl font-bold text-foreground tracking-tight">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* 3. Todo items - only pending ones */}
      {todos.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">{todos.length} דברים שנשאר לסדר</p>
          <div className="space-y-2">
            {todos.map((todo) => (
              <button
                key={todo.key}
                onClick={() => onNavigate(todo.view)}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-right transition-colors ${
                  todo.highlight
                    ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 hover:bg-blue-100/70 dark:hover:bg-blue-950/50'
                    : 'bg-muted/40 hover:bg-muted/70 border border-transparent'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  todo.highlight ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-background border border-border'
                }`}>
                  <todo.icon className={`w-4 h-4 ${todo.highlight ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} strokeWidth={1.8} />
                </div>
                <span className={`text-sm font-medium flex-1 ${todo.highlight ? 'text-blue-700 dark:text-blue-300' : 'text-foreground'}`}>
                  {todo.label}
                </span>
                <ArrowLeft className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. WowStrip */}
      <WowStrip businessType={businessType} onNavigate={onNavigate} />

      {/* 5. Store link */}
      <button
        type="button"
        onClick={() => onNavigate("preview")}
        className="w-full rounded-2xl border border-border bg-card p-4 flex items-center justify-between hover:border-primary/40 hover:shadow-sm transition-all group"
      >
        <span className="flex items-center gap-2.5 text-sm font-medium text-foreground">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
            <Eye className="h-4 w-4 text-primary" strokeWidth={1.8} />
          </div>
          הכנס לחנות שלך
        </span>
        <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>

      {/* 6. Subscription upsell - free tier, shown at bottom */}
      {!isSubscribed && !cancelledUntil && (
        <div className="rounded-2xl bg-gradient-to-l from-orange-600 to-red-600 p-5 text-white flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-bold text-base">האתר שלך במצב תצוגה מוקדמת</p>
            <p className="text-sm text-white/80 mt-0.5">שדרג ל-69 ש"ח לחודש ללא התחייבות כדי שהחנות תעלה לאוויר</p>
          </div>
          <button
            onClick={() => onNavigate('subscription')}
            className="shrink-0 bg-white text-orange-600 font-bold text-sm px-4 py-2 rounded-xl hover:bg-orange-50 transition-colors"
          >
            שדרג עכשיו ←
          </button>
        </div>
      )}

      {/* 7. ReferralBox */}
      <ReferralBox />

      {/* 8. DashboardAnalytics */}
      <DashboardAnalytics businessId={businessId} />
    </div>
  );
};

export default DashboardHome;
