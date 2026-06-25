import { useEffect, useState, useCallback } from "react";
import SEOHead from "@/components/SEOHead";
import { useNavigate, useSearchParams, useLocation, Link } from "react-router-dom";
import { Loader2, CreditCard, ExternalLink, CheckCircle2, ArrowRight } from "lucide-react";
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
        toast({
          title: "🎉 האתר פורסם בהצלחה!",
          description: "האתר שלך עכשיו זמין לציבור",
        });
        setTimeout(() => {
          goToComplete(onboardingData);
        }, 1500);
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

  return (
    <>
      <SEOHead title="פרסום אתר | סיאנגו" noindex={true} />
    <div className="min-h-screen bg-surface-1 flex flex-col">
      <div className="w-full px-4 py-8 flex flex-col gap-6 flex-1">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" asChild>
              <Link to="/dashboard" className="gap-2">
                <ArrowRight className="w-4 h-4" />
                מעבר לדשבורד
              </Link>
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
