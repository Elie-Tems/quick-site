import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Upload, Image as ImageIcon, Loader2, Coins, Check, ChevronRight, Gift, Download, Shirt, Package, Wand2 } from "lucide-react";
import { useAICredits, useAIImageJobs, useGenerateStyledImage, useGrantFreeCredits } from "@/hooks/useAIImageEngine";
import { useProducts } from "@/hooks/useProducts";
import { useBusinessUsage } from "@/hooks/useBusinessUsage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AICreditPackages from "./AICreditPackages";
import { ImageUploadBlocker, ImageUploadWarning } from "./ImageUploadBlocker";

interface DashboardAIImagesProps {
  businessId?: string;
  onNavigateToSubscription?: () => void;
}

type ProductType = "fashion" | "general";
type StyleMode = "preset" | "custom";

interface StyleOption {
  id: string;
  label: string;
  description: string;
  emoji: string;
}

const FASHION_STYLES: StyleOption[] = [
  { id: "female_model", label: "על דוגמנית", description: "המוצר מוצג על דוגמנית נשית", emoji: "👩" },
  { id: "male_model", label: "על דוגמן", description: "המוצר מוצג על דוגמן גברי", emoji: "👨" },
  { id: "mannequin", label: "על מנקן", description: "אפקט מנקן בלתי נראה", emoji: "🪆" },
  { id: "studio_flat", label: "סטודיו שטוח", description: "צילום שטוח על רקע נקי", emoji: "📐" },
];

const SKIN_TONE_OPTIONS = [
  { id: "light", label: "בהיר" },
  { id: "medium", label: "בינוני" },
  { id: "olive", label: "זית" },
  { id: "tan", label: "שזוף" },
  { id: "dark", label: "כהה" },
];

const GENERAL_STYLES: StyleOption[] = [
  { id: "white_studio", label: "רקע לבן סטודיו", description: "תאורת סטודיו מקצועית", emoji: "💡" },
  { id: "solid_white", label: "רקע לבן", description: "מינימלי ונקי", emoji: "⬜" },
  { id: "solid_blue", label: "רקע כחול", description: "מודרני ורענן", emoji: "🟦" },
  { id: "solid_gray", label: "רקע אפור", description: "ניטרלי ומאוזן", emoji: "◻️" },
  { id: "solid_black", label: "רקע שחור", description: "דרמטי ויוקרתי", emoji: "⬛" },
  { id: "environment", label: "סביבה טבעית", description: "לייפסטייל אותנטי", emoji: "🌿" },
];

const PROMPT_EXAMPLES = [
  "מוצר על שולחן עץ עם תאורה רכה",
  "רקע ים וחוף עם אווירה קיצית",
  "סטודיו מינימלי עם צלליות דרמטיות",
  "מוצר בסביבה יוקרתית עם שיש לבן",
];

const STEPS = [
  { key: "select", num: 1, label: "בחר מוצר" },
  { key: "upload", num: 2, label: "העלה תמונה" },
  { key: "style", num: 3, label: "בחר סגנון" },
  { key: "generate", num: 4, label: "צור תמונה" },
];

const DashboardAIImages = ({ businessId, onNavigateToSubscription }: DashboardAIImagesProps) => {
  const [step, setStep] = useState<"select" | "upload" | "style" | "generate">("select");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [productType, setProductType] = useState<ProductType>("general");
  const [styleMode, setStyleMode] = useState<StyleMode>("preset");
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [selectedSkinTone, setSelectedSkinTone] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [showBlockerDialog, setShowBlockerDialog] = useState(false);

  const { data: usageStatus } = useBusinessUsage(businessId);
  const { data: credits, isLoading: creditsLoading, refetch: refetchCredits } = useAICredits(businessId);
  const { data: jobs } = useAIImageJobs(businessId);
  const { data: products } = useProducts(businessId);
  const generateImage = useGenerateStyledImage();
  const grantFreeCredits = useGrantFreeCredits();

  const selectedProduct = products?.find(p => p.id === selectedProductId);
  const styleOptions = productType === "fashion" ? FASHION_STYLES : GENERAL_STYLES;
  const creditsRemaining = credits?.credits_remaining ?? 0;
  const hasCredits = creditsRemaining > 0;
  const freeCreditsGranted = credits?.free_credits_granted ?? false;
  const currentStepIndex = STEPS.findIndex(s => s.key === step);

  const canProceedFromStyle =
    styleMode === "preset" ? !!selectedStyle : customPrompt.trim().length >= 10;

  const tryGrantFreeCredits = async () => {
    if (!businessId || freeCreditsGranted) return;
    const result = await grantFreeCredits.mutateAsync(businessId);
    if (result) await refetchCredits();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    if (usageStatus?.imageUploadBlocked) { setShowBlockerDialog(true); return; }
    setIsUploading(true);
    try {
      if (!freeCreditsGranted) await tryGrantFreeCredits();
      const fileName = `ai-originals/${businessId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("business-assets").upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from("business-assets").getPublicUrl(fileName);
      setUploadedImageUrl(publicUrlData.publicUrl);
      setStep("style");
    } catch {
      toast({ title: "שגיאה בהעלאת התמונה", description: "נסה שוב", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!businessId || !uploadedImageUrl) return;
    // If custom prompt mode, pass a special style type + the prompt
    const styleType = styleMode === "custom" ? "custom_prompt" : (
      productType === "fashion" && (selectedStyle === "female_model" || selectedStyle === "male_model") && selectedSkinTone
        ? `${selectedStyle}:${selectedSkinTone}`
        : selectedStyle
    );
    await generateImage.mutateAsync({
      businessId,
      productId: selectedProductId || undefined,
      productName: selectedProduct?.name || "מוצר",
      productType,
      styleType,
      originalImageUrl: uploadedImageUrl,
      customPrompt: styleMode === "custom" ? customPrompt : undefined,
    });
    setStep("select"); setSelectedProductId(""); setUploadedImageUrl("");
    setSelectedStyle(""); setSelectedSkinTone(""); setCustomPrompt(""); setStyleMode("preset");
  };

  // Summary label for the generate step
  const styleSummaryLabel = styleMode === "custom"
    ? `פרומפט מותאם אישית`
    : styleOptions.find(s => s.id === selectedStyle)?.label || "";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto" dir="rtl">
      <ImageUploadBlocker
        open={showBlockerDialog}
        onOpenChange={setShowBlockerDialog}
        currentImages={usageStatus?.usage?.stored_images_count || 0}
        imageLimit={usageStatus?.imageLimit || 10}
        usagePercent={usageStatus?.imageUsagePercent || 0}
        onUpgrade={() => { setShowBlockerDialog(false); onNavigateToSubscription?.(); }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            תמונות AI
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">שדרג תמונות מוצר בלחיצה אחת</p>
        </div>
          <div className="flex items-center gap-2">
          {!freeCreditsGranted && !creditsLoading && (
            <Badge variant="outline" className="border-green-500 text-green-600 gap-1">
              <Gift className="h-3 w-3" />
              10 חינם
            </Badge>
          )}
          <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-2">
            <Coins className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm text-black dark:text-white">
              {creditsLoading ? "..." : creditsRemaining}
            </span>
            <span className="text-xs text-muted-foreground">קרדיטים</span>
          </div>
        </div>
      </div>

      {/* No credits state */}
      {!hasCredits && !creditsLoading && freeCreditsGranted && (
        <div className="space-y-4">
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
            <CardContent className="py-4 flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-800 rounded-full">
                <Coins className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-orange-700 dark:text-orange-300">נגמרו הקרדיטים</h3>
                <p className="text-sm text-orange-600 dark:text-orange-400">רכוש קרדיטים כדי להמשיך ליצור תמונות</p>
              </div>
            </CardContent>
          </Card>
          <AICreditPackages businessId={businessId} currentCredits={creditsRemaining} onPurchaseComplete={() => refetchCredits()} />
        </div>
      )}

      {/* Main Flow */}
      {(hasCredits || !freeCreditsGranted) && (
        <Card>
          <CardContent className="pt-6 space-y-6">

            {/* Progress Steps */}
            <div className="flex items-center gap-0">
              {STEPS.map((s, i) => {
                const isCompleted = i < currentStepIndex;
                const isCurrent = i === currentStepIndex;
                return (
                  <div key={s.key} className="flex items-center flex-1 last:flex-none">
                    <div className={`flex items-center gap-2 ${isCurrent ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                        isCurrent ? "border-primary bg-primary text-primary-foreground" :
                        isCompleted ? "border-green-500 bg-green-500 text-white" :
                        "border-muted-foreground/30 bg-muted"
                      }`}>
                        {isCompleted ? <Check className="h-4 w-4" /> : s.num}
                      </div>
                      <span className={`text-xs font-medium hidden sm:block ${isCurrent ? "text-primary" : isCompleted ? "text-green-600" : "text-muted-foreground"}`}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 rounded ${i < currentStepIndex ? "bg-green-500" : "bg-muted"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Step 1: Select Product */}
            {step === "select" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-base font-semibold">מוצר מהקטלוג <span className="text-muted-foreground font-normal text-sm">(אופציונלי)</span></Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר מוצר..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map(product => (
                        <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">אפשר גם ליצור תמונה בלי לקשר למוצר ספציפי</p>
                </div>

                <div className="space-y-3">
                  <Label className="text-base font-semibold">סוג המוצר</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "general", label: "מוצר כללי", desc: "אלקטרוניקה, אביזרים, מזון...", Icon: Package },
                      { value: "fashion", label: "אופנה / ביגוד", desc: "חולצות, מכנסיים, שמלות...", Icon: Shirt },
                    ].map(({ value, label, desc, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setProductType(value as ProductType)}
                        className={`p-4 rounded-xl border-2 text-right transition-all ${
                          productType === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`h-5 w-5 ${productType === value ? "text-primary" : "text-muted-foreground"}`} />
                          <span className="font-semibold text-sm">{label}</span>
                          {productType === value && <Check className="h-4 w-4 text-primary mr-auto" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={() => setStep("upload")} className="w-full" size="lg">
                  המשך — העלאת תמונה
                  <ChevronRight className="h-4 w-4 mr-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Upload Image */}
            {step === "upload" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold">העלה תמונת מוצר מקורית</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">AI ישדרג אותה לפי הסגנון שתבחר בשלב הבא</p>
                </div>

                <ImageUploadWarning
                  usagePercent={usageStatus?.imageUsagePercent || 0}
                  currentImages={usageStatus?.usage?.stored_images_count || 0}
                  imageLimit={usageStatus?.imageLimit || 50}
                />

                <div
                  className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
                    usageStatus?.imageUploadBlocked
                      ? "border-destructive/40 bg-destructive/5 cursor-not-allowed"
                      : "border-muted-foreground/25 hover:border-primary hover:bg-primary/5 cursor-pointer"
                  }`}
                  onClick={() => {
                    if (usageStatus?.imageUploadBlocked) setShowBlockerDialog(true);
                    else document.getElementById("image-upload")?.click();
                  }}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <p className="font-medium">מעלה תמונה...</p>
                    </div>
                  ) : usageStatus?.imageUploadBlocked ? (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-12 w-12 text-destructive/40" />
                      <p className="font-semibold text-destructive">מכסת התמונות מלאה</p>
                      <p className="text-sm text-muted-foreground">לחץ כאן לשדרוג החבילה</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-1">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                      <p className="font-semibold text-base">לחץ לבחירת תמונה</p>
                      <p className="text-sm text-muted-foreground">PNG, JPG — עד 10MB</p>
                    </div>
                  )}
                  <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading || usageStatus?.imageUploadBlocked} />
                </div>

                <Button variant="outline" onClick={() => setStep("select")} className="w-full">
                  ← חזור לבחירת מוצר
                </Button>
              </div>
            )}

            {/* Step 3: Choose Style */}
            {step === "style" && (
              <div className="space-y-5">
                {uploadedImageUrl && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <img src={uploadedImageUrl} alt="Uploaded" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-1.5 text-green-700 dark:text-green-300">
                        <Check className="h-4 w-4" />
                        <span className="font-semibold text-sm">תמונה הועלתה בהצלחה</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{selectedProduct?.name || "ללא מוצר מקושר"}</p>
                    </div>
                  </div>
                )}

                {/* Mode Toggle */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
                  <button
                    type="button"
                    onClick={() => setStyleMode("preset")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                      styleMode === "preset"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <ImageIcon className="h-4 w-4" />
                    סגנונות מוכנים
                  </button>
                  <button
                    type="button"
                    onClick={() => setStyleMode("custom")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                      styleMode === "custom"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Wand2 className="h-4 w-4" />
                    פרומפט חופשי
                  </button>
                </div>

                {/* Preset Styles */}
                {styleMode === "preset" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {styleOptions.map(style => (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => {
                            setSelectedStyle(style.id);
                            if (style.id !== "female_model" && style.id !== "male_model") setSelectedSkinTone("");
                          }}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-right transition-all ${
                            selectedStyle === style.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <span className="text-2xl flex-shrink-0">{style.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{style.label}</p>
                            <p className="text-xs text-muted-foreground truncate">{style.description}</p>
                          </div>
                          {selectedStyle === style.id && <Check className="h-5 w-5 text-primary flex-shrink-0" />}
                        </button>
                      ))}
                    </div>

                    {productType === "fashion" && (selectedStyle === "female_model" || selectedStyle === "male_model") && (
                      <div className="space-y-2 p-4 bg-muted/40 rounded-xl">
                        <Label className="text-sm font-semibold">גוון עור <span className="text-muted-foreground font-normal">(אופציונלי)</span></Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {SKIN_TONE_OPTIONS.map(tone => (
                            <Button key={tone.id} type="button" variant={selectedSkinTone === tone.id ? "default" : "outline"} size="sm"
                              onClick={() => setSelectedSkinTone(selectedSkinTone === tone.id ? "" : tone.id)}>
                              {tone.label}
                            </Button>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">אם לא תבחר, המערכת תבחר אוטומטית</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Prompt */}
                {styleMode === "custom" && (
                  <div className="space-y-3">
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
                      <div className="flex items-start gap-2">
                        <Wand2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm">תאר בחופשיות איך תרצה את התמונה</p>
                          <p className="text-xs text-muted-foreground mt-0.5">כתוב כל פרט — רקע, תאורה, אווירה, סביבה</p>
                        </div>
                      </div>
                      <Textarea
                        value={customPrompt}
                        onChange={e => setCustomPrompt(e.target.value)}
                        placeholder="לדוגמה: מוצר על משטח שיש לבן עם תאורה רכה מהצד, אווירה יוקרתית ומינימלית..."
                        className="min-h-[100px] resize-none text-sm bg-background"
                        maxLength={500}
                      />
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${customPrompt.length < 10 ? "text-muted-foreground" : "text-green-600"}`}>
                          {customPrompt.length < 10 ? `עוד ${10 - customPrompt.length} תווים לפחות` : `✓ ${customPrompt.length}/500`}
                        </span>
                      </div>
                    </div>

                    {/* Example prompts */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">דוגמאות לפרומפטים:</p>
                      <div className="flex flex-wrap gap-2">
                        {PROMPT_EXAMPLES.map((example) => (
                          <button
                            key={example}
                            type="button"
                            onClick={() => setCustomPrompt(example)}
                            className="text-xs px-3 py-1.5 rounded-full border border-dashed border-muted-foreground/40 hover:border-primary hover:text-primary transition-colors text-muted-foreground"
                          >
                            {example}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep("upload")} className="flex-shrink-0">← חזור</Button>
                  <Button onClick={() => setStep("generate")} disabled={!canProceedFromStyle} className="flex-1" size="lg">
                    המשך לסיכום
                    <ChevronRight className="h-4 w-4 mr-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Generate */}
            {step === "generate" && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-semibold">סיכום לפני יצירה</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">וודא שהכל נכון לפני שמתחילים</p>
                </div>

                <div className="rounded-xl border overflow-hidden">
                  <div className="grid grid-cols-2 divide-x divide-x-reverse divide-border">
                    {[
                      { label: "מוצר", value: selectedProduct?.name || "ללא מוצר מקושר" },
                      { label: "סוג", value: productType === "fashion" ? "אופנה / ביגוד" : "מוצר כללי" },
                      { label: "סגנון", value: styleSummaryLabel },
                      { label: "עלות", value: "1 קרדיט" },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-4 bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className="font-semibold text-sm">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Custom prompt preview */}
                  {styleMode === "custom" && customPrompt && (
                    <div className="p-4 border-t bg-primary/5">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                        <Wand2 className="h-3 w-3" /> הפרומפט שלך
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">"{customPrompt}"</p>
                    </div>
                  )}

                  {uploadedImageUrl && (
                    <div className="p-4 border-t flex items-center gap-3">
                      <img src={uploadedImageUrl} alt="Preview" className="w-14 h-14 object-cover rounded-lg" />
                      <div>
                        <p className="text-xs text-muted-foreground">תמונה מקורית</p>
                        <p className="text-sm font-medium">מוכן לעיבוד AI</p>
                      </div>
                      <div className="mr-auto text-2xl">
                        {styleMode === "custom" ? "✨" : styleOptions.find(s => s.id === selectedStyle)?.emoji}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep("style")} className="flex-shrink-0">← חזור</Button>
                  <Button onClick={handleGenerate} disabled={generateImage.isPending} className="flex-1" size="lg">
                    {generateImage.isPending ? (
                      <><Loader2 className="h-4 w-4 ml-2 animate-spin" />יוצר תמונה...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 ml-2" />צור תמונה עכשיו — 1 קרדיט</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Jobs */}
      {jobs && jobs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-5 w-5" />
              תמונות שנוצרו לאחרונה
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {jobs.slice(0, 8).map(job => (
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
                        <Download className="h-4 w-4 ml-1" />
                        הורד
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {hasCredits && (
        <AICreditPackages businessId={businessId} currentCredits={creditsRemaining} onPurchaseComplete={() => refetchCredits()} />
      )}
    </div>
  );
};

export default DashboardAIImages;