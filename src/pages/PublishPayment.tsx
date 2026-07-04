import { useEffect, useState, useCallback } from "react";
import { gtm } from "@/lib/gtm";
import SEOHead from "@/components/SEOHead";
import { useNavigate, useSearchParams, useLocation, Link } from "react-router-dom";
import { Loader2, CreditCard, ExternalLink, CheckCircle2, ArrowRight, RefreshCw, XCircle, Trash2, ShieldCheck, Eye, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { VAT_RATE, withVatTotal } from "@/lib/pricingConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness } from "@/hooks/useBusiness";
import { toast } from "@/hooks/use-toast";
import type { OnboardingData } from "@/pages/Onboarding";
import {
  buildIcountCheckoutUrl,
  getIcountEmbedMode,
  getPublishFeeIls,
} from "@/lib/publishPaymentConfig";

const STORAGE_KEY = "siango_publish_onboarding";

const PublishPayment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { data: myBusiness, isLoading: businessLoading } = useMyBusiness();

  const businessIdParam = searchParams.get("businessId");
  const sessionTokenParam = searchParams.get("session_token");
  const [resolvedBusinessId, setResolvedBusinessId] = useState<string | null>(null);
  const [sessionResolveFailed, setSessionResolveFailed] = useState(false);

  // Use business from URL param, or from session token, or from useMyBusiness (for unpublished businesses)
  const effectiveBusinessId = businessIdParam ?? resolvedBusinessId ?? (myBusiness && !myBusiness.is_published ? myBusiness.id : null);

  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'completed' | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [approvalNum, setApprovalNum] = useState<string>("");
  // Three-stage flow: (1) show the finished store first ("here's your store!"),
  // (2) a clear terms-of-charge confirmation, (3) the actual payment iframe.
  const [showPayment, setShowPayment] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  // Self-managed billing (iCount token) - flag-gated until tested + live.
  const selfManaged = import.meta.env.VITE_BILLING_SELF_MANAGED === "true";
  const [couponCode, setCouponCode] = useState("");
  const [couponInfo, setCouponInfo] = useState<{ discount_type: string; discount_value: number; duration: string } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [startingCheckout, setStartingCheckout] = useState(false);

  const fee = getPublishFeeIls();
  const basePaymentUrl = (import.meta.env.VITE_ICOUNT_PAYMENT_BASE_URL || "").trim();
  const embedMode = getIcountEmbedMode();

  useEffect(() => {
    const fromState = (location.state as { onboardingData?: OnboardingData } | null)?.onboardingData;
    if (fromState) {
      setOnboardingData(fromState);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromState));
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setOnboardingData(JSON.parse(raw) as OnboardingData);
    } catch {
      /* ignore */
    }
  }, [location.state]);

  const goToComplete = useCallback(
    (data: OnboardingData | null) => {
      sessionStorage.removeItem(STORAGE_KEY);
      if (data) {
        // Coming from onboarding flow
        navigate("/onboarding/complete?from_payment=true", { state: { onboardingData: data }, replace: true });
      } else {
        // Coming from dashboard
        navigate("/dashboard?from_payment=true", { replace: true });
      }
    },
    [navigate]
  );

  const ensureSession = useCallback(async () => {
    if (!user || !effectiveBusinessId) return;

    // First check for existing paid or pending sessions (not completed)
    const { data: existingSessions, error: existErr } = await supabase
      .from("publish_checkout_sessions")
      .select("session_token, status")
      .eq("business_id", effectiveBusinessId)
      .eq("user_id", user.id)
      .in("status", ["pending", "paid"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (existErr) throw existErr;

    const existing = existingSessions?.[0];
    
    if (existing?.session_token) {
      setSessionToken(existing.session_token);
      setPaymentStatus(existing.status as 'pending' | 'paid');
      if (basePaymentUrl) {
        setCheckoutUrl(buildIcountCheckoutUrl(basePaymentUrl, existing.session_token, effectiveBusinessId));
      }
      return;
    }

    // No existing session - create new one
    const token = crypto.randomUUID();
    const { error: insErr } = await supabase.from("publish_checkout_sessions").insert({
      user_id: user.id,
      business_id: effectiveBusinessId,
      session_token: token,
      status: "pending",
      amount_ils: fee,
      provider: "icount",
      // Stored so the iCount IPN can match the payment back to this session by
      // the payer's email even if iCount doesn't echo our session_token.
      email: user.email ?? null,
    });

    if (insErr) throw insErr;

    setSessionToken(token);
    if (basePaymentUrl) {
      setCheckoutUrl(buildIcountCheckoutUrl(basePaymentUrl, token, effectiveBusinessId));
    }
  }, [user, effectiveBusinessId, fee, basePaymentUrl]);

  useEffect(() => {
    if (!user || authLoading) return;
    if (!businessIdParam && sessionTokenParam) {
      (async () => {
        const { data, error } = await supabase
          .from("publish_checkout_sessions")
          .select("business_id")
          .eq("session_token", sessionTokenParam)
          .eq("user_id", user.id)
          .maybeSingle();
        if (error || !data?.business_id) {
          setSessionResolveFailed(true);
          toast({
            title: "קישור לא תקין",
            description: "לא נמצא סשן תשלום תואם. נסו מהדשבורד או מהאונבורדינג.",
            variant: "destructive",
          });
          return;
        }
        setResolvedBusinessId(data.business_id);
      })();
    }
  }, [authLoading, user, businessIdParam, sessionTokenParam]);

  useEffect(() => {
    if (authLoading || businessLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    // Allow if: has businessId param, has session token, or has unpublished business
    if (!businessIdParam && !sessionTokenParam && (!myBusiness || myBusiness.is_published)) {
      toast({ title: "חסר מזהה עסק", variant: "destructive" });
      navigate("/onboarding", { replace: true });
      return;
    }
    if (!businessIdParam && sessionTokenParam && !resolvedBusinessId && !sessionResolveFailed) {
      return;
    }
    if (sessionResolveFailed) {
      setLoading(false);
      navigate("/dashboard", { replace: true });
      return;
    }
    if (!effectiveBusinessId) return;

    (async () => {
      try {
        await ensureSession();
      } catch (e: unknown) {
        console.error(e);
        toast({
          title: "שגיאה",
          description: e instanceof Error ? e.message : "לא ניתן להכין תשלום",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [
    authLoading,
    businessLoading,
    user,
    myBusiness,
    businessIdParam,
    sessionTokenParam,
    resolvedBusinessId,
    sessionResolveFailed,
    effectiveBusinessId,
    navigate,
    ensureSession,
  ]);

  useEffect(() => {
    if (!effectiveBusinessId || !onboardingData || !sessionToken) return;

    const id = window.setInterval(async () => {
      // Check payment status
      const { data: session } = await supabase
        .from("publish_checkout_sessions")
        .select("status")
        .eq("session_token", sessionToken)
        .maybeSingle();

      if (session?.status) {
        setPaymentStatus(session.status as 'pending' | 'paid' | 'completed');
      }

      // Check if published
      const { data: b } = await supabase
        .from("businesses")
        .select("is_published")
        .eq("id", effectiveBusinessId)
        .maybeSingle();

      if (b?.is_published) {
        goToComplete(onboardingData);
      }
    }, 4000);

    return () => clearInterval(id);
  }, [effectiveBusinessId, onboardingData, sessionToken, goToComplete]);

  const handlePublish = async () => {
    if (!sessionToken && !approvalNum.trim()) return;
    setPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke("finalize-publish", {
        body: { 
          sessionToken: sessionToken || undefined,
          approvalNum: approvalNum.trim() || undefined,
          businessId: effectiveBusinessId || undefined
        },
      });
      if (error) throw error;
      if (data?.ok) {
        gtm.sitePublished();
        toast({
          title: "🎉 האתר פורסם בהצלחה!",
          description: "האתר שלך עכשיו זמין לציבור",
        });
        setTimeout(() => {
          goToComplete(onboardingData);
        }, 1500);
        return;
      }
      if (data?.legalNotApproved) {
        toast({
          title: "צריך לאשר את המסמכים המשפטיים",
          description: "כנסו ל'מסמכים משפטיים' בדשבורד, אשרו את התקנון ומדיניות הפרטיות, ואז פרסמו.",
          variant: "destructive",
        });
        return;
      }
      if (data?.pendingPayment) {
        toast({
          title: "ממתינים לאישור תשלום",
          description: "אם כבר שילמת, רגע אחד - האישור יגיע מהסליקה.",
        });
      }
    } catch (e: unknown) {
      toast({
        title: "לא ניתן לפרסם כעת",
        description: e instanceof Error ? e.message : "נסו שוב בעוד רגע",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  // Validate a subscription coupon (self-managed billing) via the anti-enumeration
  // RPC. Shows the discount; the real amount is recomputed server-side at checkout.
  const applyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    const { data } = await supabase.rpc("validate_subscription_coupon" as any, { p_code: code, p_product: "publish" } as any);
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.valid) { setCouponInfo(row); setCouponMsg("הקופון הוחל ✓"); }
    else { setCouponInfo(null); setCouponMsg("קוד קופון לא תקין"); }
  };

  // Confirm -> payment. Self-managed: create the iCount token sale (server injects
  // the discounted amount) and load its sale_url into the payment iframe. Legacy:
  // just reveal the existing checkout iframe.
  const handleConfirm = async () => {
    if (!selfManaged) { setConfirmed(true); return; }
    setStartingCheckout(true);
    try {
      const { data, error } = await supabase.functions.invoke("billing-create-checkout", {
        body: { businessId: effectiveBusinessId, couponCode: couponInfo ? couponCode.trim() : undefined },
      });
      if (error) throw error;
      if ((data as any)?.saleUrl) { setCheckoutUrl((data as any).saleUrl); setConfirmed(true); }
      else throw new Error((data as any)?.error || "לא ניתן להתחיל תשלום");
    } catch (e: unknown) {
      toast({ title: "לא ניתן להתחיל תשלום", description: e instanceof Error ? e.message : "נסו שוב", variant: "destructive" });
    } finally {
      setStartingCheckout(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Only require onboardingData if we don't have a businessId (i.e., coming from onboarding flow)
  if (!onboardingData && !effectiveBusinessId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-background">
        <p className="text-muted-foreground text-center">חסרים נתוני אונבורדינג. חזרו לשלב הפרסום.</p>
        <Button asChild variant="hero">
          <Link to="/onboarding">חזרה לאונבורדינג</Link>
        </Button>
      </div>
    );
  }

  const previewSlug = (myBusiness as any)?.slug as string | undefined;

  // ── Stage 1: show the finished store, then let them continue to payment ──
  if (!showPayment) {
    return (
      <>
        <SEOHead title="פרסום אתר | סיאנגו" noindex={true} />
        <div className="min-h-screen bg-surface-1 flex flex-col">
          <div className="w-full max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6 flex-1">
            <div className="flex items-center justify-between">
              <Button variant="ghost" asChild>
                <Link to="/dashboard" className="gap-2"><ArrowRight className="w-4 h-4" /> לדשבורד</Link>
              </Button>
              <div className="w-[90px]" />
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">החנות שלך מוכנה! 🎉</h1>
              <p className="text-muted-foreground text-lg">כך היא תיראה ללקוחות. פרסמו כדי להעלות אותה לאוויר.</p>
            </div>

            {previewSlug ? (
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xl">
                <div className="h-9 bg-muted/60 border-b border-border flex items-center gap-1.5 px-3">
                  <span className="w-3 h-3 rounded-full bg-red-400" />
                  <span className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span className="w-3 h-3 rounded-full bg-green-400" />
                  <div className="mx-auto text-xs text-muted-foreground bg-background rounded px-3 py-0.5" dir="ltr">
                    siango.app/store/{previewSlug}
                  </div>
                </div>
                {/* Open the (still-unpublished) store in a NEW TAB at top level, where
                    the owner's auth session is reliably available. An inline iframe
                    fails on mobile: browsers partition iframe storage, so the store's
                    preview-auth check can't see the session and shows "not published". */}
                <div className="flex flex-col items-center justify-center gap-4 py-14 px-6 text-center bg-gradient-to-b from-muted/20 to-transparent">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Eye className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">החנות שלכם מוכנה לתצוגה</p>
                    <p className="text-sm text-muted-foreground mt-1">לחצו לצפייה בחנות המלאה - בדיוק כפי שהלקוחות יראו אותה.</p>
                  </div>
                  <Button asChild variant="outline" size="lg" className="gap-2">
                    <a href={`/store/${previewSlug}?preview=true`} target="_blank" rel="noopener noreferrer">
                      <Eye className="w-5 h-5" /> צפו בחנות שלכם
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border p-10 text-center text-muted-foreground">
                התצוגה תיטען לאחר שמירת החנות.
              </div>
            )}

            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-3xl mx-auto w-full">
              <div className="text-center sm:text-right">
                <p className="text-lg font-bold text-foreground">פרסמו את החנות</p>
                <p className="text-sm text-muted-foreground">₪{fee}/חודש + מע"מ · ללא התחייבות, ביטול בכל עת</p>
              </div>
              <Button size="lg" variant="hero" onClick={() => setShowPayment(true)} className="gap-2 text-base px-8">
                פרסמו עכשיו
                <ArrowRight className="w-5 h-5 rotate-180" />
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Stage 2: crystal-clear terms of the recurring charge, before payment ──
  if (!confirmed) {
    const gross = withVatTotal(fee);
    const vatPct = Math.round(VAT_RATE * 100);
    // Discounted price when a coupon is applied (self-managed billing). Mirrors the
    // server-side computation; the server recomputes the real charge at checkout.
    const discNet = couponInfo
      ? (couponInfo.discount_type === "percent"
          ? Math.max(0, fee * (1 - Math.min(100, couponInfo.discount_value) / 100))
          : Math.max(0, fee - couponInfo.discount_value))
      : fee;
    const discGross = withVatTotal(discNet);
    const hasDiscount = !!couponInfo && discNet < fee;
    const terms = [
      {
        icon: RefreshCw,
        title: "מנוי חודשי מתחדש",
        body: `החיוב הוא הוראת קבע חודשית של ₪${fee} + מע"מ (סה"כ כ-₪${gross} כולל מע"מ ${vatPct}%), שמתחדשת אוטומטית בכל חודש כל עוד החנות מפורסמת.`,
      },
      {
        icon: XCircle,
        title: "ביטול בכל עת - החיוב נעצר מיד",
        body: 'אפשר לבטל בכל רגע דרך "התוכנית שלי" בדשבורד. ברגע הביטול החיוב החודשי נפסק - אין התחייבות ואין קנס.',
      },
      {
        icon: Trash2,
        title: "מחיקת החנות מבטלת את המנוי",
        body: "אם תמחקו את החנות, המנוי מתבטל אוטומטית ולא תחויבו יותר.",
      },
      {
        icon: ShieldCheck,
        title: "תשלום מאובטח דרך iCount",
        body: "הסליקה מתבצעת בעמוד המאובטח של חברת הסליקה (iCount). סיאנגו לא רואה ולא שומרת את פרטי כרטיס האשראי שלכם.",
      },
    ];
    return (
      <>
        <SEOHead title="אישור תשלום | סיאנגו" noindex={true} />
        <div className="min-h-screen bg-surface-1 flex flex-col">
          <div className="w-full max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6 flex-1">
            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={() => setShowPayment(false)} className="gap-2">
                <ArrowRight className="w-4 h-4" />
                חזרה לתצוגה
              </Button>
              <div className="w-[90px]" />
            </div>

            <div className="text-center space-y-2">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                <CreditCard className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">רגע לפני שמפרסמים</h1>
              <p className="text-muted-foreground">הנה בדיוק על מה אתם משלמים - חשוב לנו שיהיה ברור.</p>
            </div>

            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 text-center">
              <p className="text-3xl font-extrabold text-foreground">
                ₪{discGross} <span className="text-lg font-semibold text-muted-foreground">לחודש</span>
                {hasDiscount && <span className="text-lg font-semibold text-muted-foreground line-through mr-2">₪{gross}</span>}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {hasDiscount
                  ? `מבצע: ${couponInfo!.discount_type === "percent" ? `${couponInfo!.discount_value}% הנחה` : `₪${couponInfo!.discount_value} הנחה`}${couponInfo!.duration === "first_month" ? " (חודש ראשון)" : ""} · כולל מע"מ`
                  : `₪${fee} + מע"מ ${vatPct}% · חיוב חודשי מתחדש`}
              </p>
            </div>

            {selfManaged && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground"><Ticket className="w-4 h-4 text-primary" /> יש לכם קוד קופון?</div>
                <div className="flex gap-2">
                  <Input value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponMsg(""); }} placeholder="קוד קופון" dir="ltr" className="flex-1" />
                  <Button type="button" variant="outline" onClick={applyCoupon} disabled={!couponCode.trim()}>החל</Button>
                </div>
                {couponMsg && <p className={`text-xs mt-1.5 ${couponInfo ? "text-green-600" : "text-destructive"}`}>{couponMsg}</p>}
              </div>
            )}

            <div className="space-y-3">
              {terms.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                  <div className="mt-0.5 shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{title}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer select-none">
              <Checkbox
                checked={agreedTerms}
                onCheckedChange={(v) => setAgreedTerms(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-foreground">
                קראתי והבנתי - אני מאשר/ת חיוב חודשי מתחדש של ₪{gross} כולל מע"מ, שאפשר לבטל בכל עת.
              </span>
            </label>

            <Button
              size="lg"
              variant="hero"
              disabled={!agreedTerms || startingCheckout}
              onClick={handleConfirm}
              className="gap-2 text-base"
            >
              {startingCheckout ? <><Loader2 className="w-5 h-5 animate-spin" /> מכינים תשלום...</> : <>אישור - המשך לתשלום <ArrowRight className="w-5 h-5 rotate-180" /></>}
            </Button>
            <p className="text-center text-xs text-muted-foreground -mt-2">
              תעברו לעמוד הסליקה המאובטח של iCount רק אחרי האישור.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead title="פרסום אתר | סיאנגו" noindex={true} />
    <div className="min-h-screen bg-surface-1 flex flex-col">
      <div className="w-full px-4 py-8 flex flex-col gap-6 flex-1">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={() => setConfirmed(false)} className="gap-2">
              <ArrowRight className="w-4 h-4" />
              חזרה
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">תשלום לפרסום האתר</h1>
            <div className="w-[120px]"></div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <CreditCard className="w-7 h-7 text-primary" />
          </div>
          
        </div>

        {/* Centered wider iframe */}
        <div className="w-full max-w-7xl mx-auto">
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg min-h-[320px] flex flex-col">
            {!basePaymentUrl && (
              <div className="p-6 text-right text-sm">
                <p className="font-medium text-foreground mb-2">חסר קישור לעמוד סליקה</p>
                <p className="text-muted-foreground">
                  הגדירו ב־<code className="text-xs bg-muted px-1 rounded">.env</code> את{" "}
                  <code className="text-xs bg-muted px-1 rounded">VITE_ICOUNT_PAYMENT_BASE_URL</code> - כתובת עמוד
                  הסליקה מ-iCount (כולל מצב embed / onsite אם קיים אצלכם).
                </p>
              </div>
            )}
            {basePaymentUrl && checkoutUrl && (
              <>
                <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 text-sm font-medium text-foreground text-center flex items-center justify-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  תשלום מאובטח - iCount
                </div>
                <iframe
                  title="תשלום מאובטח iCount"
                  src={checkoutUrl}
                  className="w-full grow min-h-[min(80vh,800px)] border-0 bg-background"
                  allow="payment *"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-top-navigation-by-user-activation"
                />
                <div className="px-4 py-3 border-t border-border bg-muted/20 text-center">
                  <a
                    href={checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    לא נטען כאן? פתחו תשלום בחלון חדש
                  </a>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
    </>
  );
};

export default PublishPayment;
