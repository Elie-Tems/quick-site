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
import { useLanguage } from "@/contexts/LanguageContext";
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
  { value: "יקר מדי", key: "expensive" },
  { value: "לא השתמשתי מספיק", key: "not_used_enough" },
  { value: "חסרות תכונות", key: "missing_features" },
  { value: "סוגר/מפסיק את העסק", key: "closing_business" },
  { value: "אחר", key: "other" },
];

const DashboardSubscription = () => {
  const { t } = useLanguage();
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
      return <Badge variant="destructive">{t("dash.subscription.status_expired")}</Badge>;
    }

    switch (status) {
      case 'active':
        return <Badge className="bg-green-500 hover:bg-green-600">{t("dash.subscription.status_active")}</Badge>;
      case 'trial':
        return <Badge variant="secondary">{t("dash.subscription.status_trial")}</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">{t("dash.subscription.status_cancelled")}</Badge>;
      case 'expired':
        return <Badge variant="destructive">{t("dash.subscription.status_expired")}</Badge>;
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
          ? t("dash.subscription.toast_cancelled_immediate")
          : t("dash.subscription.toast_cancelled_end_of_period"),
      );
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error(t("dash.subscription.toast_cancel_error"));
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
      toast.success(t("dash.subscription.toast_resumed"));
    } catch (error) {
      console.error('Error resuming subscription:', error);
      toast.error(t("dash.subscription.toast_resume_error"));
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
      toast.error(t("dash.subscription.toast_card_update_error"));
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
      toast.error(t("dash.subscription.toast_fill_approval_num"));
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
        toast.success(t("dash.subscription.toast_publish_success"));
        setTimeout(() => {
          window.location.reload();
        }, 1500);
        return;
      }

      if (data?.legalNotApproved) {
        toast.error(data.message || t("dash.subscription.toast_legal_not_approved"));
        return;
      }

      if (data?.error) {
        throw new Error(data.error);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("dash.subscription.toast_publish_error"));
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
        <h1 className="text-xl font-semibold text-foreground">{t("dash.subscription.title")}</h1>
      </div>

      {/* Usage Warnings */}
      {usageStatus?.showImageWarning && (
        <Alert variant="default" className="border-orange-500 bg-orange-50 dark:bg-orange-900/20">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-700 dark:text-orange-300">{t("dash.subscription.image_warning_title")}</AlertTitle>
          <AlertDescription className="text-orange-600 dark:text-orange-400">
            {t("dash.subscription.image_warning_prefix")}{usageStatus.imageUsagePercent}{t("dash.subscription.image_warning_suffix")}
          </AlertDescription>
        </Alert>
      )}

      {usageStatus?.imageUploadBlocked && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t("dash.subscription.image_blocked_title")}</AlertTitle>
          <AlertDescription>
            {t("dash.subscription.image_blocked_desc")}
          </AlertDescription>
        </Alert>
      )}

      {usageStatus?.showProductWarning && (
        <Alert variant="default" className="border-orange-500 bg-orange-50 dark:bg-orange-900/20">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertTitle className="text-orange-700 dark:text-orange-300">{t("dash.subscription.product_warning_title")}</AlertTitle>
          <AlertDescription className="text-orange-600 dark:text-orange-400">
            {t("dash.subscription.product_warning_prefix")}{usageStatus.productUsagePercent}{t("dash.subscription.product_warning_middle")}{usageStatus.usage?.products_count}{t("dash.subscription.product_warning_suffix")}
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
                {t("dash.subscription.basic_plan_title")}
              </CardTitle>
              {subscription && getStatusBadge(subscription.status, subscription.paid_until)}
            </div>
            <CardDescription>
              {getCurrentPlan().name} - {getCurrentPlan().label} {t("dash.subscription.monthly_plus_vat")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {subscription && (
              <>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t("dash.subscription.expiry_date_label")}
                  </span>
                  <span className="font-medium">
                    {subscription.paid_until
                      ? format(new Date(subscription.paid_until), 'dd MMMM yyyy', { locale: he })
                      : t("dash.subscription.not_set")}
                  </span>
                </div>

                {/* Anniversary billing: charged on the same day-of-month the merchant
                    joined. The first month was paid in full now; the next charge is that
                    same date next month. Shown to new merchants so the date is clear. */}
                {(subscription.billing_cycle_count ?? 0) <= 1 && (
                  <p className="text-xs text-muted-foreground -mt-1">
                    {t("dash.subscription.billing_cycle_note")}
                  </p>
                )}

                {daysRemaining !== null && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {t("dash.subscription.days_remaining_label")}
                      </span>
                      <span className={`font-bold ${isExpired ? 'text-destructive' : daysRemaining <= 7 ? 'text-orange-500' : 'text-green-600'}`}>
                        {isExpired ? t("dash.subscription.status_expired") : `${daysRemaining} ${t("dash.subscription.days_suffix")}`}
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
                    {t("dash.subscription.renew_button")}
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
              {t("dash.subscription.image_storage_title")}
            </CardTitle>
            <CardDescription>
              {currentPlan.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("dash.subscription.usage_label")}</span>
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
              <span className="font-bold text-primary">{currentPlan.label} {t("dash.subscription.monthly_plus_vat")}</span>
              <p className="text-xs text-muted-foreground">{t("dash.subscription.product_limit_prefix")}{currentPlan.productLimit}{t("dash.subscription.product_limit_suffix")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Product Add-on Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-500" />
              {t("dash.subscription.products_title")}
            </CardTitle>
            <CardDescription>
              {subscription?.product_addon_enabled ? t("dash.subscription.unlimited") : t("dash.subscription.up_to_100_products")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("dash.subscription.active_products_label")}</span>
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
                <span className="text-sm font-medium text-green-700 dark:text-green-300">{t("dash.subscription.addon_active")}</span>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full">
                {t("dash.subscription.upgrade_package_button")}
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
            {t("dash.subscription.ai_credits_title")}
          </CardTitle>
          <CardDescription>
            {t("dash.subscription.ai_credits_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-3xl font-bold">{aiCredits?.credits_remaining || 0}</span>
              <span className="text-muted-foreground mr-2">{t("dash.subscription.credits_available_label")}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!business?.id}
              onClick={() => business?.id && navigate(`/ai-credits-payment?businessId=${business.id}`)}
            >
              {t("dash.subscription.buy_credits_button")}
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
                <div className="text-xs text-muted-foreground">{t("dash.subscription.credits_word")}</div>
                <div className="text-sm font-medium text-primary mt-1">{pkg.label} <span className="text-[10px] font-normal text-muted-foreground">{t("dash.subscription.plus_vat")}</span></div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Summary */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dash.subscription.monthly_summary_title")}</CardTitle>
          <CardDescription>{t("dash.subscription.monthly_summary_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">{getCurrentPlan().name}</span>
              <span className="font-medium">{getCurrentPlan().label} <span className="text-xs font-normal text-muted-foreground">{t("dash.subscription.plus_vat")}</span></span>
            </div>
            <div className="flex items-center justify-between py-3 bg-muted/50 rounded-lg px-3">
              <span className="font-bold">{t("dash.subscription.total_per_month_label")}</span>
              <span className="font-bold text-xl text-primary">₪{calculateMonthlyTotal()} <span className="text-xs font-normal text-muted-foreground">{t("dash.subscription.plus_vat")}</span></span>
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
              {t("dash.subscription.referral_rewards_title")}
            </CardTitle>
            <CardDescription>
              {t("dash.subscription.referral_rewards_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{referralStats.totalReferred}</div>
                <div className="text-sm text-muted-foreground">{t("dash.subscription.friends_invited_label")}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-green-600">{referralStats.rewardsEarned}</div>
                <div className="text-sm text-muted-foreground">{t("dash.subscription.months_earned_label")}</div>
              </div>
            </div>

            {referralStats.rewardsEarned > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <Gift className="h-5 w-5" />
                  <span className="font-medium">
                    {t("dash.subscription.months_earned_prefix")}{referralStats.rewardsEarned}{t("dash.subscription.months_earned_suffix")}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t("dash.subscription.account_info_title")}</CardTitle>
            <CardDescription>{t("dash.subscription.account_info_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">{t("dash.subscription.email_label")}</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">{t("dash.subscription.join_date_label")}</span>
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
              {t("dash.subscription.payment_approval_title")}
            </CardTitle>
            <CardDescription>
              {t("dash.subscription.payment_approval_desc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showApprovalInput ? (
              <Button
                variant="outline"
                onClick={() => setShowApprovalInput(true)}
                className="w-full"
              >
                {t("dash.subscription.already_paid_button")}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 text-right">
                  <Label htmlFor="approvalNum">
                    {t("dash.subscription.approval_num_label")}
                  </Label>
                  <Input
                    id="approvalNum"
                    type="text"
                    placeholder={t("dash.subscription.approval_num_placeholder")}
                    value={approvalNum}
                    onChange={(e) => setApprovalNum(e.target.value)}
                    className="text-right"
                    dir="rtl"
                    disabled={publishing}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("dash.subscription.approval_num_hint")}
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
                        {t("dash.subscription.publishing_label")}
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 ml-2" />
                        {t("dash.subscription.publish_site_button")}
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
                    {t("dash.subscription.cancel_generic")}
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
              <CardTitle className="text-base">{t("dash.subscription.card_update_title")}</CardTitle>
              <button
                onClick={() => setCardUpdateUrl(null)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                {t("dash.subscription.close_button")}
              </button>
            </div>
            <CardDescription>{t("dash.subscription.card_update_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <iframe
              src={cardUpdateUrl}
              className="w-full rounded-xl border border-border"
              style={{ height: 460 }}
              title={t("dash.subscription.card_update_title")}
            />
          </CardContent>
        </Card>
      )}

      {/* Subscription Management Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dash.subscription.manage_subscription_title")}</CardTitle>
          <CardDescription>{t("dash.subscription.manage_subscription_desc")}</CardDescription>
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
                {t("dash.subscription.update_card_button")}
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
              {t("dash.subscription.add_addons_button")}
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
              {t("dash.subscription.downgrade_button")}
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
                    {t("dash.subscription.cancel_subscription_button")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("dash.subscription.cancel_dialog_title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("dash.subscription.cancel_dialog_desc1")}
                      <br /><br />
                      <strong className="text-foreground">{t("dash.subscription.cancel_dialog_note_label")}</strong> {t("dash.subscription.cancel_dialog_desc2")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  {/* Optional reason - retention insight, doesn't block cancellation.
                      Nudge (never force) the merchant to tell us why, in their words. */}
                  <div className="space-y-2 py-1">
                    <p className="text-sm text-muted-foreground">{t("dash.subscription.cancel_reason_prompt")}</p>
                    <div className="flex flex-wrap gap-2">
                      {CANCEL_REASONS.map((reason) => (
                        <button
                          key={reason.value}
                          type="button"
                          onClick={() => setCancelReason((r) => (r === reason.value ? "" : reason.value))}
                          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                            cancelReason === reason.value
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {t(`dash.subscription.cancel_reason_${reason.key}`)}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder={t("dash.subscription.cancel_reason_placeholder")}
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
                      <div className="font-medium text-foreground">{t("dash.subscription.keep_site_until_period_end_title")}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("dash.subscription.site_active_until_prefix")}{subscription.paid_until ? format(new Date(subscription.paid_until), 'dd/MM/yyyy') : t("dash.subscription.end_of_period_fallback")}{t("dash.subscription.site_active_until_suffix")}
                      </div>
                    </button>
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={() => handleCancelSubscription('immediate')}
                      className="w-full text-right p-3 rounded-xl border border-destructive/40 hover:bg-destructive/5 transition-colors disabled:opacity-50"
                    >
                      <div className="font-medium text-destructive">{t("dash.subscription.remove_site_now_title")}</div>
                      <div className="text-xs text-muted-foreground">{t("dash.subscription.remove_site_now_desc")}</div>
                    </button>
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isCancelling}>{t("dash.subscription.back_button")}</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {subscription?.status === 'cancelled' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("dash.subscription.cancelled_state_title")}</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>
                    {subscription.cancel_type === 'immediate'
                      ? t("dash.subscription.cancelled_immediate_msg")
                      : `${t("dash.subscription.cancelled_end_of_period_prefix")}${subscription.cancel_at || subscription.paid_until ? format(new Date(subscription.cancel_at || subscription.paid_until!), 'dd/MM/yyyy') : t("dash.subscription.end_of_period_fallback")}${t("dash.subscription.cancelled_end_of_period_suffix")}`}
                  </p>
                  <Button size="sm" variant="outline" onClick={handleResumeSubscription} disabled={isCancelling}>
                    {t("dash.subscription.renew_subscription_button")}
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
