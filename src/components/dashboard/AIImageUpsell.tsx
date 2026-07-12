import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wand2, Coins, Check, CreditCard, Gift, Loader2 } from "lucide-react";
import { CREDIT_PACKAGES, useAICredits, useGrantFreeCredits } from "@/hooks/useAIImageEngine";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface AIImageUpsellProps {
  businessId?: string;
  onNavigateToAI?: () => void;
}

// Small card for dashboard home - soft sell
export const AIImageUpsellCard = ({ businessId, onNavigateToAI }: AIImageUpsellProps) => {
  const { data: credits, isLoading } = useAICredits(businessId);
  
  const creditsRemaining = credits?.credits_remaining ?? 0;
  const freeCreditsGranted = credits?.free_credits_granted ?? false;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Wand2 className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground mb-1">
              שדרוג תמונות מוצר עם AI ✨
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              הפוך תמונות פשוטות לצילומי סטודיו מקצועיים
            </p>
            
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                טוען...
              </div>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                {!freeCreditsGranted ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <Gift className="h-3.5 w-3.5 ml-1" />
                    10 תמונות חינם
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <Coins className="h-3.5 w-3.5 ml-1" />
                    {creditsRemaining} קרדיטים
                  </Badge>
                )}
                <Button size="sm" onClick={onNavigateToAI}>
                  {creditsRemaining > 0 || !freeCreditsGranted ? "צרו תמונות" : "רכוש קרדיטים"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Contextual suggestion after image upload
interface AIImageSuggestionProps {
  businessId?: string;
  imageUrl: string;
  onAccept: () => void;
  onDismiss: () => void;
}

export const AIImageSuggestion = ({ businessId, imageUrl, onAccept, onDismiss }: AIImageSuggestionProps) => {
  const { data: credits } = useAICredits(businessId);
  const grantFreeCredits = useGrantFreeCredits();
  const [showPackages, setShowPackages] = useState(false);
  
  const creditsRemaining = credits?.credits_remaining ?? 0;
  const freeCreditsGranted = credits?.free_credits_granted ?? false;
  const canGenerate = creditsRemaining > 0 || !freeCreditsGranted;

  const handleAccept = async () => {
    if (!freeCreditsGranted && businessId) {
      // Grant free credits first
      await grantFreeCredits.mutateAsync(businessId);
    }
    
    if (canGenerate) {
      onAccept();
    } else {
      setShowPackages(true);
    }
  };

  return (
    <>
      <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center gap-3">
          <Wand2 className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              רוצה שהתמונה תיראה כמו צילום סטודיו מקצועי?
            </p>
            <p className="text-xs text-muted-foreground">
              {!freeCreditsGranted 
                ? "10 שדרוגים חינם לניסיון ראשון" 
                : creditsRemaining > 0 
                  ? `נשארו לך ${creditsRemaining} קרדיטים`
                  : "נדרשים קרדיטים"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              לא עכשיו
            </Button>
            <Button size="sm" onClick={handleAccept}>
              {canGenerate ? "שדרגו עכשיו" : "רכוש קרדיטים"}
            </Button>
          </div>
        </div>
      </div>

      <CreditPurchaseModal 
        open={showPackages} 
        onOpenChange={setShowPackages}
        businessId={businessId}
      />
    </>
  );
};

// Credit purchase modal
interface CreditPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId?: string;
}

export const CreditPurchaseModal = ({ open, onOpenChange, businessId }: CreditPurchaseModalProps) => {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const queryClient = useQueryClient();

  const handlePurchase = async (packageId: string) => {
    if (!businessId || isPurchasing) return;

    setSelectedPackage(packageId);
    setIsPurchasing(true);

    try {
      // Charge the merchant's saved Cardcom token via the server-side charge-addon
      // engine (server decides price + credits; idempotent per requestId; credits
      // granted only after a confirmed charge). No hosted page / redirect.
      const requestId =
        (typeof crypto !== "undefined" && "randomUUID" in crypto)
          ? crypto.randomUUID()
          : `${businessId}-${packageId}-${Date.now()}`;
      const { data, error } = await supabase.functions.invoke("charge-addon", {
        body: { product: `ai_credits_${packageId}`, businessId, requestId },
      });
      if (error) throw error;

      if (data?.ok) {
        await queryClient.invalidateQueries({ queryKey: ["ai-credits", businessId] });
        toast({
          title: "התשלום בוצע ✓",
          description: "הקרדיטים נוספו לחשבונכם. חשבונית נשלחה למייל.",
        });
        onOpenChange(false);
      } else if (data?.needsCard) {
        toast({
          title: "אין כרטיס שמור",
          description: data.message || "יש לפרסם אתר (מנוי) כדי לשמור כרטיס אשראי תחילה.",
          variant: "destructive",
        });
      } else if (data?.declined) {
        toast({
          title: "החיוב נדחה",
          description: "הכרטיס נדחה. נסו כרטיס אחר או פנו לתמיכה.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "שגיאה ברכישה",
          description: data?.error || "לא הצלחנו להשלים את הרכישה. נסו שוב מאוחר יותר.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "שגיאה ברכישה",
        description: "אירעה תקלה בתקשורת. נסו שוב.",
        variant: "destructive",
      });
    } finally {
      setIsPurchasing(false);
      setSelectedPackage(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            רכוש קרדיטים לשדרוג תמונות
          </DialogTitle>
          <DialogDescription>
            בחר חבילה שמתאימה לך • הקרדיטים לא פגים לעולם
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-3 mt-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <Card 
              key={pkg.id}
              className={`relative cursor-pointer transition-all hover:shadow-md ${
                pkg.recommended 
                  ? "border-primary ring-2 ring-primary/20" 
                  : "hover:border-primary/50"
              }`}
              onClick={() => !isPurchasing && handlePurchase(pkg.id)}
            >
              {pkg.recommended && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                  מומלץ
                </Badge>
              )}
              <CardContent className="pt-6 text-center space-y-3">
                <div>
                  <h3 className="font-bold">{pkg.name}</h3>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {pkg.credits}
                    <span className="text-xs font-normal text-muted-foreground mr-1">קרדיטים</span>
                  </p>
                </div>
                
                <div className="text-xl font-bold">
                  {pkg.label}
                  <span className="text-xs font-normal text-muted-foreground block">+ מע״מ</span>
                </div>

                <ul className="text-xs text-muted-foreground space-y-1">
                  <li className="flex items-center gap-1.5 justify-center">
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    {pkg.credits} תמונות AI
                  </li>
                  <li className="flex items-center gap-1.5 justify-center">
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    ללא תאריך תפוגה
                  </li>
                </ul>

                <Button 
                  className="w-full" 
                  size="sm"
                  variant={pkg.recommended ? "default" : "outline"}
                  disabled={isPurchasing}
                >
                  {isPurchasing && selectedPackage === pkg.id ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 ml-2" />
                  )}
                  רכוש
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIImageUpsellCard;
