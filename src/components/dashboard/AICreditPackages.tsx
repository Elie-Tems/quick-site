import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Coins, Sparkles, CreditCard, Loader2 } from "lucide-react";
import { AI_CREDIT_PACKAGES } from "@/lib/pricingConfig";
import { toast } from "@/hooks/use-toast";

interface AICreditPackagesProps {
  businessId?: string;
  currentCredits: number;
  onPurchaseComplete?: () => void;
}

const AICreditPackages = ({ businessId, currentCredits, onPurchaseComplete }: AICreditPackagesProps) => {
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const handlePurchase = async (packageId: string) => {
    if (!businessId) {
      toast({
        title: "שגיאה",
        description: "לא נמצא מזהה עסק",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedPackage(packageId);
    setIsPurchasing(true);

    // Redirect to AI credit payment page with package info
    navigate(`/ai-credits-payment?businessId=${businessId}&package=${packageId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-primary" />
          חבילות קרדיטים
        </CardTitle>
        <CardDescription>
          בחר חבילה שמתאימה לך • הקרדיטים לא פגים לעולם
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {AI_CREDIT_PACKAGES.map((pkg) => (
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
              <CardContent className="pt-6 text-center space-y-4">
                <div>
                  <h3 className="font-bold text-lg">{pkg.name}</h3>
                  <p className="text-3xl font-bold text-primary mt-2">
                    {pkg.credits}
                    <span className="text-sm font-normal text-muted-foreground mr-1">קרדיטים</span>
                  </p>
                </div>
                
                <div className="text-2xl font-bold">
                  {pkg.label}
                  <span className="text-xs font-normal text-muted-foreground block">כולל מע״מ</span>
                </div>

                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2 justify-center">
                    <Check className="h-4 w-4 text-green-500" />
                    שדרוג ויצירת {pkg.credits} תמונות
                  </li>
                  <li className="flex items-center gap-2 justify-center">
                    <Check className="h-4 w-4 text-green-500" />
                    ללא תאריך תפוגה
                  </li>
                </ul>

                <Button 
                  className="w-full" 
                  variant={pkg.recommended ? "default" : "outline"}
                  disabled={isPurchasing}
                >
                  {isPurchasing && selectedPackage === pkg.id ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 ml-2" />
                  )}
                  רכוש עכשיו
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 inline ml-1" />
            נשארו לך כרגע <strong className="text-foreground">{currentCredits}</strong> קרדיטים
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AICreditPackages;
