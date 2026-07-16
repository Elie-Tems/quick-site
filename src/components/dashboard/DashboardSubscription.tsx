import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gtm } from "@/lib/gtm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Crown, Calendar, Clock, Users, Gift, Zap, CheckCircle, Image, Package, AlertTriangle, Wand2, XCircle, ArrowUpCircle, ArrowDownCircle, Loader2, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays, isPast } from "date-fns";
import { he } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardInvoices from "@/components/dashboard/DashboardInvoices";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ReferralBox from "./ReferralBox";
import { useMyBusiness } from "@/hooks/useBusiness";
import { useBusinessUsage } from "@/hooks/useBusinessUsage";
import { useAICredits } from "@/hooks/useAIImageEngine";
import { PLANS, AI_CREDIT_PACKAGES } from "@/lib/pricingConfig";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Subscription {
  id: string;
  plan_name: string;
  status: string;
  paid_until: string | null;
  created_at: string;
  image_storage_package: string | null;
  image_storage_price: number;
  image_limit: number;
  product_addon_enabled: boolean;
  product_addon_price: number;
  monthly_total: number;
  cancel_at?: string | null;
  cancel_type?: "immediate" | "end_of_period" | null;
  billing_cycle_count?: number | null;
}

interface ReferralStats {
  totalReferred: number;
  rewardsEarned: number;
}

const CANCEL_REASONS = [
  "יקר מדי",
  "לא השתמשתי מספיק",
  "חסרות תכונות",
  "סוגר/מפסיק את העסק",
  "אחר",
];

const DashboardSubscription = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: business } = useMyBusiness();
  const { data: usageStatus } = useBusinessUsage(business?.id);
  const { data: aiCredits } = useAICredits(business?.id);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats>({ totalReferred: 0, rewardsEarned: 0 });
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [approvalNum, setApprovalNum] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [showApprovalInput, setShowApprovalInput] = useState(false);
  const [cardUpdateUrl, setCardUpdateUrl] = useState<string | null>(null);
  const [isLoadingCardUpdate, setIsLoadingCardUpdate] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !business?.id) return;

      try {
        // Fetch the ACTIVE site's subscription (per-site billing).
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('business_id', business.id)
          .maybeSingle();

        setSubscription(subData as Subscription);

        // Fetch referral stats
        const { data: referrals } = await supabase
          .from('referral_logs')
          .select('*')
          .eq('referrer_user_id', user.id);

        if (referrals) {
          setReferralStats({
            totalReferred: referrals.length,
            rewardsEarned: referrals.filter(r => r.reward_given).length,
          });
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, business?.id]);

  const getStatusBadge = (status: string, paidUntil: string | null) => {
    if (paidUntil && isPast(new Date(paidUntil))) {
      return <Badge variant="destructive">פג תוקף</Badge>;
    }
    
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">פעיל</Badge>;
      case 'trial':
        return <Badge variant="secondary">תקופת ניסיון</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">בוטל</Badge>;
      case 'expired':
        return <Badge variant="destructive">פג תוקף</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDaysRemaining = (paidUntil: string | null) => {
    if (!paidUntil) return null;
    const days = differenceInDays(new Date(paidUntil), new Date());
    return days;
  };

  const handleCancelSubscription = async (cancelType: "immediate" | "end_of_period") => {
    if (!subscription) return;

    setIsCancelling(true);
    try {
      // Cancel via the edge function: it cancels the iCount recurring charge
      // (הוראת קבע) FIRST - so billing actually stops - and only then records the
      // cancellation. If iCount can't confirm, it errors and we keep the sub active
      // (never "cancelled" while iCount still charges).
      const { data, error } = await supabase.functions.invoke("icount-cancel-subscription", {
        body: { cancelType, cancelReason: cancelReason || null, businessId: business?.id },
      });
      if (error || !data?.ok) {
        throw new Error((data as any)?.error || error?.message || "cancel_failed");
      }

      const cancelAt = (data as any).cancelAt || (cancelType === "immediate" ? new Date().toISOString() : subscription.paid_until);
      setSubscription({ ...subscription, status: 'cancelled', cancel_type: cancelType, cancel_at: cancelAt });
      setCancelDialogOpen(false);
      toast.success(
        cancelType === "immediate"
          ? 'המנוי בוטל, החיוב הופסק והאתר ירד מהאוויר.'
          : 'המנוי בוטל והחיוב הופסק. האתר יישאר באוויר עד תום התקופה ששולמה.',
      );
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('שגיאה בביטול המנוי. נסה שוב מאוחר יותר.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleResumeSubscription = async () => {
    if (!subscription) return;
    setIsCancelling(true);
    try {
      // Must go through the service-role function: the protect_subscription_billing
      // trigger blocks the client from changing `status` directly (that was the
      // "שגיאה בחידוש המנוי" bug - the direct UPDATE always threw).
      const { data, error } = await supabase.functions.invoke("subscription-resume", { body: { businessId: business?.id } });
      if (error || !(data as { ok?: boolean })?.ok) {
        throw new Error((data as { error?: string })?.error || error?.message || "resume_failed");
      }
      setSubscription({ ...subscription, status: 'active', cancel_type: null, cancel_at: null });
      toast.success('המנוי חודש, טוב שחזרת 🎉');
    } catch (error) {
      console.error('Error resuming subscription:', error);
      toast.error('לא הצלחנו לחדש כרגע. נסו שוב עוד רגע.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleUpdateCard = async () => {
    if (!business?.id) return;
    setIsLoadingCardUpdate(true);
    try {
      const { data, error } = await supabase.functions.invoke("billing-update-card", {
        body: { businessId: business.id },
      });
      if (error || !data?.ok) throw new Error((data as any)?.error || error?.message);
      setCardUpdateUrl((data as any).saleUrl);
    } catch (e) {
      toast.error("לא הצלחנו לפתוח דף עדכון כרטיס. נסה שוב.");
      console.error(e);
    } finally {
      setIsLoadingCardUpdate(false);
    }
  };

  const getProgressValue = (paidUntil: string | null, createdAt: string) => {
    if (!paidUntil) return 0;
    const totalDays = differenceInDays(new Date(paidUntil), new Date(createdAt));
    const remainingDays = differenceInDays(new Date(paidUntil), new Date());
    if (totalDays <= 0) return 0;
    return Math.max(0, Math.min(100, (remainingDays / totalDays) * 100));
  };

  const getCurrentPlan = () => {
    // Find current plan based on subscription plan_name
    return PLANS.find(p => p.id === subscription?.plan_name) || PLANS[0];
  };

  const calculateMonthlyTotal = () => {
    const plan = getCurrentPlan();
    return plan.price;
  };

  const handlePublish = async () => {
    if (!approvalNum.trim() || !business?.id) {
      toast.error("נא למלא את מספר האישור");
      return;
    }

    setPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke("finalize-publish", {
        body: {
          approvalNum: approvalNum.trim(),
          businessId: business.id,
        },
      });

      if (error) throw error;

      if (data?.ok) {
        toast.success("🎉 האתר פורסם בהצלחה! האתר שלך עכשיו זמין לציבור");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
        return;
      }

      if (data?.legalNotApproved) {
        toast.error(data.message || "צריך לאשר את המסמכים המשפטיים (תקנון ומדיניות פרטיות) לפני פרסום. עברו ל'מסמכים משפטיים' ואשרו.");
        return;
      }

      if (data?.error) {
        throw new Error(data.error);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "שגיאה בפרסום. נסה שוב או פנה לתמיכה");
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const daysRemaining = subscription ? getDaysRemaining(subscription.paid_until) : null;
  const isExpired = subscription?.paid_until && isPast(new Date(subscription.paid_until));
  const currentPlan = getCurrentPlan();

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Crown className="h-7 w-7 text-primary" />
        <h1 className="text-xl font-semibold text-foreground">התוכנית שלי</h1>
      </div>

      {/* Usage Warnings */}
      {usageStatus?.showImageWarning && (
        <Alert variant="default" className="border-orange-500 bg-orange-50 dark:bg-orange-900/20">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-700 dark:text-orange-300">אזהרת מקום תמונות</AlertTitle>
          <AlertDescription className="text-orange-600 dark:text-orange-400">
            הגעת ל-{usageStatus.imageUsagePercent}% ממכסת התמונות שלך. כדאי לשדרג את חבילת התמונות.
          </AlertDescription>
        </Alert>
      )}

      {usageStatus?.imageUploadBlocked && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>מכסת התמונות מלאה</AlertTitle>
          <AlertDescription>
            הגעת למגבלת התמונות. שדרגו את החבילה כדי להמשיך להעלות תמונות.
          </AlertDescription>
        </Alert>
      )}

      {usageStatus?.showProductWarning && (
        <Alert variant="default" className="border-orange-500 bg-orange-50 dark:bg-orange-900/20">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-700 dark:text-orange-300">אזהרת מוצרים</AlertTitle>
          <AlertDescription className="text-orange-600 dark:text-orange-400">
            הגעת ל-{usageStatus.productUsagePercent}% ממכסת המוצרים שלך ({usageStatus.usage?.products_count}/100).
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Subscription Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                תוכנית בסיס
              </CardTitle>
              {subscription && getStatusBadge(subscription.status, subscription.paid_until)}
            </div>
            <CardDescription>
              {getCurrentPlan().name} - {getCurrentPlan().label} מנוי חודשי + מע"מ
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription && (
              <>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    תאריך תפוגה
                  </span>
                  <span className="font-medium">
                    {subscription.paid_until
                      ? format(new Date(subscription.paid_until), 'dd MMMM yyyy', { locale: he })
                      : 'לא הוגדר'}
                  </span>
                </div>

                {/* Anniversary billing: charged on the same day-of-month the merchant
                    joined. The first month was paid in full now; the next charge is that
                    same date next month. Shown to new merchants so the date is clear. */}
                {(subscription.billing_cycle_count ?? 0) <= 1 && (
                  <p className="text-xs text-muted-foreground -mt-1">
                    החיוב החודשי מתבצע בכל חודש בתאריך שבו הצטרפת. החודש הראשון שולם במלואו עכשיו.
                  </p>
                )}

                {daysRemaining !== null && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        ימים שנותרו
                      </span>
                      <span className={`font-bold ${isExpired ? 'text-destructive' : daysRemaining <= 7 ? 'text-orange-500' : 'text-green-600'}`}>
                        {isExpired ? 'פג תוקף' : `${daysRemaining} ימים`}
                      </span>
                    </div>
                    <Progress 
                      value={getProgressValue(subscription.paid_until, subscription.created_at)} 
                      className="h-2"
                    />
                  </div>
                )}

                {isExpired && (
                  <Button variant="destructive" size="sm" className="w-full">
                    חדש את המנוי
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Image Storage Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5 text-blue-500" />
              אחסון תמונות
            </CardTitle>
            <CardDescription>
              {currentPlan.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">שימוש</span>
                <span className="font-medium">
                  {usageStatus?.usage?.stored_images_count || 0} / {usageStatus?.imageLimit || 50}
                </span>
              </div>
              <Progress 
                value={usageStatus?.imageUsagePercent || 0} 
                className={`h-2 ${usageStatus?.imageUploadBlocked ? '[&>div]:bg-destructive' : usageStatus?.showImageWarning ? '[&>div]:bg-orange-500' : ''}`}
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <span className="font-bold text-primary">{currentPlan.label} מנוי חודשי + מע"מ</span>
              <p className="text-xs text-muted-foreground">עד {currentPlan.productLimit} מוצרים</p>
            </div>
          </CardContent>
        </Card>

        {/* Product Add-on Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-500" />
              מוצרים
            </CardTitle>
            <CardDescription>
              {subscription?.product_addon_enabled ? 'ללא הגבלה' : 'עד 100 מוצרים'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">מוצרים פעילים</span>
                <span className="font-medium">
                  {usageStatus?.usage?.products_count || 0}
                  {!subscription?.product_addon_enabled && ' / 100'}
                </span>
              </div>
              {!subscription?.product_addon_enabled && (
                <Progress 
                  value={usageStatus?.productUsagePercent || 0} 
                  className={`h-2 ${usageStatus?.productAddBlocked ? '[&>div]:bg-destructive' : usageStatus?.showProductWarning ? '[&>div]:bg-orange-500' : ''}`}
                />
              )}
            </div>

            {subscription?.product_addon_enabled ? (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">תוספת פעילה</span>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full">
                שדרגו חבילה
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Credits Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-500" />
            קרדיטים AI
          </CardTitle>
          <CardDescription>
            שדרוג תמונות מקצועי עם בינה מלאכותית
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-3xl font-bold">{aiCredits?.credits_remaining || 0}</span>
              <span className="text-muted-foreground mr-2">קרדיטים זמינים</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!business?.id}
              onClick={() => business?.id && navigate(`/ai-credits-payment?businessId=${business.id}`)}
            >
              רכוש קרדיטים
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {AI_CREDIT_PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                disabled={!business?.id}
                onClick={() => business?.id && navigate(`/ai-credits-payment?businessId=${business.id}&package=${pkg.id}`)}
                className={`text-center p-3 rounded-lg border transition-colors hover:border-primary/60 hover:bg-primary/5 disabled:opacity-50 disabled:pointer-events-none ${pkg.recommended ? 'border-primary bg-primary/5' : 'border-border'}`}
              >
                <div className="font-bold">{pkg.credits}</div>
                <div className="text-xs text-muted-foreground">קרדיטים</div>
                <div className="text-sm font-medium text-primary mt-1">{pkg.label} <span className="text-[10px] font-normal text-muted-foreground">+ מע"מ</span></div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <Card>
        <CardHeader>
          <CardTitle>סיכום חודשי</CardTitle>
          <CardDescription>סך כל התשלומים החודשיים שלך</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">{getCurrentPlan().name}</span>
              <span className="font-medium">{getCurrentPlan().label} <span className="text-xs font-normal text-muted-foreground">+ מע"מ</span></span>
            </div>
            <div className="flex items-center justify-between py-3 bg-muted/50 rounded-lg px-3">
              <span className="font-bold">סה״כ לחודש</span>
              <span className="font-bold text-xl text-primary">₪{calculateMonthlyTotal()} <span className="text-xs font-normal text-muted-foreground">+ מע"מ</span></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices from iCount */}
      <DashboardInvoices />

      {/* Referral Stats Card */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              תגמולי הפניות
            </CardTitle>
            <CardDescription>
              הרווח חודשי שימוש חינם על כל חבר שמצטרף
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{referralStats.totalReferred}</div>
                <div className="text-sm text-muted-foreground">חברים שהזמנת</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{referralStats.rewardsEarned}</div>
                <div className="text-sm text-muted-foreground">חודשים שהרווחת</div>
              </div>
            </div>

            {referralStats.rewardsEarned > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <Gift className="h-5 w-5" />
                  <span className="font-medium">
                    הרווחת {referralStats.rewardsEarned} חודשי שימוש חינם! 🎉
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>פרטי חשבון</CardTitle>
            <CardDescription>מידע נוסף על החשבון שלך</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">אימייל</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">תאריך הצטרפות</span>
                <span className="font-medium">
                  {subscription?.created_at 
                    ? format(new Date(subscription.created_at), 'dd MMMM yyyy', { locale: he })
                    : user?.created_at 
                      ? format(new Date(user.created_at), 'dd MMMM yyyy', { locale: he })
                      : '-'}
                </span>
              </div>
              {/* <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground">מזהה משתמש</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {user?.id.slice(0, 8)}...
                </code>
              </div> */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Approval Number Card - only when publishing requires payment (hidden
          while free-publish is on, where the approval-number flow is irrelevant). */}
      {business && !business.is_published && import.meta.env.VITE_PUBLISH_SKIP_PAYMENT !== "true" && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              אישור תשלום ופרסום אתר
            </CardTitle>
            <CardDescription>
              אם כבר שילמת את התשלום, הזן את מספר האישור כדי לפרסמו את האתר
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showApprovalInput ? (
              <Button
                variant="outline"
                onClick={() => setShowApprovalInput(true)}
                className="w-full"
              >
                כבר שילמתי? הזן מספר אישור
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 text-right">
                  <Label htmlFor="approvalNum">
                    מספר אישור מiCount
                  </Label>
                  <Input
                    id="approvalNum"
                    type="text"
                    placeholder="הזן מספר אישור"
                    value={approvalNum}
                    onChange={(e) => setApprovalNum(e.target.value)}
                    className="text-right"
                    dir="rtl"
                    disabled={publishing}
                  />
                  <p className="text-xs text-muted-foreground">
                    מספר האישור נמצא בחלק התחתון של הקבלה שקיבלת במייל
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={handlePublish}
                    disabled={publishing || !approvalNum.trim()}
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin ml-2" />
                        מפרסם...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 ml-2" />
                        פרסמו את האתר
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowApprovalInput(false);
                      setApprovalNum("");
                    }}
                    disabled={publishing}
                  >
                    ביטול
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Card update iframe — shown after handleUpdateCard() */}
      {cardUpdateUrl && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">עדכון כרטיס אשראי</CardTitle>
              <button
                onClick={() => setCardUpdateUrl(null)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕ סגור
              </button>
            </div>
            <CardDescription>הזינו את פרטי הכרטיס החדש. תחויבו ₪1 לאימות שיוחזר אוטומטית תוך 24 שעות.</CardDescription>
          </CardHeader>
          <CardContent>
            <iframe
              src={cardUpdateUrl}
              className="w-full rounded-xl border border-border"
              style={{ height: 460 }}
              title="עדכון כרטיס אשראי"
            />
          </CardContent>
        </Card>
      )}

      {/* Subscription Management Card */}
      <Card>
        <CardHeader>
          <CardTitle>ניהול מנוי</CardTitle>
          <CardDescription>עדכן כרטיס, הוסף תוספות או בטל את המנוי</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {/* Update card — always shown for active/past_due Cardcom subs */}
            {subscription && subscription.status !== 'cancelled' && (
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={handleUpdateCard}
                disabled={isLoadingCardUpdate}
              >
                {isLoadingCardUpdate ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                עדכנו כרטיס אשראי
              </Button>
            )}

            {/* Upgrade — opens add-ons */}
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              disabled={subscription?.status === 'cancelled'}
              onClick={() => {
                const el = document.getElementById("addons-section");
                el ? el.scrollIntoView({ behavior: "smooth" }) : window.location.hash = "#addons-section";
              }}
            >
              <ArrowUpCircle className="h-4 w-4" />
              הוסיפו תוספות לחנות
            </Button>

            {/* Downgrade — scroll to cancel if only one plan */}
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              disabled={subscription?.status === 'cancelled'}
              onClick={() => {
                const el = document.getElementById("cancel-section");
                el ? el.scrollIntoView({ behavior: "smooth" }) : setCancelDialogOpen(true);
              }}
            >
              <ArrowDownCircle className="h-4 w-4" />
              הורידו תוכנית / בטלו מנוי
            </Button>

            {subscription && subscription.status !== 'cancelled' && (
              <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    id="cancel-section"
                    variant="ghost"
                    className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-transparent text-sm"
                    disabled={isCancelling}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    ביטול מנוי
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>רגע... בטוח? 🙈</AlertDialogTitle>
                    <AlertDialogDescription>
                      האתר שלך עובד בשבילך 24/7 - לא לוקח חופשות, לא מתלונן, ואפילו לא שותה קפה. באמת בא לך להיפרד? 💔
                      <br /><br />
                      <strong className="text-foreground">רק שתדעו:</strong> החודש הנוכחי כבר חויב ולא יוחזר, והביטול פשוט עוצר את החידוש הבא. אם כבר החלטתם - איך תעדיפו להמשיך?
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  {/* Optional reason - retention insight, doesn't block cancellation.
                      Nudge (never force) the merchant to tell us why, in their words. */}
                  <div className="space-y-2 py-1">
                    <p className="text-sm text-muted-foreground">לפני שאתם בורחים - ספרו לנו מה קרה? זה עוזר לנו להשתפר (ומאוד לא חובה 😇)</p>
                    <div className="flex flex-wrap gap-2">
                      {CANCEL_REASONS.map((reason) => (
                        <button
                          key={reason}
                          type="button"
                          onClick={() => setCancelReason((r) => (r === reason ? "" : reason))}
                          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                            cancelReason === reason
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {reason}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="או במילים שלכם... (מבטיחים לקרוא)"
                      rows={2}
                      className="w-full rounded-xl border border-border bg-background text-sm p-2.5 focus:outline-none focus:border-primary resize-none"
                    />
                  </div>

                  <div className="space-y-2 py-1">
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={() => handleCancelSubscription('end_of_period')}
                      className="w-full text-right p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors disabled:opacity-50"
                    >
                      <div className="font-medium text-foreground">השאר את האתר באוויר עד תום התקופה</div>
                      <div className="text-xs text-muted-foreground">
                        האתר ימשיך לפעול עד {subscription.paid_until ? format(new Date(subscription.paid_until), 'dd/MM/yyyy') : 'תום התקופה'}, ואז יורד.
                      </div>
                    </button>
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={() => handleCancelSubscription('immediate')}
                      className="w-full text-right p-3 rounded-xl border border-destructive/40 hover:bg-destructive/5 transition-colors disabled:opacity-50"
                    >
                      <div className="font-medium text-destructive">הורד את האתר מיד</div>
                      <div className="text-xs text-muted-foreground">האתר יורד מהאוויר עכשיו ולא יהיה נגיש ללקוחות.</div>
                    </button>
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isCancelling}>חזור</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {subscription?.status === 'cancelled' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>ביטלת - וזה בסדר גמור 💛</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>
                    {subscription.cancel_type === 'immediate'
                      ? 'המנוי בוטל והאתר ירד מהאוויר. היה כיף - ואם תתגעגע, כפתור החידוש כאן ומחכה לך. נשאיר את האור דלוק 🕯️'
                      : `המנוי בוטל, אבל לא נפרדים עדיין - האתר יישאר באוויר עד ${subscription.cancel_at || subscription.paid_until ? format(new Date(subscription.cancel_at || subscription.paid_until!), 'dd/MM/yyyy') : 'תום התקופה'}, ואז יורד. משנים את דעתכם? החידוש במרחק קליק, ותמיד נשמח לראותכם שוב 😊`}
                  </p>
                  <Button size="sm" variant="outline" onClick={handleResumeSubscription} disabled={isCancelling}>
                    חידוש המנוי
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Referral Box — always at the bottom */}
      <ReferralBox />
    </div>
  );
};

export default DashboardSubscription;
