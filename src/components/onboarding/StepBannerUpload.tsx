import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { OnboardingData } from "@/pages/Onboarding";
import { Loader2, RefreshCw, X, Wand2, Upload, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { StepNavigation } from "./StepNavigation";

interface StepBannerUploadProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

type UploadMethod = 'upload' | 'url' | 'ai' | null;

// Compress image via canvas — always returns a data URL under ~4.5MB
const compressImage = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const MAX_DIM = 2400;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const r = Math.min(MAX_DIM / width, MAX_DIM / height);
        width = Math.round(width * r);
        height = Math.round(height * r);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      // ~1.37 overhead for base64; target 4.5MB binary
      let q = 0.92;
      let dataUrl = canvas.toDataURL('image/jpeg', q);
      while (dataUrl.length > 4.5 * 1024 * 1024 * 1.37 && q > 0.5) {
        q -= 0.08;
        dataUrl = canvas.toDataURL('image/jpeg', q);
      }
      resolve(dataUrl);
    };
    img.src = objUrl;
  });

const StepBannerUpload = ({ data, updateData, onNext, onBack }: StepBannerUploadProps) => {
  const [heroPreview, setHeroPreview] = useState<string | null>(data.extractedBranding?.heroImageUrl || null);
  const [isGeneratingHero, setIsGeneratingHero] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<UploadMethod>(
    data.extractedBranding?.heroImageUrl ? 'ai' : null
  );
  const [urlInput, setUrlInput] = useState('');
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastGeneratedCategory = useRef<string | null>(null);
  const autoGenTriggered = useRef(false);

  // Auto-generate on mount if no image yet and category is known
  useEffect(() => {
    if (autoGenTriggered.current) return;
    if (heroPreview) return;
    if (!data.businessCategory || data.businessCategory === 'other') return;
    autoGenTriggered.current = true;
    generateHeroImage(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveHeroImage = (url: string, method: UploadMethod) => {
    setHeroPreview(url);
    setSelectedMethod(method);
    updateData({
      extractedBranding: {
        ...data.extractedBranding,
        primaryColor: data.extractedBranding?.primaryColor || '#7c3aed',
        brandStyle: data.extractedBranding?.brandStyle || 'modern',
        suggestedTagline: data.extractedBranding?.suggestedTagline || '',
        businessDescription: data.extractedBranding?.businessDescription || '',
        colorPalette: data.extractedBranding?.colorPalette || [],
        heroImageUrl: url,
      }
    });
  };

  const generateHeroImage = async (forceRegenerate = false) => {
    if (!data.businessCategory) return;
    if (data.businessCategory === "other" && !data.customCategoryName) return;

    const categoryForCache = data.businessCategory === "other"
      ? `other-${data.customCategoryName}`
      : data.businessCategory;
    const cacheKey = `${categoryForCache}-${data.bannerStyle}`;
    if (!forceRegenerate && lastGeneratedCategory.current === cacheKey) return;

    setIsGeneratingHero(true);
    setSelectedMethod('ai');

    try {
      const brandData = data.extractedBranding ? {
        primaryColor: data.extractedBranding.primaryColor,
        colorPalette: data.extractedBranding.colorPalette,
        brandStyle: data.extractedBranding.brandStyle,
        businessDescription: data.extractedBranding.businessDescription,
        websiteTitle: data.extractedBranding.websiteTitle,
      } : undefined;

      const categoryToUse = data.businessCategory === "other"
        ? data.customCategoryName
        : data.businessCategory;

      const { data: heroData, error } = await supabase.functions.invoke('generate-hero-image', {
        body: {
          category: categoryToUse,
          businessName: data.businessName || 'העסק שלי',
          bannerStyle: data.bannerStyle,
          brandData,
          customPrompt: customPrompt.trim() || undefined,
        }
      });

      if (error || !heroData?.imageUrl) {
        toast({ title: "שגיאה ביצירת תמונה", description: "נסו שוב או העלו תמונה משלכם", variant: "destructive" });
        setSelectedMethod(null);
        return;
      }

      lastGeneratedCategory.current = cacheKey;
      saveHeroImage(heroData.imageUrl, 'ai');
      toast({ title: forceRegenerate ? "תמונה חדשה נוצרה! ✨" : "תמונה נוצרה בהצלחה! ✨" });
    } catch {
      toast({ title: "שגיאה ביצירת תמונה", description: "נסו שוב מאוחר יותר", variant: "destructive" });
      setSelectedMethod(null);
    } finally {
      setIsGeneratingHero(false);
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    try { new URL(urlInput); } catch {
      toast({ title: "קישור לא תקין", variant: "destructive" });
      return;
    }
    saveHeroImage(urlInput, 'url');
    toast({ title: "תמונה נטענה בהצלחה! ✨" });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressImage(file);
    saveHeroImage(dataUrl, 'upload');
    toast({ title: "תמונה הועלתה בהצלחה! ✨" });
  };

  const handleRemove = () => {
    setHeroPreview(null);
    setSelectedMethod(null);
    setUrlInput('');
    lastGeneratedCategory.current = null;
    updateData({
      extractedBranding: {
        ...data.extractedBranding,
        primaryColor: data.extractedBranding?.primaryColor || '#7c3aed',
        brandStyle: data.extractedBranding?.brandStyle || 'modern',
        suggestedTagline: data.extractedBranding?.suggestedTagline || '',
        businessDescription: data.extractedBranding?.businessDescription || '',
        colorPalette: data.extractedBranding?.colorPalette || [],
        heroImageUrl: undefined,
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          תמונת נושא (סליידר ראשי) לאתר
        </h1>
        <p className="text-muted-foreground">
          התמונה הראשית שתופיע בראש האתר שלכם
        </p>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      {/* Generating state */}
      {isGeneratingHero && !heroPreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center gap-4 py-12"
        >
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">יוצר תמונה מותאמת לעסק שלכם...</p>
        </motion.div>
      )}

      {/* Options — shown when no preview and not generating */}
      {!heroPreview && !isGeneratingHero && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Upload */}
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={handleUploadClick}
              className="p-6 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-center flex flex-col items-center justify-center min-h-[140px]"
            >
              <Upload className="w-8 h-8 mb-3 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">העלאה</p>
              <p className="text-xs text-muted-foreground mt-1">מהמחשב</p>
            </motion.button>

            {/* URL */}
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              onClick={() => setSelectedMethod(selectedMethod === 'url' ? null : 'url')}
              className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center min-h-[140px] ${
                selectedMethod === 'url' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <Link className="w-8 h-8 mb-3 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">קישור</p>
              <p className="text-xs text-muted-foreground mt-1">מהאינטרנט</p>
            </motion.button>

            {/* AI Generate */}
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => generateHeroImage(true)}
              disabled={isGeneratingHero}
              className="p-6 rounded-2xl border-2 border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 transition-all text-center flex flex-col items-center justify-center min-h-[140px] disabled:opacity-50"
            >
              <Wand2 className="w-8 h-8 text-primary mb-3" />
              <p className="text-sm font-medium text-primary">תיצרו לי אתם</p>
              <p className="text-xs text-muted-foreground mt-1">באמצעות AI ✨</p>
            </motion.button>
          </div>

          {/* URL input */}
          {selectedMethod === 'url' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
              <Input
                type="url"
                placeholder="הדבק כאן קישור לתמונה..."
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
              />
              <button
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim()}
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50"
              >
                טען
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* Preview */}
      {heroPreview && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative">
          {isGeneratingHero && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/50 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
          <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-primary" style={{ boxShadow: '0 0 40px hsl(var(--primary) / 0.3)' }}>
            <img src={heroPreview} alt="Hero" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

            {/* Remove */}
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-3 left-3 p-2 rounded-xl bg-black/60 text-white hover:bg-red-600/80 transition-all border border-white/10 backdrop-blur-sm"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Source badge */}
            <div className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 backdrop-blur-sm">
              <span className="text-xs font-medium text-white flex items-center gap-1.5">
                {selectedMethod === 'ai' && <><Wand2 className="w-3.5 h-3.5 text-primary" /> נוצר ע״י AI</>}
                {selectedMethod === 'upload' && <><Upload className="w-3.5 h-3.5" /> הועלה</>}
                {selectedMethod === 'url' && <><Link className="w-3.5 h-3.5" /> מקישור</>}
              </span>
            </div>

            {/* Regenerate (AI only) */}
            {selectedMethod === 'ai' && (
              <div className="absolute bottom-3 right-3 flex flex-col gap-2 items-end">
                {showCustomPrompt && (
                  <>
                    <Input
                      placeholder="תארו את התמונה הרצויה..."
                      value={customPrompt}
                      onChange={e => setCustomPrompt(e.target.value)}
                      className="h-11 w-64 bg-background/95 backdrop-blur-sm"
                    />
                    <button
                      type="button"
                      onClick={() => generateHeroImage(true)}
                      disabled={isGeneratingHero}
                      className="px-4 py-2 rounded-xl bg-primary/80 hover:bg-primary text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                    >
                      {isGeneratingHero ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                      צור עכשיו
                    </button>
                  </>
                )}
                {!showCustomPrompt && (
                  <button
                    type="button"
                    onClick={() => setShowCustomPrompt(true)}
                    className="px-4 py-2 rounded-xl bg-primary/80 hover:bg-primary text-white text-sm font-medium flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    צור מחדש
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      <StepNavigation
        onNext={onNext}
        onSaveAndContinue={onNext}
        onBack={onBack}
        nextLabel={heroPreview ? "הבא ←" : "דלג"}
        saveLabel={heroPreview ? 'שמרו והמשיכו' : undefined}
        showPreview={false}
        showSave={!!heroPreview}
      />
    </div>
  );
};

export default StepBannerUpload;
