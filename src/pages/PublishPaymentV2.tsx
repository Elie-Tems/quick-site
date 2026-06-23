import { useEffect, useState, useCallback } from "react";
import SEOHead from "@/components/SEOHead";
import { useNavigate, useSearchParams, useLocation, Link } from "react-router-dom";
import { Loader2, CreditCard, CheckCircle2, ArrowRight, Shield, Lock, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness } from "@/hooks/useBusiness";
import { toast } from "@/hooks/use-toast";
import type { OnboardingData } from "@/pages/Onboarding";
import {
  buildIcountCheckoutUrl,
  getPublishFeeIls,
} from "@/lib/publishPaymentConfig";
import logoDarkBg from "@/assets/logo-dark-bg.png";

const STORAGE_KEY = "siango_publish_onboarding";

const PublishPaymentV2 = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { data: myBusiness, isLoading: businessLoading } = useMyBusiness();

  const businessIdParam = searchParams.get("businessId");
  const sessionTokenParam = searchParams.get("session_token");
  const [resolvedBusinessId, setResolvedBusinessId] = useState<string | null>(null);
  const [sessionResolveFailed, setSessionResolveFailed] = useState(false);

  const effectiveBusinessId = businessIdParam ?? resolvedBusinessId ?? (myBusiness && !myBusiness.is_published ? myBusiness.id : null);

  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'completed' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Payment form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fee = getPublishFeeIls();
  const basePaymentUrl = (import.meta.env.VITE_ICOUNT_PAYMENT_BASE_URL || "").trim();

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
        navigate("/onboarding/complete?from_payment=true", { state: { onboardingData: data }, replace: true });
      } else {
        navigate("/dashboard?from_payment=true", { replace: true });
      }
    },
    [navigate]
  );

  const ensureSession = useCallback(async () => {
    if (!user || !effectiveBusinessId) return;

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

    const token = crypto.randomUUID();
    const { error: insErr } = await supabase.from("publish_checkout_sessions").insert({
      user_id: user.id,
      business_id: effectiveBusinessId,
      session_token: token,
      status: "pending",
      amount_ils: fee,
      provider: "icount",
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
            description: "לא נמצא סשן תשלום תואם.",
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
      const { data: session } = await supabase
        .from("publish_checkout_sessions")
        .select("status")
        .eq("session_token", sessionToken)
        .maybeSingle();

      if (session?.status) {
        setPaymentStatus(session.status as 'pending' | 'paid' | 'completed');
      }

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

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.slice(0, 19); // 16 digits + 3 spaces
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    const cleanCard = cardNumber.replace(/\s/g, '');
    if (!cleanCard) {
      errors.cardNumber = "מספר כרטיס הוא שדה חובה";
    } else if (cleanCard.length < 15 || cleanCard.length > 16) {
      errors.cardNumber = "מספר כרטיס לא תקין";
    }

    if (!cardName.trim()) {
      errors.cardName = "שם בעל הכרטיס הוא שדה חובה";
    } else if (cardName.trim().length < 2) {
      errors.cardName = "שם לא תקין";
    }

    if (!expiryMonth || !expiryYear) {
      errors.expiry = "תוקף הכרטיס הוא שדה חובה";
    } else {
      const month = parseInt(expiryMonth);
      const year = parseInt(expiryYear);
      const now = new Date();
      const currentYear = now.getFullYear() % 100;
      const currentMonth = now.getMonth() + 1;
      
      if (month < 1 || month > 12) {
        errors.expiry = "חודש לא תקין";
      } else if (year < currentYear || (year === currentYear && month < currentMonth)) {
        errors.expiry = "הכרטיס פג תוקף";
      }
    }

    if (!cvv) {
      errors.cvv = "CVV הוא שדה חובה";
    } else if (cvv.length < 3 || cvv.length > 4) {
      errors.cvv = "CVV לא תקין";
    }

    if (!idNumber) {
      errors.idNumber = "תעודת זהות היא שדה חובה";
    } else if (idNumber.length !== 9) {
      errors.idNumber = "מספר תעודת זהות לא תקין";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "שגיאה בטופס",
        description: "אנא תקן את השגיאות בטופס",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      // TODO: Integrate with iCount payment API
      // For now, simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update session status to paid
      if (sessionToken) {
        await supabase
          .from("publish_checkout_sessions")
          .update({ status: "paid" })
          .eq("session_token", sessionToken);
        
        setPaymentStatus("paid");
        
        toast({
          title: "התשלום בוצע בהצלחה! 🎉",
          description: "האתר שלך מתפרסם כעת...",
        });

        // Call finalize-publish
        const { data, error } = await supabase.functions.invoke("finalize-publish", {
          body: { 
            sessionToken,
            businessId: effectiveBusinessId
          },
        });

        if (error) throw error;
        
        if (data?.ok) {
          setTimeout(() => {
            goToComplete(onboardingData);
          }, 1500);
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "שגיאה בתשלום",
        description: "לא הצלחנו לעבד את התשלום. אנא נסה שוב.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!onboardingData && !effectiveBusinessId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <p className="text-muted-foreground text-center">חסרים נתוני אונבורדינג. חזרו לשלב הפרסום.</p>
        <Button asChild variant="hero">
          <Link to="/onboarding">חזרה לאונבורדינג</Link>
        </Button>
      </div>
    );
  }

  return (
      <SEOHead title="PublishPaymentV2 | סיאנגו" noindex={true} />
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoDarkBg} alt="Siango" className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4 text-green-500" />
            <span>תשלום מאובטח</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">
          {/* Left Side - Payment Info */}
          <div className="space-y-6">
            {/* Hero Section */}
            <div className="text-center lg:text-right space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Sparkles className="w-4 h-4" />
                <span>צעד אחרון לפני ההשקה! 🚀</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                הפעל את האתר שלך עכשיו
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0">
                האתר שלך מוכן ומחכה! השלם את התשלום והאתר יעלה לאוויר תוך דקות.
              </p>
            </div>

            {/* Features */}
            <div className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-6 space-y-4">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                מה כלול במנוי?
              </h2>
              <div className="grid gap-3">
                {[
                  { icon: CheckCircle2, text: "אתר מקצועי ומהיר" },
                  { icon: CheckCircle2, text: "כתובת ייחודית באינטרנט" },
                  { icon: CheckCircle2, text: "עדכונים ושינויים ללא הגבלה" },
                  { icon: CheckCircle2, text: "תמיכה טכנית מלאה" },
                  { icon: CheckCircle2, text: "גיבוי אוטומטי של כל התוכן" },
                  { icon: CheckCircle2, text: "ניתן לביטול בכל עת" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-foreground">
                    <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-green-500" />
                    </div>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center justify-center lg:justify-start gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>תשלום מאובטח SSL</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>מוגן ע"י iCount</span>
              </div>
            </div>
          </div>

          {/* Right Side - Payment Card */}
          <div className="lg:sticky lg:top-8">
            <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
              {/* Card Header */}
              <div className="bg-gradient-to-br from-primary via-primary/90 to-accent p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <CreditCard className="w-8 h-8 opacity-80" />
                  <span className="text-sm opacity-80">מנוי חודשי</span>
                </div>
                <div className="space-y-1">
                  <p className="text-5xl font-bold">₪{fee}</p>
                  <p className="text-sm opacity-90">לחודש • ניתן לביטול בכל עת</p>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 space-y-6">
                {paymentStatus === 'paid' && (
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-semibold text-green-700 dark:text-green-400">
                          התשלום אושר בהצלחה!
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-500">
                          האתר שלך מתפרסם כעת...
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handlePayment} className="space-y-4">
                  {/* Card Number */}
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber" className="text-sm font-medium">
                      מספר כרטיס אשראי
                    </Label>
                    <Input
                      id="cardNumber"
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      className="text-left"
                      dir="ltr"
                      maxLength={19}
                    />
                    {formErrors.cardNumber && (
                      <p className="text-xs text-destructive">{formErrors.cardNumber}</p>
                    )}
                  </div>

                  {/* Cardholder Name */}
                  <div className="space-y-2">
                    <Label htmlFor="cardName" className="text-sm font-medium">
                      שם בעל הכרטיס
                    </Label>
                    <Input
                      id="cardName"
                      type="text"
                      placeholder="ישראל ישראלי"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="text-right"
                      dir="rtl"
                    />
                    {formErrors.cardName && (
                      <p className="text-xs text-destructive">{formErrors.cardName}</p>
                    )}
                  </div>

                  {/* Expiry and CVV */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">תוקף</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="MM"
                          value={expiryMonth}
                          onChange={(e) => setExpiryMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                          className="text-center"
                          maxLength={2}
                        />
                        <span className="flex items-center text-muted-foreground">/</span>
                        <Input
                          type="text"
                          placeholder="YY"
                          value={expiryYear}
                          onChange={(e) => setExpiryYear(e.target.value.replace(/\D/g, '').slice(0, 2))}
                          className="text-center"
                          maxLength={2}
                        />
                      </div>
                      {formErrors.expiry && (
                        <p className="text-xs text-destructive">{formErrors.expiry}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cvv" className="text-sm font-medium">
                        CVV
                      </Label>
                      <Input
                        id="cvv"
                        type="text"
                        placeholder="123"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="text-center"
                        maxLength={4}
                      />
                      {formErrors.cvv && (
                        <p className="text-xs text-destructive">{formErrors.cvv}</p>
                      )}
                    </div>
                  </div>

                  {/* ID Number */}
                  <div className="space-y-2">
                    <Label htmlFor="idNumber" className="text-sm font-medium">
                      תעודת זהות
                    </Label>
                    <Input
                      id="idNumber"
                      type="text"
                      placeholder="123456789"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      className="text-left"
                      dir="ltr"
                      maxLength={9}
                    />
                    {formErrors.idNumber && (
                      <p className="text-xs text-destructive">{formErrors.idNumber}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="hero"
                    size="lg"
                    className="w-full text-lg h-14 mt-6"
                    disabled={isProcessing || paymentStatus === 'paid'}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        מעבד תשלום...
                      </>
                    ) : paymentStatus === 'paid' ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        מפרסם את האתר...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        שלם ₪{fee} והפעל את האתר
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    🔒 תשלום מאובטח ומוצפן
                  </p>
                </form>

                <div className="pt-4 border-t border-border">
                  <Button variant="ghost" className="w-full" asChild>
                    <Link to="/onboarding" className="gap-2">
                      <ArrowRight className="w-4 h-4" />
                      חזרה לעריכת האתר
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Money Back Guarantee */}
            <div className="mt-6 text-center p-4 rounded-xl bg-muted/50">
              <p className="text-sm font-medium text-foreground mb-1">
                💯 ערבות להחזר כספי
              </p>
              <p className="text-xs text-muted-foreground">
                לא מרוצה? ביטול והחזר כספי מלא תוך 14 יום
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublishPaymentV2;
