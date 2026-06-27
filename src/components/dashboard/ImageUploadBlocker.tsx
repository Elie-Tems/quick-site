import { AlertTriangle, Image, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { PLANS } from "@/lib/pricingConfig";

interface ImageUploadBlockerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImages: number;
  imageLimit: number;
  usagePercent: number;
  onUpgrade?: () => void;
}

export const ImageUploadBlocker = ({
  open,
  onOpenChange,
  currentImages,
  imageLimit,
  usagePercent,
  onUpgrade,
}: ImageUploadBlockerProps) => {
  // Get upgrade plans (all except current/lower)
  const upgradePlans = PLANS.filter(p => p.productLimit > 50);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">מכסת התמונות מלאה</DialogTitle>
          <DialogDescription className="text-center">
            הגעת למגבלת התמונות המאוחסנות בחבילה שלך
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Usage indicator */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Image className="h-4 w-4" />
                תמונות מאוחסנות
              </span>
              <span className="font-bold text-destructive">
                {currentImages} / {imageLimit}
              </span>
            </div>
            <Progress value={usagePercent} className="h-2 [&>div]:bg-destructive" />
          </div>

          {/* Upgrade options */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-center">שדרג לחבילה גבוהה יותר:</p>
            <div className="grid gap-2">
              {upgradePlans.map((plan) => (
                <div 
                  key={plan.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    plan.highlighted ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{plan.name}</span>
                  </div>
                  <div className="text-left">
                    <span className="font-bold text-primary">{plan.label}/חודש + מע"מ</span>
                    <span className="text-xs text-muted-foreground block">עד {plan.productLimit} מוצרים</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            💡 טיפ: מחיקת תמונות שאינך משתמש בהן תפנה מקום במכסה
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button onClick={onUpgrade} className="w-full gap-2">
            שדרג חבילה
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            סגור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ImageUploadWarningProps {
  usagePercent: number;
  currentImages: number;
  imageLimit: number;
}

export const ImageUploadWarning = ({
  usagePercent,
  currentImages,
  imageLimit,
}: ImageUploadWarningProps) => {
  if (usagePercent < 80) return null;

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-sm">
      <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
      <span className="text-orange-700 dark:text-orange-300">
        {usagePercent >= 100 
          ? 'מכסת התמונות מלאה! שדרג את החבילה להמשך העלאות.'
          : `הגעת ל-${usagePercent}% ממכסת התמונות (${currentImages}/${imageLimit})`
        }
      </span>
    </div>
  );
};

interface ImageUsageMeterProps {
  currentImages: number;
  imageLimit: number;
  usagePercent: number;
}

// Always-visible image-quota meter, so the limit never comes as a surprise.
export const ImageUsageMeter = ({ currentImages, imageLimit, usagePercent }: ImageUsageMeterProps) => {
  if (!imageLimit || imageLimit === Infinity) return null;
  const full = usagePercent >= 100;
  const near = usagePercent >= 80 && !full;
  const tone = full ? "text-destructive" : near ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground";
  const bar = full ? "[&>div]:bg-destructive" : near ? "[&>div]:bg-amber-500" : "";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <Image className="h-3.5 w-3.5" />
          תמונות שהועלו
        </span>
        <span className={`font-medium ${tone}`}>{currentImages}/{imageLimit}</span>
      </div>
      <Progress value={usagePercent} className={`h-1.5 ${bar}`} />
    </div>
  );
};

export default ImageUploadBlocker;