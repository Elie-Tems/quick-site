import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OnboardingData } from "@/pages/Onboarding";
import { ArrowLeft, ArrowRight, ImageIcon, Loader2, RefreshCw, X, Wand2, Upload, Link } from "lucide-react";
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

const StepBannerUpload = ({ data, updateData, onNext, onBack }: StepBannerUploadProps) => {
  const [heroPreview, setHeroPreview] = useState<string | null>(data.extractedBranding?.heroImageUrl || null);
  const [isGeneratingHero, setIsGeneratingHero] = useState(false);
  const [heroGenerated, setHeroGenerated] = useState(!!data.extractedBranding?.heroImageUrl);
  const [selectedMethod, setSelectedMethod] = useState<UploadMethod>(
    data.extractedBranding?.heroImageUrl ? 'ai' : null
  );
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastGeneratedCategory = useRef<string | null>(null);

  const generateHeroImage = async (forceRegenerate = false) => {
    if (!data.businessCategory) return;
    if (data.businessCategory === "other" && !data.customCategoryName) return;

    const categoryForCache = data.businessCategory === "other" 
      ? `other-${data.customCategoryName}` 
      : data.businessCategory;
    
    const cacheKey = `${categoryForCache}-${data.bannerStyle}`;
    
    if (!forceRegenerate && lastGeneratedCategory.current === cacheKey) return;
    
    setIsGeneratingHero(true);
    setHeroGenerated(false);

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

      if (error) {
        console.error('Failed to generate hero image:', error);
        toast({
          title: "שגיאה ביצירת באנר",
          description: "נסו שוב או העלו תמונה משלכם",
          variant: "destructive",
        });
        return;
      }

      if (heroData?.imageUrl) {
        updateData({
          extractedBranding: {
            ...data.extractedBranding,
            primaryColor: data.extractedBranding?.primaryColor || '#7c3aed',
            brandStyle: data.extractedBranding?.brandStyle || 'modern',
            suggestedTagline: data.extractedBranding?.suggestedTagline || '',
            businessDescription: data.extractedBranding?.businessDescription || '',
            colorPalette: data.extractedBranding?.colorPalette || [],
            heroImageUrl: heroData.imageUrl,
          }
        });
        lastGeneratedCategory.current = cacheKey;
        setHeroGenerated(true);
        setSelectedMethod('ai');
        setHeroPreview(heroData.imageUrl);
        
        toast({
          title: forceRegenerate ? "באנר חדש נוצר! ✨" : "באנר נוצר בהצלחה! ✨",
          description: "תוכלו לראות אותו בתצוגה המקדימה",
        });
      }
    } catch (err) {
      console.error('Hero image generation error:', err);
      toast({
        title: "שגיאה ביצירת באנר",
        description: "נסו שוב מאוחר יותר",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingHero(false);
    }
  };

  const handleMethodClick = (method: UploadMethod) => {
    if (method === 'upload') {
      fileInputRef.current?.click();
    } else if (method === 'url') {
      setSelectedMethod('url');
    } else if (method === 'ai') {
      setSelectedMethod('ai');
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;
    
    // Basic URL validation
    try {
      new URL(urlInput);
    } catch {
      toast({
        title: "קישור לא תקין",
        description: "נא להזין קישור תקין לתמונה",
        variant: "destructive",
      });
      return;
    }

    setHeroPreview(urlInput);
    setSelectedMethod('url');
    setHeroGenerated(true);
    setShowUrlInput(false);
    
    updateData({
      extractedBranding: {
        ...data.extractedBranding,
        primaryColor: data.extractedBranding?.primaryColor || '#7c3aed',
        brandStyle: data.extractedBranding?.brandStyle || 'modern',
        suggestedTagline: data.extractedBranding?.suggestedTagline || '',
        businessDescription: data.extractedBranding?.businessDescription || '',
        colorPalette: data.extractedBranding?.colorPalette || [],
        heroImageUrl: urlInput,
      }
    });

    toast({
      title: "תמונה נטענה בהצלחה! ✨",
    });
  };

  const handleHeroBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "הקובץ גדול מדי",
          description: "גודל מקסימלי 5MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setHeroPreview(dataUrl);
        setSelectedMethod('upload');
        setHeroGenerated(true);
        
        updateData({
          extractedBranding: {
            ...data.extractedBranding,
            primaryColor: data.extractedBranding?.primaryColor || '#7c3aed',
            brandStyle: data.extractedBranding?.brandStyle || 'modern',
            suggestedTagline: data.extractedBranding?.suggestedTagline || '',
            businessDescription: data.extractedBranding?.businessDescription || '',
            colorPalette: data.extractedBranding?.colorPalette || [],
            heroImageUrl: dataUrl,
          }
        });

        toast({
          title: "באנר הועלה בהצלחה! ✨",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveHeroBanner = () => {
    setHeroPreview(null);
    setSelectedMethod(null);
    setHeroGenerated(false);
    setShowUrlInput(false);
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
        <span className="inline-block text-sm font-semibold text-primary mb-3 px-3 py-1 rounded-full bg-primary/10">
          שלב 3
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          תמונת נושא (סליידר ראשי) לאתר
        </h1>
        <p className="text-muted-foreground">
          התמונה הראשית שתופיע בראש האתר שלכם
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleHeroBannerUpload}
        className="hidden"
      />

      {/* Three Options Side by Side - Always Visible */}
      {!heroPreview && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {/* Option 1: Upload */}
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => handleMethodClick('upload')}
              className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center group flex flex-col items-center justify-center min-h-[140px] ${
                selectedMethod === 'upload' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <Upload className={`w-8 h-8 mb-3 transition-colors ${
                selectedMethod === 'upload' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
              }`} />
              <p className="text-sm font-medium text-foreground">העלאה</p>
              <p className="text-xs text-muted-foreground mt-1">מהמחשב</p>
            </motion.button>

            {/* Option 2: URL */}
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              onClick={() => handleMethodClick('url')}
              className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center group flex flex-col items-center justify-center min-h-[140px] ${
                selectedMethod === 'url' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-primary/5'
              }`}
            >
              <Link className={`w-8 h-8 mb-3 transition-colors ${
                selectedMethod === 'url' ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
              }`} />
              <p className="text-sm font-medium text-foreground">קישור</p>
              <p className="text-xs text-muted-foreground mt-1">מהאינטרנט</p>
            </motion.button>

            {/* Option 3: AI Generate */}
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => handleMethodClick('ai')}
              disabled={isGeneratingHero}
              className={`p-6 rounded-2xl border-2 transition-all text-center group flex flex-col items-center justify-center min-h-[140px] disabled:opacity-50 ${
                selectedMethod === 'ai' ? 'border-primary bg-primary/10' : 'border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10'
              }`}
            >
              {isGeneratingHero ? (
                <Loader2 className="w-8 h-8 text-primary mb-3 animate-spin" />
              ) : (
                <Wand2 className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
              )}
              <p className="text-sm font-medium text-primary">תיצרו לי אתם</p>
              <p className="text-xs text-muted-foreground mt-1">באמצעות AI ✨</p>
            </motion.button>
          </div>

          {/* URL Input Field */}
          {selectedMethod === 'url' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="הדבק כאן קישור לתמונה..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                />
                <Button onClick={handleUrlSubmit} disabled={!urlInput.trim()}>
                  טען תמונה
                </Button>
              </div>
            </motion.div>
          )}

          {/* AI Prompt Input */}
          {selectedMethod === 'ai' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <Input
                placeholder="תארו את התמונה הרצויה - לדוגמה: אווירה חמה עם שמש שוקעת וצמחייה טרופית"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className="h-11"
              />
              <Button
                onClick={() => generateHeroImage(true)}
                disabled={isGeneratingHero}
                className="w-full"
              >
                {isGeneratingHero ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    יוצר תמונה...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 ml-2" />
                    צור תמונה
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </div>
      )}

      {/* Preview Section */}
      {heroPreview && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative"
        >
          <div 
            className="relative aspect-video rounded-2xl overflow-hidden border-2 border-primary"
            style={{
              boxShadow: '0 0 40px hsl(var(--primary) / 0.3)',
            }}
          >
            <img 
              src={heroPreview} 
              alt="Hero banner preview" 
              className="w-full h-full object-cover"
            />
            
            {/* Overlay with controls */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
            
            {/* Remove button */}
            <button
              type="button"
              onClick={handleRemoveHeroBanner}
              className="absolute top-3 left-3 p-2 rounded-xl bg-black/60 text-white hover:bg-red-600/80 transition-all border border-white/10 backdrop-blur-sm"
              title="הסר תמונה"
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

            {/* Regenerate button for AI */}
            {selectedMethod === 'ai' && (
              <div className="absolute bottom-3 right-3 flex flex-col gap-2 items-end">
                {showCustomPrompt && (
                  <>
                    <Input
                      placeholder="לדוגמה: אווירה חמה עם שמש שוקעת וצמחייה טרופית"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      className="h-11 w-64 bg-background/95 backdrop-blur-sm"
                    />
                    <button
                      type="button"
                      onClick={() => generateHeroImage(true)}
                      disabled={isGeneratingHero}
                      className="px-4 py-2 rounded-xl bg-primary/80 hover:bg-primary text-white text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isGeneratingHero ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wand2 className="w-4 h-4" />
                      )}
                      צור עכשיו
                    </button>
                  </>
                )}
                {!showCustomPrompt && (
                  <button
                    type="button"
                    onClick={() => setShowCustomPrompt(true)}
                    className="px-4 py-2 rounded-xl bg-primary/80 hover:bg-primary text-white text-sm font-medium transition-all flex items-center gap-2"
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

      {/* Navigation */}
      <StepNavigation
        onNext={onNext}
        onSaveAndContinue={onNext}
        onBack={onBack}
        nextLabel="הבא"
        saveLabel={heroPreview ? 'שמור והמשך' : 'דלג'}
        saveIcon={heroPreview ? undefined : <ArrowLeft className="w-4 h-4" />}
        showPreview={false}
        showSave={true}
      />
    </div>
  );
};

export default StepBannerUpload;
