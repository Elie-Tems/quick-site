import { ShoppingCart, DollarSign, CreditCard, Plus, Eye, Image, Package, FolderTree, Info, Rocket, CheckCircle2, ChevronLeft, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardView } from "./DashboardNav";
import DashboardAnalytics from "./DashboardAnalytics";
import ReferralBox from "./ReferralBox";
import { AIImageUpsellCard } from "./AIImageUpsell";
import PaymentsQuickStart from "@/components/payments/PaymentsQuickStart";

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
  hasAbout?: boolean;
  onNavigate: (view: DashboardView) => void;
}

const DashboardHome = ({ stats, businessId, isPublished, hasAbout, onNavigate }: DashboardHomeProps) => {
  // Launch checklist - orients a brand-new owner on what to do to go live.
  const launchSteps: { id: string; label: string; desc: string; done: boolean; view: DashboardView; icon: typeof Package }[] = [
    { id: "products", label: "הוספת מוצרים", desc: "הוסיפו את המוצרים הראשונים לחנות", done: stats.totalProducts > 0, view: "products", icon: Package },
    { id: "payments", label: "הגדרת סליקה", desc: "חברו אמצעי תשלום כדי לקבל הזמנות", done: stats.paymentEnabled, view: "payments", icon: CreditCard },
    { id: "about", label: 'כתיבת "אודות"', desc: "ספרו ללקוחות על העסק שלכם", done: !!hasAbout, view: "about", icon: Info },
    { id: "publish", label: "פרסום האתר", desc: "העלו את החנות לאוויר", done: !!isPublished, view: "settings", icon: Rocket },
  ];
  const completedSteps = launchSteps.filter((s) => s.done).length;
  const allDone = completedSteps === launchSteps.length;
  const progressPct = Math.round((completedSteps / launchSteps.length) * 100);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">דשבורד</h1>

      {/* Payments not set up yet -> the prominent, first thing a merchant sees. */}
      {!stats.paymentEnabled && <PaymentsQuickStart onConnect={() => onNavigate("payments")} />}

      {/* Launch checklist - guides a new store to go live; replaced by a success
          banner once everything is done. */}
      {allDone ? (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <PartyPopper className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-foreground">האתר שלך באוויר ומוכן! 🎉</p>
            <p className="text-sm text-muted-foreground">כל הכבוד - השלמת את כל שלבי ההשקה.</p>
          </div>
          <Button variant="outline" className="gap-2 hidden sm:flex" onClick={() => onNavigate("preview")}>
            <Eye className="h-4 w-4" /> צפה באתר
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" /> מסלול ההשקה שלך
              </h2>
              <p className="text-sm text-muted-foreground">כמה צעדים קצרים והחנות שלך מוכנה למכירה</p>
            </div>
            <span className="text-sm font-semibold text-foreground whitespace-nowrap">
              {completedSteps}/{launchSteps.length} הושלמו
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {launchSteps.map((step) => (
              <button
                key={step.id}
                type="button"
                onClick={() => onNavigate(step.view)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-right transition-colors ${
                  step.done
                    ? "border-border bg-muted/40"
                    : "border-primary/30 bg-primary/5 hover:bg-primary/10"
                }`}
              >
                {step.done ? (
                  <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <step.icon className="h-3.5 w-3.5 text-primary" />
                  </span>
                )}
                <span className="flex-1 min-w-0">
                  <span className={`block font-medium ${step.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {step.label}
                  </span>
                  {!step.done && <span className="block text-xs text-muted-foreground">{step.desc}</span>}
                </span>
                {!step.done && (
                  <span className="flex items-center gap-1 text-sm font-medium text-primary flex-shrink-0">
                    המשך <ChevronLeft className="h-4 w-4" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Products */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm text-muted-foreground">סה״כ מוצרים</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.totalProducts}</p>
        </div>

        {/* Total Categories */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
              <FolderTree className="h-5 w-5 text-indigo-600" />
            </div>
            <span className="text-sm text-muted-foreground">סה״כ קטגוריות</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.totalCategories}</p>
        </div>

        {/* Total Orders */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm text-muted-foreground">סה״כ הזמנות</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.totalOrders}</p>
        </div>

        {/* Total Sales - Only if payments enabled */}
        {stats.paymentEnabled && (
          <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm text-muted-foreground">סה״כ מכירות</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{formatPrice(stats.totalSales)}</p>
          </div>
        )}

        {/* Payment Status */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              stats.paymentEnabled ? 'bg-green-100' : 'bg-amber-100'
            }`}>
              <CreditCard className={`h-5 w-5 ${
                stats.paymentEnabled ? 'text-green-600' : 'text-amber-600'
              }`} />
            </div>
            <span className="text-sm text-muted-foreground">סטטוס סליקה</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${
              stats.paymentEnabled ? 'bg-green-500' : 'bg-amber-500'
            }`} />
            <span className="font-semibold text-foreground">
              {stats.paymentEnabled ? 'פעיל' : 'לא פעיל'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">פעולות מהירות</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2"
            onClick={() => onNavigate('products')}
          >
            <Plus className="h-5 w-5" />
            <span>הוסף מוצר</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2"
            onClick={() => onNavigate('orders')}
          >
            <Eye className="h-5 w-5" />
            <span>צפה בהזמנות</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2"
            onClick={() => onNavigate('banners')}
          >
            <Image className="h-5 w-5" />
            <span>נהל באנרים</span>
          </Button>
        </div>
      </div>

      {/* AI Image Upsell - Soft Sell */}
      <AIImageUpsellCard 
        businessId={businessId} 
        onNavigateToAI={() => onNavigate('ai-images')} 
      />

      {/* Referral Program */}
      <ReferralBox />

      {/* Analytics Section */}
      <DashboardAnalytics businessId={businessId} />
    </div>
  );
};

export default DashboardHome;
