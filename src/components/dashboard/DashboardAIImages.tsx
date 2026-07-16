import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon, ImagePlus, Coins, Gift, Download, Package, ArrowLeft } from "lucide-react";
import { useAICredits, useAIImageJobs, useGrantFreeCredits } from "@/hooks/useAIImageEngine";
import { toast } from "@/hooks/use-toast";
import AICreditPackages from "./AICreditPackages";

interface DashboardAIImagesProps {
  businessId?: string;
  onNavigateToSubscription?: () => void;
  onNavigateToProducts?: () => void;
}

// This screen is the AI-image CREDITS / PACKAGES hub. The actual image creation
// and editing lives inside each product (מוצרים), where the merchant edits name,
// description and image together - the advanced styling engine (on-model, skin
// tone, studio backgrounds) is available there via the product image studio.
const DashboardAIImages = ({ businessId, onNavigateToProducts }: DashboardAIImagesProps) => {
  const { data: credits, isLoading: creditsLoading, refetch: refetchCredits } = useAICredits(businessId);
  const { data: jobs } = useAIImageJobs(businessId);
  const grantFreeCredits = useGrantFreeCredits();

  const creditsRemaining = credits?.credits_remaining ?? 0;
  const freeCreditsGranted = credits?.free_credits_granted ?? false;

  // Grant the one-time free trial credits when the merchant first lands here.
  useEffect(() => {
    if (businessId && credits && !freeCreditsGranted) {
      grantFreeCredits.mutateAsync(businessId).then(() => refetchCredits()).catch(() => {});
    }
  }, [businessId, credits, freeCreditsGranted]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ImagePlus className="h-6 w-6 text-primary" />
            תמונות AI - קרדיטים
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">כל יצירת תמונה עולה קרדיט אחד. כאן מנהלים את היתרה ורוכשים חבילות.</p>
        </div>
        <div className="flex items-center gap-2">
          {!freeCreditsGranted && !creditsLoading && (
            <Badge variant="outline" className="border-green-500 text-green-600 gap-1">
              <Gift className="h-3 w-3" /> חינם
            </Badge>
          )}
          <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-2">
            <Coins className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm text-black dark:text-white">{creditsLoading ? "..." : creditsRemaining}</span>
            <span className="text-xs text-muted-foreground">קרדיטים</span>
          </div>
        </div>
      </div>

      {/* Credit packages */}
      <AICreditPackages businessId={businessId} currentCredits={creditsRemaining} onPurchaseComplete={() => refetchCredits()} />

      {/* After buying — go use credits in products */}
      {onNavigateToProducts && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full shrink-0">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">יש לכם קרדיטים? ממשו אותם במוצרים</h3>
              <p className="text-sm text-muted-foreground">
                נכנסים למוצר ויוצרים או משדרגים את התמונה לצד עריכת השם והתיאור.
              </p>
            </div>
            <Button onClick={onNavigateToProducts} className="gap-2 shrink-0">
              עברו למוצרים <ArrowLeft className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent generated images */}
      {jobs && jobs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-5 w-5" /> תמונות שנוצרו לאחרונה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {jobs.slice(0, 8).map((job) => (
                <div key={job.id} className="relative group rounded-xl overflow-hidden border bg-muted aspect-square">
                  <img src={job.generated_image_url || job.original_image_url} alt="Generated" className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2">
                    <Badge className={`text-xs ${
                      job.status === "completed" ? "bg-green-500 hover:bg-green-500" :
                      job.status === "processing" ? "bg-blue-500 hover:bg-blue-500" :
                      job.status === "failed" ? "bg-red-500 hover:bg-red-500" : "bg-gray-500"
                    }`}>
                      {job.status === "completed" ? "✓ הושלם" :
                        job.status === "processing" ? "⏳ מעבד" :
                        job.status === "failed" ? "✗ נכשל" : "ממתין"}
                    </Badge>
                  </div>
                  {job.status === "completed" && job.generated_image_url && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" variant="secondary" onClick={async () => {
                        try {
                          const response = await fetch(job.generated_image_url!);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url; a.download = `ai-image-${job.id}.png`;
                          document.body.appendChild(a); a.click();
                          window.URL.revokeObjectURL(url); document.body.removeChild(a);
                          toast({ title: "התמונה הורדה בהצלחה" });
                        } catch {
                          toast({ title: "שגיאה בהורדה", variant: "destructive" });
                        }
                      }}>
                        <Download className="h-4 w-4 ml-1" /> הורד
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardAIImages;
