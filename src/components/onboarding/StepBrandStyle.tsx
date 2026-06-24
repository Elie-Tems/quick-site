import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OnboardingData } from "@/pages/Onboarding";
import { Globe, Upload, Wand2, ArrowLeft, Check, Loader2, Sparkles, AlertCircle, X, FileImage, Pencil } from "lucide-react";
import { StepNavigation } from "./StepNavigation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface StepBrandStyleProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

interface BrandingResult {
  primaryColor: string;
  brandStyle: 'modern' | 'minimal' | 'bold' | 'elegant';
  suggestedTagline: string;
  businessDescription: string;
  colorPalette: string[];
  websiteTitle?: string;
}

const options = [
  {
    id: "upload" as const,
    icon: Upload,
    title: "חומרי פרסום",
    description: "תמונה, PDF או לוגו",
    default: true,
  },
  {
    id: "website" as const,
    icon: Globe,
    title: "דף נחיתה / אתר קיים",
    description: "נלמד את הסגנון מהאתר שלך",
  },
  {
    id: "auto" as const,
    icon: Wand2,
    title: "אין - תבחרו אתם",
    description: "ניצור עיצוב מותאם אוטומטית",
  },
];

// Preset color palettes for quick selection
const presetColors = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#F97316",
  "#EAB308", "#22C55E", "#14B8A6", "#06B6D4", "#6366F1",
  "#0EA5E9", "#84CC16", "#F59E0B", "#DC2626", "#7C3AED",
];

// Sample a categorized palette from a rendered canvas. Brand (saturated) colors
// and base (neutral: black/white/gray) colors are tracked separately so a dark
// design's black base is NOT lost - primary is the dominant brand color (or the
// dominant base if the image has no real color), and the palette keeps the base.
function samplePaletteFromCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): { primaryColor: string; colorPalette: string[] } {
  const { data } = ctx.getImageData(0, 0, w, h);
  const sat = new Map<string, number>();
  const neutral = new Map<string, number>();
  const toHex = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, "0").toUpperCase();
  const q = (n: number) => Math.round(n / 24) * 24;
  const hex = (r: number, g: number, b: number) => `#${toHex(q(r))}${toHex(q(g))}${toHex(q(b))}`;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue; // transparent
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const key = hex(r, g, b);
    if (mx - mn < 18 || (mx > 240 && mn > 240) || mx < 25) {
      neutral.set(key, (neutral.get(key) || 0) + 1); // base: gray / near-white / near-black
    } else {
      sat.set(key, (sat.get(key) || 0) + 1); // brand color
    }
  }

  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([c]) => c);
  const satTop = top(sat, 4);
  const baseTop = top(neutral, 2);

  if (satTop.length === 0 && baseTop.length === 0) throw new Error("no colors found");

  const primaryColor = satTop[0] || baseTop[0];
  // Palette = remaining brand colors + the dominant base (so black/white survives).
  const palette = [...satTop.slice(1), ...baseTop].filter(
    (c, i, a) => c !== primaryColor && a.indexOf(c) === i,
  );
  return { primaryColor, colorPalette: palette.slice(0, 4) };
}

// Extract a palette from an uploaded image (client-side canvas sampling).
async function extractPaletteFromImage(file: File): Promise<{ primaryColor: string; colorPalette: string[] }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("image load failed"));
      i.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    const w = (canvas.width = Math.min(img.naturalWidth || 200, 240));
    const h = (canvas.height = Math.min(img.naturalHeight || 200, 240));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas unavailable");
    ctx.drawImage(img, 0, 0, w, h);
    return samplePaletteFromCanvas(ctx, w, h);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// Extract a palette from a PDF (e.g. an ad / prospectus) by rendering its first
// page to a canvas, then sampling - same logic as images.
async function extractPaletteFromPdf(file: File): Promise<{ primaryColor: string; colorPalette: string[] }> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(300 / base.width, 300 / base.height, 2);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
  return samplePaletteFromCanvas(ctx, canvas.width, canvas.height);
}

const StepBrandStyle = ({ data, updateData, onNext, onBack }: StepBrandStyleProps) => {
  const [websiteUrl, setWebsiteUrl] = useState(data.websiteUrl || "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [brandingResult, setBrandingResult] = useState<BrandingResult | null>(
    data.extractedBranding || null
  );
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isEditingColors, setIsEditingColors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (id: typeof options[number]["id"]) => {
    updateData({ brandSource: id });
    if (id !== "website") {
      setBrandingResult(null);
      setIsEditingColors(false);
    }
    setAnalyzeError(null);
    if (id !== "upload") {
      setUploadedFiles([]);
    }
  };

  const updatePrimaryColor = (color: string) => {
    if (!brandingResult) return;
    const updated = { ...brandingResult, primaryColor: color };
    setBrandingResult(updated);
    updateData({ extractedBranding: updated });
    toast.success("צבע ראשי עודכן");
  };

  const updatePaletteColor = (index: number, color: string) => {
    if (!brandingResult) return;
    const newPalette = [...(brandingResult.colorPalette || [])];
    newPalette[index] = color;
    const updated = { ...brandingResult, colorPalette: newPalette };
    setBrandingResult(updated);
    updateData({ extractedBranding: updated });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const validFiles = Array.from(files).filter(file => {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (!validTypes.includes(file.type)) {
          toast.error(`סוג קובץ לא נתמך: ${file.name}`);
          return false;
        }
        if (file.size > maxSize) {
          toast.error(`הקובץ ${file.name} גדול מדי (מקסימום 10MB)`);
          return false;
        }
        return true;
      });
      
      setUploadedFiles(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} קבצים נוספו בהצלחה`);
      const firstFile = validFiles.find(f => f.type.startsWith("image/") || f.type === "application/pdf");
      if (firstFile) void detectColorsFromFile(firstFile);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const validFiles = Array.from(files).filter(file => {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        const maxSize = 10 * 1024 * 1024;
        return validTypes.includes(file.type) && file.size <= maxSize;
      });
      setUploadedFiles(prev => [...prev, ...validFiles]);
      if (validFiles.length > 0) {
        toast.success(`${validFiles.length} קבצים נוספו בהצלחה`);
        const firstFile = validFiles.find(f => f.type.startsWith("image/") || f.type === "application/pdf");
        if (firstFile) void detectColorsFromFile(firstFile);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Detect brand colors from an uploaded image OR PDF (client-side) and store
  // them as the extracted branding so the rest of onboarding can use them.
  const detectColorsFromFile = async (file: File) => {
    try {
      const { primaryColor, colorPalette } =
        file.type === "application/pdf"
          ? await extractPaletteFromPdf(file)
          : await extractPaletteFromImage(file);
      const branding: BrandingResult = {
        primaryColor,
        colorPalette,
        brandStyle: "modern",
        suggestedTagline: "",
        businessDescription: "",
        websiteTitle: file.name,
      };
      setBrandingResult(branding);
      updateData({ extractedBranding: branding });
      toast.success("זיהינו את הצבעים מהקובץ");
      // Scroll down so the result + "continue" are visible (they sit below the fold).
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 150);
    } catch (err) {
      console.error("color extraction failed:", err);
      toast.error("לא הצלחנו לזהות צבעים מהקובץ - נסו קובץ אחר");
    }
  };

  const analyzeWebsite = async () => {
    if (!websiteUrl) return;
    
    setIsAnalyzing(true);
    setAnalyzeError(null);
    setBrandingResult(null);

    try {
      // Format URL
      let formattedUrl = websiteUrl.trim();
      if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
        formattedUrl = `https://${formattedUrl}`;
      }

      const { data: result, error } = await supabase.functions.invoke("analyze-website", {
        body: { url: formattedUrl },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!result.success) {
        throw new Error(result.error || "ניתוח האתר נכשל");
      }

      const branding = result.data as BrandingResult;
      setBrandingResult(branding);
      
      // Update onboarding data with extracted branding
      updateData({
        websiteUrl: formattedUrl,
        extractedBranding: branding,
      });

      toast.success("ניתוח האתר הושלם בהצלחה!");
    } catch (error: any) {
      console.error("Error analyzing website:", error);
      setAnalyzeError(error.message || "שגיאה בניתוח האתר");
      toast.error("שגיאה בניתוח האתר");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNext = () => {
    if (data.brandSource === "website") {
      updateData({ websiteUrl });
    }
    onNext();
  };

  const canContinue = data.brandSource === "auto" || 
    data.brandSource === "upload" || 
    (data.brandSource === "website" && websiteUrl.length > 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <span className="inline-block text-sm font-semibold text-primary mb-3 px-3 py-1 rounded-full bg-primary/10">
          שלב 1
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          מאיפה נלמד את השפה של העסק?
        </h1>
        <p className="text-muted-foreground">
          נשתמש בזה כדי ליצור עיצוב מותאם אישית
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.id}
            onClick={() => handleSelect(option.id)}
            className={`w-full p-5 rounded-xl border-2 transition-all duration-200 text-right ${
              data.brandSource === option.id
                ? "border-primary bg-primary/5 shadow-soft"
                : "border-border bg-card hover:border-primary/30"
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                data.brandSource === option.id
                  ? "bg-gradient-to-br from-primary to-[hsl(280_60%_50%)]"
                  : "bg-surface-1"
              }`}>
                <option.icon className={`w-6 h-6 ${
                  data.brandSource === option.id ? "text-white" : "text-foreground"
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">{option.title}</h3>
                  {option.id === "website" && (
                    <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI
                    </span>
                  )}
                  {option.default && data.brandSource !== option.id && (
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      ברירת מחדל
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
              {data.brandSource === option.id && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Website URL input */}
      {data.brandSource === "website" && (
        <div className="space-y-4 pt-2">
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="https://www.example.com"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="h-12 flex-1"
              dir="ltr"
            />
            <Button
              type="button"
              onClick={analyzeWebsite}
              disabled={!websiteUrl || isAnalyzing}
              className="h-12 gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  מנתח...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  נתח
                </>
              )}
            </Button>
          </div>

          {/* Error message */}
          {analyzeError && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{analyzeError}</p>
            </div>
          )}

          {/* Branding result - Success indicator */}
          {brandingResult && (
            <div className="space-y-4 animate-in fade-in duration-300">
              {/* Success banner */}
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-700 dark:text-green-400">
                    צבעי המותג נשמרו בהצלחה!
                  </h3>
                  <p className="text-sm text-green-600 dark:text-green-500">
                    הצבעים והסגנון יוחלו על כל החנות שלך
                  </p>
                </div>
              </div>

              {/* Extracted branding card */}
              <div className="p-5 rounded-xl bg-card border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="font-semibold">פרטי המיתוג שזוהו</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingColors(!isEditingColors)}
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="w-4 h-4" />
                    {isEditingColors ? "סיום עריכה" : "ערוך צבעים"}
                  </Button>
                </div>
                
                {/* Color palette with labels - editable */}
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">פלטת צבעים שתיושם:</p>
                  
                  {isEditingColors ? (
                    <div className="space-y-4">
                      {/* Primary color editor */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-foreground">צבע ראשי</label>
                        <div className="flex items-center gap-3">
                          <Popover>
                            <PopoverTrigger asChild>
                              <button
                                className="w-14 h-14 rounded-lg shadow-md ring-2 ring-primary/30 cursor-pointer hover:ring-primary transition-all"
                                style={{ backgroundColor: brandingResult.primaryColor }}
                              />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3" align="start">
                              <div className="space-y-3">
                                <p className="text-xs font-medium text-muted-foreground">בחר צבע:</p>
                                <div className="grid grid-cols-5 gap-2">
                                  {presetColors.map((color) => (
                                    <button
                                      key={color}
                                      className={`w-8 h-8 rounded-lg transition-all hover:scale-110 ${
                                        brandingResult.primaryColor === color ? 'ring-2 ring-foreground ring-offset-2' : ''
                                      }`}
                                      style={{ backgroundColor: color }}
                                      onClick={() => updatePrimaryColor(color)}
                                    />
                                  ))}
                                </div>
                                <div className="pt-2 border-t border-border">
                                  <label className="text-xs text-muted-foreground">צבע מותאם:</label>
                                  <Input
                                    type="color"
                                    value={brandingResult.primaryColor}
                                    onChange={(e) => updatePrimaryColor(e.target.value)}
                                    className="w-full h-10 mt-1 cursor-pointer"
                                  />
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                          <div className="flex-1">
                            <Input
                              type="text"
                              value={brandingResult.primaryColor}
                              onChange={(e) => updatePrimaryColor(e.target.value)}
                              className="font-mono text-sm"
                              dir="ltr"
                              placeholder="#000000"
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="flex gap-3 items-end">
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className="w-14 h-14 rounded-lg shadow-md ring-2 ring-primary/30"
                          style={{ backgroundColor: brandingResult.primaryColor }}
                        />
                        <span className="text-xs text-primary font-medium">צבע ראשי</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Brand style */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">סגנון:</p>
                    <p className="text-sm font-medium text-foreground">
                      {brandingResult.brandStyle === 'modern' && 'מודרני'}
                      {brandingResult.brandStyle === 'minimal' && 'מינימליסטי'}
                      {brandingResult.brandStyle === 'bold' && 'נועז'}
                      {brandingResult.brandStyle === 'elegant' && 'יוקרתי'}
                    </p>
                  </div>
                  {brandingResult.websiteTitle && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">שם האתר:</p>
                      <p className="text-sm font-medium text-foreground truncate">{brandingResult.websiteTitle}</p>
                    </div>
                  )}
                </div>

                {/* Tagline suggestion */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">סלוגן מוצע:</p>
                  <p className="text-sm font-medium text-foreground">"{brandingResult.suggestedTagline}"</p>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">תיאור העסק:</p>
                  <p className="text-sm text-foreground">{brandingResult.businessDescription}</p>
                </div>

                {/* What will be applied */}
                <div className="pt-3 border-t border-border">
                  <p className="text-xs font-medium text-foreground mb-2">מה ייושם על החנות:</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                      <Check className="w-3 h-3" /> צבעי רקע
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                      <Check className="w-3 h-3" /> כפתורים
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                      <Check className="w-3 h-3" /> באנרים
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                      <Check className="w-3 h-3" /> כרטיסי מוצר
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload area */}
      {data.brandSource === "upload" && (
        <div className="pt-2 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <div 
            className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/30 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">גרור קבצים לכאן</p>
            <p className="text-sm text-muted-foreground">או לחץ לבחירת קובץ</p>
            <p className="text-xs text-muted-foreground mt-2">תמונות (JPG, PNG, GIF, WEBP) או PDF - עד 10MB</p>
          </div>

          {/* Uploaded files list */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">קבצים שהועלו ({uploadedFiles.length}):</p>
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-card border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <FileImage className="w-5 h-5 text-primary" />
                      <span className="text-sm text-foreground truncate max-w-[200px]">{file.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 rounded hover:bg-destructive/10 transition-colors"
                    >
                      <X className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detected colors from the uploaded image */}
          {brandingResult && data.brandSource === "upload" && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">זיהינו את הצבעים מהקובץ</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {[brandingResult.primaryColor, ...(brandingResult.colorPalette || [])]
                  .filter(Boolean)
                  .slice(0, 5)
                  .map((color, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className="w-10 h-10 rounded-lg border border-border"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[10px] text-muted-foreground" dir="ltr">{color}</span>
                    </div>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground">תוכלו לכוונן את הצבעים בהמשך בלוח הניהול.</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        onNext={handleNext}
        onBack={onBack}
        onSaveAndContinue={handleNext}
        nextLabel="הבא"
        backLabel="חזרה"
        saveLabel="שמור והמשך"
        nextDisabled={!canContinue}
        saveDisabled={!canContinue}
        showBack={!!onBack}
        showPreview={true}
        showSave={true}
      />
    </div>
  );
};

export default StepBrandStyle;
