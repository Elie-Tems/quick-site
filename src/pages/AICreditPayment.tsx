import { useEffect, useState, useCallback } from "react";
import SEOHead from "@/components/SEOHead";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Loader2, CreditCard, ExternalLink, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { AI_CREDIT_PACKAGES } from "@/lib/pricingConfig";
import { buildIcountCheckoutUrl, getIcountEmbedMode, getAICreditPaymentUrl } from "@/lib/publishPaymentConfig";

const AICreditPayment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const businessId = searchParams.get("businessId");
  const packageId = searchParams.get("package");
  
  const selectedPackage = AI_CREDIT_PACKAGES.find(pkg => pkg.id === packageId);

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'completed' | null>(null);
  const [creditsAdded, setCreditsAdded] = useState(false);

  const basePaymentUrl = packageId ? getAICreditPaymentUrl(packageId) : "";
  const embedMode = getIcountEmbedMode();

  const ensureSession = useCallback(async () => {
    if (!user || !businessId || !selectedPackage) return;

    // Check for existing pending session
    const { data: pendingSessions, error: pendErr } = await supabase
      .from("publish_checkout_sessions")
      .select("session_token, status")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .eq("amount_ils", selectedPackage.price)
      .order("created_at", { ascending: false })
      .limit(1);

    if (pendErr) throw pendErr;

    const pending = pendingSessions?.[0];
    
    if (pending?.session_token) {
      setSessionToken(pending.session_token);
      if (basePaymentUrl) {
        setCheckoutUrl(buildIcountCheckoutUrl(basePaymentUrl, pending.session_token));
      }
      return;
    }

    // Create new session for AI credits
    const token = crypto.randomUUID();
    const { error: insErr } = await supabase.from("publish_checkout_sessions").insert({
      user_id: user.id,
      business_id: businessId,
      session_token: token,
      status: "pending",
      amount_ils: selectedPackage.price,
      provider: "icount",
    });

    if (insErr) throw insErr;

    setSessionToken(token);
    if (basePaymentUrl) {
      setCheckoutUrl(buildIcountCheckoutUrl(basePaymentUrl, token));
    }
  }, [user, businessId, selectedPackage, basePaymentUrl]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!businessId || !packageId || !selectedPackage) {
      toast({ 
        title: "חסרים פרטים", 
        description: "לא נבחרה חבילה תקינה",
        variant: "destructive" 
      });
      navigate("/dashboard", { replace: true });
      return;
    }

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
  }, [authLoading, user, businessId, packageId, selectedPackage, navigate, ensureSession]);

  // Poll for payment status
  useEffect(() => {
    if (!businessId || !sessionToken || creditsAdded) return;

    const id = window.setInterval(async () => {
      const { data: session } = await supabase
        .from("publish_checkout_sessions")
        .select("status")
        .eq("session_token", sessionToken)
        .maybeSingle();

      if (session?.status) {
        setPaymentStatus(session.status as 'pending' | 'paid' | 'completed');
        
        // If paid and credits not yet added, add them
        if (session.status === 'paid' && !creditsAdded && selectedPackage) {
          handleAddCredits();
        }
      }
    }, 4000);

    return () => clearInterval(id);
  }, [businessId, sessionToken, creditsAdded, selectedPackage]);

  const handleAddCredits = async () => {
    if (!businessId || !selectedPackage || creditsAdded) return;

    try {
      const { data, error } = await supabase.rpc('add_ai_credits', {
        p_business_id: businessId,
        p_amount: selectedPackage.credits
      });

      if (error) throw error;

      setCreditsAdded(true);
      toast({
        title: "🎉 הקרדיטים נוספו בהצלחה!",
        description: `נוספו ${selectedPackage.credits} קרדיטים לחשבון שלך`,
      });

      // Update session status to completed
      await supabase
        .from("publish_checkout_sessions")
        .update({ status: "completed" })
        .eq("session_token", sessionToken);

      setTimeout(() => {
        navigate("/dashboard?view=subscription&from_payment=true");
      }, 2000);
    } catch (e: unknown) {
      console.error(e);
      toast({
        title: "שגיאה בהוספת קרדיטים",
        description: e instanceof Error ? e.message : "נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedPackage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-background">
        <p className="text-muted-foreground text-center">חבילה לא נמצאה</p>
        <Button asChild variant="hero">
          <Link to="/dashboard">חזרה לדשבורד</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <SEOHead title="AICreditPayment | סיאנגו" noindex={true} />
    <div className="min-h-screen bg-surface-1 flex flex-col">
      <div className="w-full px-4 py-8 flex flex-col gap-6 flex-1">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" asChild>
              <Link to="/dashboard?view=subscription" className="gap-2">
                <ArrowRight className="w-4 h-4" />
                חזרה לדשבורד
              </Link>
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">רכישת קרדיטים AI</h1>
            <div className="w-[120px]"></div>
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center justify-center gap-4 px-6 py-3 rounded-full bg-card border border-border">
            <span className="text-3xl font-bold text-foreground">{selectedPackage.label} <span className="text-sm font-normal text-muted-foreground">+ מע"מ</span></span>
            <div className="h-6 w-px bg-border"></div>
            <span className="text-sm font-medium text-muted-foreground">חבילת {selectedPackage.name}</span>
            <div className="h-6 w-px bg-border"></div>
            <span className="text-sm font-medium text-muted-foreground">{selectedPackage.credits} קרדיטים AI</span>
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
                  <code className="text-xs bg-muted px-1 rounded">VITE_ICOUNT_PAYMENT_BASE_URL</code>
                </p>
              </div>
            )}
            {basePaymentUrl && checkoutUrl && embedMode === "iframe" && (
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
            {basePaymentUrl && checkoutUrl && embedMode === "link" && (
              <div className="p-8 flex flex-col items-center justify-center gap-4 min-h-[280px]">
                <p className="text-sm text-muted-foreground text-center">מצב קישור חיצוני (ללא iframe)</p>
                <Button variant="hero" size="xl" className="gap-2" asChild>
                  <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-5 h-5" />
                    מעבר לתשלום מאובטח (iCount)
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom info section */}
        <div className="w-full max-w-7xl mx-auto mt-6">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-6 text-right">
            <div>
              <p className="text-sm text-muted-foreground mb-1">חבילת {selectedPackage.name}</p>
              <p className="text-3xl font-bold text-foreground">
                {selectedPackage.label}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {selectedPackage.credits} קרדיטים AI
              </p>
            </div>

            {creditsAdded && (
              <div className="space-y-3 text-sm border-t border-border pt-4">
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="font-medium text-green-700 dark:text-green-400 flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    הקרדיטים נוספו בהצלחה!
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    {selectedPackage.credits} קרדיטים חדשים זמינים לשימוש
                  </p>
                </div>
              </div>
            )}

            {paymentStatus === 'paid' && !creditsAdded && (
              <div className="space-y-3 text-sm border-t border-border pt-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    מוסיף קרדיטים לחשבון...
                  </p>
                </div>
              </div>
            )}

            {paymentStatus !== 'paid' && !creditsAdded && (
              <div className="space-y-3 text-sm text-muted-foreground border-t border-border pt-4">
                <p className="font-medium text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  אחרי התשלום יש לרענן את עמוד הדשבורד
                </p>
                <ul className="space-y-2 list-disc list-inside text-balance">
                  <li>המערכת תזהה אוטומטית את התשלום</li>
                  <li>הקרדיטים יתווספו לחשבון שלך מיד</li>
                  <li>תוכל להשתמש בהם לשדרוג תמונות</li>
                </ul>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default AICreditPayment;
