import { useState } from "react";
import SEOHead from "@/components/SEOHead";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Loader2, CreditCard, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { AI_CREDIT_PACKAGES } from "@/lib/pricingConfig";

/**
 * Charges the merchant's saved Cardcom token via the server-side charge-addon
 * engine (server decides price + credits; idempotent per requestId; credits
 * granted only after a confirmed charge). No hosted page / iframe / redirect -
 * same engine as AIImageUpsell.tsx's CreditPurchaseModal.
 */
const AICreditPayment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const businessId = searchParams.get("businessId");
  const packageId = searchParams.get("package");

  const selectedPackage = AI_CREDIT_PACKAGES.find(pkg => pkg.id === packageId);

  const [purchasing, setPurchasing] = useState(false);
  const [done, setDone] = useState(false);

  const purchase = async () => {
    if (!businessId || !selectedPackage || purchasing) return;
    setPurchasing(true);
    try {
      const requestId =
        (typeof crypto !== "undefined" && "randomUUID" in crypto)
          ? crypto.randomUUID()
          : `${businessId}-${selectedPackage.id}-${Date.now()}`;
      const { data, error } = await supabase.functions.invoke("charge-addon", {
        body: { product: `ai_credits_${selectedPackage.id}`, businessId, requestId },
      });
      if (error) throw error;

      if (data?.ok) {
        setDone(true);
        toast({
          title: "🎉 הקרדיטים נוספו בהצלחה!",
          description: `נוספו ${selectedPackage.credits} קרדיטים לחשבון שלך`,
        });
        setTimeout(() => navigate("/dashboard?view=subscription&from_payment=true"), 2000);
      } else if (data?.needsCard) {
        toast({
          title: "אין כרטיס שמור",
          description: data.message || "יש לפרסם אתר (מנוי) כדי לשמור כרטיס אשראי תחילה.",
          variant: "destructive",
        });
      } else if (data?.declined) {
        toast({
          title: "התשלום נדחה",
          description: data.error || "הכרטיס נדחה. בדקו מול חברת האשראי.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "שגיאה ברכישה",
          description: data?.error || "לא הצלחנו להשלים את הרכישה. נסו שוב.",
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({
        title: "שגיאה",
        description: e instanceof Error ? e.message : "אירעה תקלה בתקשורת. נסו שוב.",
        variant: "destructive",
      });
    } finally {
      setPurchasing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  if (!businessId || !packageId || !selectedPackage) {
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
      <SEOHead title="רכישת קרדיטים AI | סיאנגו" noindex={true} />
      <div className="min-h-screen bg-surface-1 flex flex-col">
        <div className="w-full px-4 py-8 flex flex-col gap-6 flex-1">
          <div className="w-full max-w-2xl mx-auto">
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

          <div className="w-full max-w-2xl mx-auto">
            <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">חבילת {selectedPackage.name}</p>
                <p className="text-4xl font-bold text-foreground">
                  {selectedPackage.label} <span className="text-base font-normal text-muted-foreground">+ מע"מ</span>
                </p>
                <p className="text-sm text-muted-foreground mt-2">{selectedPackage.credits} קרדיטים AI</p>
              </div>

              {done ? (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="font-medium text-green-700 dark:text-green-400 flex items-center justify-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    הקרדיטים נוספו בהצלחה!
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    {selectedPackage.credits} קרדיטים חדשים זמינים לשימוש
                  </p>
                </div>
              ) : (
                <>
                  <Button variant="hero" size="xl" className="gap-2 w-full" onClick={purchase} disabled={purchasing}>
                    {purchasing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                    {purchasing ? "מחייב..." : `רכשו עכשיו · ${selectedPackage.label} + מע"מ`}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    החיוב מתבצע על הכרטיס השמור שלכם (מאותו כרטיס של מנוי הפרסום). חשבונית תישלח למייל.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AICreditPayment;
