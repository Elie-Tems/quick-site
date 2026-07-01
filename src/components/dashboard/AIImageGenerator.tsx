import { useState, useEffect } from "react";
import { Loader2, Wand2, Upload, Image as ImageIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAICredits, useGenerateStyledImage, useGrantFreeCredits } from "@/hooks/useAIImageEngine";
import {
  FASHION_STYLES, GENERAL_STYLES, SKIN_TONE_OPTIONS, PROMPT_EXAMPLES, type ProductType,
} from "@/lib/aiImageStyles";

interface AIImageGeneratorProps {
  businessId: string;
  onImageGenerated: (imageUrl: string) => void;
  productName?: string;
  productDescription?: string;
  productId?: string;
  /** The product's current image, if any - used as the base for the styling engine. */
  currentImageUrl?: string;
}

type Mode = "text" | "styled";

export const AIImageGenerator = ({
  businessId,
  onImageGenerated,
  productName = "",
  productDescription = "",
  productId,
  currentImageUrl,
}: AIImageGeneratorProps) => {
  const [mode, setMode] = useState<Mode>("text");
  const { data: credits } = useAICredits(businessId);
  const creditsRemaining = credits?.credits_remaining ?? 0;
  const grantFree = useGrantFreeCredits();

  // Grant the one-time free trial credits so generating works out of the box.
  useEffect(() => {
    if (businessId && credits && !credits.free_credits_granted) {
      grantFree.mutateAsync(businessId).catch(() => {});
    }
  }, [businessId, credits]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Text mode ──
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // ── Styled mode ──
  const generateStyled = useGenerateStyledImage();
  const [productType, setProductType] = useState<ProductType>("general");
  const [styleMode, setStyleMode] = useState<"preset" | "custom">("preset");
  const [selectedStyle, setSelectedStyle] = useState("");
  const [selectedSkinTone, setSelectedSkinTone] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [originalUrl, setOriginalUrl] = useState<string>(currentImageUrl || "");
  const [isUploading, setIsUploading] = useState(false);

  const styleOptions = productType === "fashion" ? FASHION_STYLES : GENERAL_STYLES;

  const handleGenerateText = async () => {
    if (!prompt.trim()) { toast.error("נא להזין תיאור לתמונה"); return; }
    if (creditsRemaining < 1) { toast.error("אין לך מספיק קרדיטים. רכוש קרדיטים נוספים."); return; }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-product-image", {
        body: { productName: productName || "מוצר", productDescription: productDescription || "", businessId, customPrompt: prompt },
      });
      if (error) throw error;
      if (data?.imageUrl) {
        onImageGenerated(data.imageUrl);
        toast.success("התמונה נוצרה בהצלחה!");
        setPrompt("");
      } else throw new Error("לא התקבלה תמונה מהשרת");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה ביצירת התמונה");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadOriginal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    setIsUploading(true);
    try {
      const fileName = `ai-originals/${businessId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("business-assets").upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("business-assets").getPublicUrl(fileName);
      setOriginalUrl(data.publicUrl);
    } catch {
      toast.error("שגיאה בהעלאת התמונה");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const canGenerateStyled =
    !!originalUrl && (styleMode === "preset" ? !!selectedStyle : customPrompt.trim().length >= 10);

  const handleGenerateStyled = async () => {
    if (!originalUrl) { toast.error("צריך תמונת מקור - השתמש בתמונת המוצר או העלה אחת"); return; }
    if (creditsRemaining < 1) { toast.error("אין לך מספיק קרדיטים. רכוש קרדיטים נוספים."); return; }
    const styleType = styleMode === "custom"
      ? "custom_prompt"
      : (productType === "fashion" && (selectedStyle === "female_model" || selectedStyle === "male_model") && selectedSkinTone
        ? `${selectedStyle}:${selectedSkinTone}`
        : selectedStyle);
    try {
      const result = await generateStyled.mutateAsync({
        businessId,
        productId,
        productName: productName || "מוצר",
        productType,
        styleType,
        originalImageUrl: originalUrl,
        customPrompt: styleMode === "custom" ? customPrompt : undefined,
      });
      if (result?.imageUrl) {
        onImageGenerated(result.imageUrl);
        setSelectedStyle(""); setSelectedSkinTone(""); setCustomPrompt("");
      }
    } catch { /* hook shows the error toast */ }
  };

  return (
    <div className="space-y-4 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">יצירת תמונה באמצעות AI</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          קרדיטים: <span className="font-semibold text-primary">{creditsRemaining}</span>
        </span>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
        <button type="button" onClick={() => setMode("text")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${mode === "text" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          <Wand2 className="h-4 w-4" /> צור מטקסט
        </button>
        <button type="button" onClick={() => setMode("styled")}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${mode === "styled" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          <ImageIcon className="h-4 w-4" /> שדרוג תמונה
        </button>
      </div>

      {/* ── Text mode ── */}
      {mode === "text" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="ai-prompt" className="!text-foreground">תאר את התמונה שאתה רוצה ליצור</Label>
            <Textarea id="ai-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder="לדוגמה: תמונת מוצר מקצועית עם רקע לבן נקי ותאורה רכה..." rows={3} disabled={isGenerating} />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleGenerateText} disabled={isGenerating || !prompt.trim()} className="gap-2">
              {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> מייצר...</> : <><Wand2 className="h-4 w-4" /> צור תמונה (1 קרדיט)</>}
            </Button>
          </div>
        </div>
      )}

      {/* ── Styled mode ── */}
      {mode === "styled" && (
        <div className="space-y-4">
          {/* Original image */}
          <div className="space-y-2">
            <Label className="!text-foreground text-sm">תמונת מקור</Label>
            {originalUrl ? (
              <div className="flex items-center gap-3 p-2 rounded-lg bg-background border border-border">
                <img src={originalUrl} alt="" className="w-14 h-14 object-cover rounded-md" />
                <span className="text-xs text-muted-foreground flex-1">התמונה תשמש בסיס לשדרוג</span>
                <label className="text-xs text-primary hover:underline cursor-pointer">
                  החלף
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadOriginal} disabled={isUploading} />
                </label>
              </div>
            ) : (
              <label className={`flex flex-col items-center justify-center gap-2 p-5 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${isUploading ? "opacity-60" : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"}`}>
                {isUploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className="h-6 w-6 text-primary" />}
                <span className="text-sm text-muted-foreground">{isUploading ? "מעלה..." : "העלה תמונת מוצר לשדרוג"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadOriginal} disabled={isUploading} />
              </label>
            )}
          </div>

          {/* Product type */}
          <div className="grid grid-cols-2 gap-2">
            {([["general", "מוצר כללי"], ["fashion", "אופנה / ביגוד"]] as const).map(([val, label]) => (
              <button key={val} type="button" onClick={() => { setProductType(val); setSelectedStyle(""); setSelectedSkinTone(""); }}
                className={`py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${productType === val ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Style mode toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            <button type="button" onClick={() => setStyleMode("preset")}
              className={`py-1.5 px-2 rounded text-xs font-medium transition-all ${styleMode === "preset" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>סגנונות מוכנים</button>
            <button type="button" onClick={() => setStyleMode("custom")}
              className={`py-1.5 px-2 rounded text-xs font-medium transition-all ${styleMode === "custom" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>פרומפט חופשי</button>
          </div>

          {styleMode === "preset" ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {styleOptions.map((s) => (
                  <button key={s.id} type="button"
                    onClick={() => { setSelectedStyle(s.id); if (s.id !== "female_model" && s.id !== "male_model") setSelectedSkinTone(""); }}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-right transition-all ${selectedStyle === s.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <span className="text-xl">{s.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{s.description}</p>
                    </div>
                    {selectedStyle === s.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                ))}
              </div>
              {productType === "fashion" && (selectedStyle === "female_model" || selectedStyle === "male_model") && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-xs text-muted-foreground self-center ml-1">גוון עור:</span>
                  {SKIN_TONE_OPTIONS.map((t) => (
                    <button key={t.id} type="button" onClick={() => setSelectedSkinTone(selectedSkinTone === t.id ? "" : t.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selectedSkinTone === t.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="תאר את הרקע, התאורה והאווירה שתרצה..." className="min-h-[80px] resize-none text-sm bg-background" maxLength={500} />
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_EXAMPLES.map((ex) => (
                  <button key={ex} type="button" onClick={() => setCustomPrompt(ex)}
                    className="text-[11px] px-2 py-1 rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleGenerateStyled} disabled={generateStyled.isPending || !canGenerateStyled} className="gap-2">
              {generateStyled.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> משדרג...</> : <><Wand2 className="h-4 w-4" /> שדרג תמונה (1 קרדיט)</>}
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        💡 קרדיטים אזלו? אפשר לרכוש חבילות במסך "תמונות AI".
      </p>
    </div>
  );
};
