import { Eye, ChevronLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardView } from "./DashboardNav";
import type { BusinessType } from "@/lib/businessModules";
import DashboardAnalytics from "./DashboardAnalytics";
import ReferralBox from "./ReferralBox";
import WowStrip from "./WowStrip";
import TodoCards from "./TodoCards";
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
  businessType = "products",
  onNavigate,
  popupState,
  onReopenPopup,
}: DashboardHomeProps) => {
  const todos = [
    ...(!stats.paymentEnabled ? [{ key: 'payments', emoji: '💳', label: 'חבר סליקה לקבלת תשלומים', view: 'payments' as DashboardView, highlight: true }] : []),
    ...(!hasAbout ? [{ key: 'about', emoji: '📝', label: 'כתוב "אודות" בחנות', view: 'about' as DashboardView, highlight: false }] : []),
    ...(stats.totalProducts === 0 ? [{ key: 'products', emoji: '🛍️', label: 'הוסף את המוצרים שלך', view: 'products' as DashboardView, highlight: false }] : []),
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">

      {/* 1. Subscription banner */}
      {!isSubscribed && cancelledUntil ? (
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
      ) : !isSubscribed ? (
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
      ) : null}

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

      {/* 2. Stats - 4 simple cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button onClick={() => onNavigate('orders')} className="rounded-2xl bg-card border border-border p-4 text-right hover:border-primary/40 transition-colors">
          <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
          <p className="text-xs text-muted-foreground mt-1">הזמנות</p>
        </button>
        <button onClick={() => onNavigate('orders')} className="rounded-2xl bg-card border border-border p-4 text-right hover:border-primary/40 transition-colors">
          <p className="text-2xl font-bold text-foreground">₪{stats.totalSales?.toLocaleString('he-IL') ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">מכירות</p>
        </button>
        <button onClick={() => onNavigate('products')} className="rounded-2xl bg-card border border-border p-4 text-right hover:border-primary/40 transition-colors">
          <p className="text-2xl font-bold text-foreground">{stats.totalProducts}</p>
          <p className="text-xs text-muted-foreground mt-1">מוצרים</p>
        </button>
        <button onClick={() => onNavigate('customers')} className="rounded-2xl bg-card border border-border p-4 text-right hover:border-primary/40 transition-colors">
          <p className="text-2xl font-bold text-foreground">{stats.totalCustomers ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">לקוחות</p>
        </button>
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
                    ? 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/50'
                    : 'bg-muted/40 hover:bg-muted/70'
                }`}
              >
                <span className="text-xl">{todo.emoji}</span>
                <span className={`text-sm font-medium ${todo.highlight ? 'text-blue-700 dark:text-blue-300' : 'text-foreground'}`}>
                  {todo.label}
                </span>
                <span className="mr-auto text-muted-foreground text-xs">←</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. WowStrip */}
      <WowStrip businessType={businessType} onNavigate={onNavigate} />

      {/* Todo cards (post-launch popups) */}
      {popupState != null && onReopenPopup && (
        <TodoCards popupState={popupState} onReopen={onReopenPopup} />
      )}

      {/* 5. Store link */}
      <button
        type="button"
        onClick={() => onNavigate("preview")}
        className="w-full rounded-2xl border border-border bg-card p-4 flex items-center justify-between hover:border-primary/40 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Eye className="h-4 w-4 text-primary" /> הכנס לחנות שלך
        </span>
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* 6. ReferralBox */}
      <ReferralBox />

      {/* 7. DashboardAnalytics */}
      <DashboardAnalytics businessId={businessId} />
    </div>
  );
};

export default DashboardHome;
