import { Eye, ChevronLeft, AlertTriangle, ShoppingCart, TrendingUp, Package, Users, CreditCard, FileText, ArrowLeft, Link2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardView } from "./DashboardNav";
import type { BusinessType } from "@/lib/businessModules";
import ReferralBox from "./ReferralBox";
import WowStrip from "./WowStrip";
import type { PopupId, PopupState } from "./PostLaunchPopups";
import { TodayAppointmentsCard } from "./TodayAppointmentsCard";
import { useLanguage } from "@/contexts/LanguageContext";

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
  storeSlug?: string;
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
  hasBooking?: boolean;
  todayAppointments?: import("@/hooks/useBooking").Appointment[];
  todayAppointmentsLoading?: boolean;
  onConfirmAppointment?: (id: string) => void;
  onCancelAppointment?: (id: string) => void;
}

const DashboardHome = ({
  stats,
  businessId,
  storeSlug,
  isSubscribed,
  cancelledUntil,
  hasPaymentFailure,
  hasAbout,
  legalApprovedAt,
  businessType = "products",
  onNavigate,
  popupState,
  onReopenPopup,
  hasBooking = false,
  todayAppointments = [],
  todayAppointmentsLoading = false,
  onConfirmAppointment,
  onCancelAppointment,
}: DashboardHomeProps) => {
  const { t } = useLanguage();
  const slugHasHebrew = storeSlug ? /[֐-׿]/.test(storeSlug) : false;
  // Per-business-type label mapping
  const typeLabels: Record<string, { orders: string; sales: string; products: string; customers: string; addProducts: string }> = {
    nonprofit:  { orders: t("dash.home.type.nonprofit.orders"), sales: t("dash.home.type.nonprofit.sales"), products: t("dash.home.type.nonprofit.products"), customers: t("dash.home.type.nonprofit.customers"), addProducts: t("dash.home.type.nonprofit.add_products") },
    synagogue:  { orders: t("dash.home.type.synagogue.orders"), sales: t("dash.home.type.synagogue.sales"), products: t("dash.home.type.synagogue.products"), customers: t("dash.home.type.synagogue.customers"), addProducts: t("dash.home.type.synagogue.add_products") },
    vacation:   { orders: t("dash.home.type.vacation.orders"), sales: t("dash.home.type.vacation.sales"), products: t("dash.home.type.vacation.products"), customers: t("dash.home.type.vacation.customers"), addProducts: t("dash.home.type.vacation.add_products") },
    realestate: { orders: t("dash.home.type.realestate.orders"), sales: t("dash.home.type.realestate.sales"), products: t("dash.home.type.realestate.products"), customers: t("dash.home.type.realestate.customers"), addProducts: t("dash.home.type.realestate.add_products") },
    services:   { orders: t("dash.home.type.services.orders"), sales: t("dash.home.type.services.sales"), products: t("dash.home.type.services.products"), customers: t("dash.home.type.services.customers"), addProducts: t("dash.home.type.services.add_products") },
    products:   { orders: t("dash.home.type.products.orders"), sales: t("dash.home.type.products.sales"), products: t("dash.home.type.products.products"), customers: t("dash.home.type.products.customers"), addProducts: t("dash.home.type.products.add_products") },
  };
  const lbl = typeLabels[businessType] ?? typeLabels.products;

  const todos: { key: string; icon: typeof CreditCard; label: string; view: DashboardView; highlight: boolean }[] = [
    ...(!stats.paymentEnabled ? [{ key: 'payments', icon: CreditCard, label: t("dash.home.todo_payments"), view: 'payments' as DashboardView, highlight: true }] : []),
    ...(!hasAbout ? [{ key: 'about', icon: FileText, label: t("dash.home.todo_about"), view: 'about' as DashboardView, highlight: false }] : []),
    ...(stats.totalProducts === 0 ? [{ key: 'products', icon: Package, label: lbl.addProducts, view: 'products' as DashboardView, highlight: false }] : []),
  ];

  // nonprofit/synagogue never write to the orders table (donations live in
  // `transactions` instead, surfaced under the "verticals" tab's DonationsManager)
  // - routing their donation tiles at 'orders' would land on a screen DashboardNav
  // itself hides from the sidebar for these exact two types.
  const isDonationVertical = businessType === 'nonprofit' || businessType === 'synagogue';
  const revenueView: DashboardView = isDonationVertical ? 'verticals' : 'orders';
  const statCards = [
    { value: String(stats.totalOrders), label: lbl.orders, icon: ShoppingCart, view: revenueView },
    { value: `₪${stats.totalSales?.toLocaleString('he-IL') ?? 0}`, label: lbl.sales, icon: TrendingUp, view: revenueView },
    { value: String(stats.totalProducts), label: lbl.products, icon: Package, view: 'products' as DashboardView },
    { value: String(stats.totalCustomers ?? 0), label: lbl.customers, icon: Users, view: 'customers' as DashboardView },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">

      {hasBooking && (
        <TodayAppointmentsCard
          appointments={todayAppointments}
          isLoading={todayAppointmentsLoading}
          onConfirm={onConfirmAppointment ?? (() => {})}
          onCancel={onCancelAppointment ?? (() => {})}
          onNavigateToCalendar={() => onNavigate("verticals")}
        />
      )}

      {/* 1. Not subscribed yet - preview mode banner (top, non-dismissible) */}
      {!isSubscribed && !cancelledUntil && (
        <div className="rounded-2xl bg-gradient-to-l from-orange-600 to-red-600 p-5 text-white flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-bold text-base">{t("dash.home.preview_title")}</p>
            <p className="text-sm text-white/80 mt-0.5">{t("dash.home.preview_desc")}</p>
          </div>
          <button
            onClick={() => onNavigate('subscription')}
            className="shrink-0 bg-white text-orange-600 font-bold text-sm px-4 py-2 rounded-xl hover:bg-orange-50 transition-colors"
          >
            {t("dash.home.preview_upgrade_cta")}
          </button>
        </div>
      )}

      {/* 2. Cancelled subscription warning */}
      {!isSubscribed && cancelledUntil && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-base font-semibold text-foreground">{t("dash.home.cancelled_title")}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {t("dash.home.cancelled_active_until")} <b>{new Date(cancelledUntil).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" })}</b>{t("dash.home.cancelled_then_desc")}
            </p>
          </div>
          <Button onClick={() => onNavigate("subscription")} className="bg-primary text-primary-foreground hover:opacity-90 font-semibold gap-2 shrink-0">
            {t("dash.home.cancelled_renew_cta")} <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Failed payment banner */}
      {isSubscribed && hasPaymentFailure && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/8 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-red-600 dark:text-red-400 text-sm">{t("dash.home.payment_failed_title")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("dash.home.payment_failed_desc")}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate("subscription")} className="border-red-500/35 text-red-600 hover:bg-red-500/8 shrink-0">
            {t("dash.home.payment_failed_cta")} <ChevronLeft className="h-4 w-4" />
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
          <p className="text-sm font-semibold text-foreground">{todos.length} {t("dash.home.todos_remaining")}</p>
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
          {t("dash.home.enter_store")}
        </span>
        <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </button>

      {/* Slug warning - shown only when store URL contains Hebrew chars (gets long when shared) */}
      {slugHasHebrew && (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
          <Link2 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{t("dash.home.slug_warning_title")}</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-0.5 truncate" dir="ltr">
              siango.app/store/{storeSlug}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("settings")}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Pencil className="h-3 w-3" /> {t("dash.home.slug_fix_cta")}
          </button>
        </div>
      )}

      {/* 6. ReferralBox */}
      <ReferralBox />
    </div>
  );
};

export default DashboardHome;
