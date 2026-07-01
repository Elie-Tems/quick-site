import { useState, useMemo } from "react";
import { Monitor, Smartphone, ChevronDown, ChevronUp, Check, ExternalLink, Maximize2, Palette, Type, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { OnboardingData, BusinessCategory } from "@/pages/Onboarding";
import { getTemplate, templateList, StoreTemplateId } from "@/lib/storeTemplates";
import { getCategoryConfig } from "@/lib/categoryConfig";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface OnboardingPreviewProps {
  data: OnboardingData;
  onEditStep: (step: number) => void;
  onUpdateTemplate?: (templateId: StoreTemplateId) => void;
  onUpdateData?: (updates: Partial<OnboardingData>) => void;
}

type DeviceType = "desktop" | "mobile";

// Helper to convert hex to HSL for CSS variables
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 250, s: 60, l: 45 };
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const colorPresets = [
  { color: '#7c3aed', name: 'סגול' },
  { color: '#2563eb', name: 'כחול' },
  { color: '#059669', name: 'ירוק' },
  { color: '#dc2626', name: 'אדום' },
  { color: '#ea580c', name: 'כתום' },
  { color: '#0891b2', name: 'טורקיז' },
  { color: '#be185d', name: 'ורוד' },
  { color: '#000000', name: 'שחור' },
];

const OnboardingPreview = ({ data, onEditStep, onUpdateTemplate, onUpdateData }: OnboardingPreviewProps) => {
  const [device, setDevice] = useState<DeviceType>("mobile");
  const [isExpanded, setIsExpanded] = useState(true);
  const [showTemplateSelector, setShowTemplateSelector] = useState(true); // פתוח בדיפולט
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);
  
  // Editable fields state
  const [editableFields, setEditableFields] = useState({
    heroTitle: data.extractedBranding?.suggestedTagline || '',
    heroBadge: '',
    promoText: '',
    ctaText: '',
    primaryColor: data.extractedBranding?.primaryColor || '#7c3aed',
  });

  const template = getTemplate(data.storeTemplate);
  const categoryConfig = getCategoryConfig(data.businessCategory);

  // Get the AI-generated hero image URL
  const heroImageUrl = data.extractedBranding?.heroImageUrl || categoryConfig.heroImage;

  // When brand data is extracted, use those colors; otherwise use template colors
  const hasBrandColors = data.extractedBranding?.primaryColor && data.brandSource === "website";
  
  // Build effective theme - brand colors override template colors when available
  const effectiveTheme = useMemo(() => {
    if (hasBrandColors && data.extractedBranding) {
      const branding = data.extractedBranding;
      const primaryColor = branding.primaryColor;
      const secondaryColor = branding.colorPalette?.[0] || primaryColor;
      const accentColor = branding.colorPalette?.[1] || template.theme.mutedColor;
      
      // Determine if primary color is dark (for text contrast)
      const primaryHSL = hexToHSL(primaryColor);
      const isDarkPrimary = primaryHSL.l < 50;
      
      return {
        primaryColor,
        backgroundColor: template.theme.backgroundColor,
        foregroundColor: template.theme.foregroundColor,
        cardColor: template.theme.cardColor,
        mutedColor: accentColor,
        accentColor: secondaryColor,
        borderRadius: template.theme.borderRadius,
        isDarkPrimary,
      };
    }
    return {
      ...template.theme,
      isDarkPrimary: hexToHSL(template.theme.primaryColor).l < 50,
    };
  }, [hasBrandColors, data.extractedBranding, template]);

  // Generate dynamic CSS variables for the template
  const templateStyles = useMemo(() => {
    const primaryHSL = hexToHSL(effectiveTheme.primaryColor);
    const bgHSL = hexToHSL(effectiveTheme.backgroundColor);
    const fgHSL = hexToHSL(effectiveTheme.foregroundColor);
    
    return {
      '--preview-bg': `${bgHSL.h} ${bgHSL.s}% ${bgHSL.l}%`,
      '--preview-fg': `${fgHSL.h} ${fgHSL.s}% ${fgHSL.l}%`,
      '--preview-primary': `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`,
      backgroundColor: effectiveTheme.backgroundColor,
      color: effectiveTheme.foregroundColor,
      borderRadius: effectiveTheme.borderRadius,
    } as React.CSSProperties;
  }, [effectiveTheme]);

  // Quick edit options
  const editOptions = [
    { label: "פרטים", step: 3 },
    { label: "מוצרים", step: 5 },
  ];

  const handleTemplateChange = (templateId: StoreTemplateId) => {
    if (onUpdateTemplate) {
      onUpdateTemplate(templateId);
    }
    setShowTemplateSelector(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-primary" />
          </div>
          <div className="text-right">
            <h3 className="font-semibold text-foreground">תצוגה מקדימה</h3>
            <p className="text-xs text-muted-foreground">כך ייראה האתר שלך</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <>
          {/* Device Switcher */}
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setDevice("desktop")}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  device === "desktop" 
                    ? "bg-background shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="מחשב"
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDevice("mobile")}
                className={cn(
                  "p-2 rounded-md transition-colors",
                  device === "mobile" 
                    ? "bg-background shadow-sm text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="נייד"
              >
                <Smartphone className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Edit Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 gap-1"
                onClick={() => setShowEditPanel(true)}
              >
                <Palette className="h-3 w-3" />
                עריכה
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 gap-1"
                onClick={() => setShowFullPreview(true)}
              >
                <Maximize2 className="h-3 w-3" />
                הגדל
              </Button>
            </div>
          </div>

          {/* Preview Container - Clickable */}
          <div 
            className="bg-muted/50 p-4 cursor-pointer group"
            onClick={() => setShowFullPreview(true)}
          >
            <div className="relative flex justify-center">
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center z-10 pointer-events-none">
                <div className="bg-background/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">לחץ להגדלה</span>
                </div>
              </div>
              <div 
                className={cn(
                  "bg-background overflow-hidden transition-all duration-300",
                  device === "mobile" && "border-4 border-foreground/10 rounded-[1.5rem] w-[280px]",
                  device === "desktop" && "rounded-lg shadow-lg w-full max-w-[600px]"
                )}
                style={templateStyles}
              >
                {/* Mini Store Preview */}
                <div className="overflow-hidden">
                  {/* Mini Header */}
                  <div 
                    className="py-2 px-3 border-b flex items-center justify-between"
                    style={{ 
                      backgroundColor: effectiveTheme.cardColor,
                      borderColor: effectiveTheme.mutedColor + '20'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {data.logo ? (
                        <img 
                          src={URL.createObjectURL(data.logo)} 
                          alt="Logo" 
                          className="w-6 h-6 rounded object-cover"
                        />
                      ) : (
                        <div 
                          className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                          style={{ 
                            backgroundColor: effectiveTheme.primaryColor,
                            color: '#fff'
                          }}
                        >
                          {data.businessName?.charAt(0) || 'ק'}
                        </div>
                      )}
                      <span 
                        className="text-sm font-semibold truncate max-w-[100px]"
                        style={{ color: effectiveTheme.foregroundColor }}
                      >
                        {data.businessName || 'שם העסק'}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {categoryConfig.categories.slice(0, 2).map((cat, i) => (
                        <span 
                          key={i}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ 
                            backgroundColor: effectiveTheme.mutedColor + '15',
                            color: effectiveTheme.mutedColor
                          }}
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Mini Hero - Now with AI-generated image */}
                  <div 
                    className="relative py-8 px-4 text-center overflow-hidden"
                    style={{ 
                      backgroundColor: effectiveTheme.primaryColor,
                    }}
                  >
                    {/* AI-generated hero image or category default */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${heroImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    {/* Overlay for text readability */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to bottom, ${effectiveTheme.primaryColor}90, ${effectiveTheme.primaryColor}CC)`,
                      }}
                    />
                    <div className="relative z-10">
                      <p 
                        className="text-xs mb-1 opacity-90"
                        style={{ color: '#fff' }}
                      >
                        {categoryConfig.heroBadge}
                      </p>
                      <h2 
                        className="text-lg font-bold mb-2"
                        style={{ color: '#fff' }}
                      >
                        {data.businessName || categoryConfig.tagline}
                      </h2>
                      <button
                        className="text-xs px-3 py-1.5 rounded-full font-medium"
                        style={{ 
                          backgroundColor: '#fff',
                          color: effectiveTheme.primaryColor
                        }}
                      >
                        {categoryConfig.ctaText}
                      </button>
                    </div>
                  </div>

                  {/* Mini Products Grid */}
                  <div className="p-3" style={{ backgroundColor: effectiveTheme.backgroundColor }}>
                    <h3 
                      className="text-sm font-semibold mb-2"
                      style={{ color: effectiveTheme.foregroundColor }}
                    >
                      {data.products.length > 0 ? 'המוצרים שלך' : 'מוצרים לדוגמה'}
                    </h3>
                    <div className={cn(
                      "grid gap-2",
                      device === "mobile" ? "grid-cols-2" : "grid-cols-3"
                    )}>
                      {(data.products.length > 0 ? data.products.slice(0, device === "mobile" ? 4 : 6) : [
                        { id: '1', name: 'מוצר 1', price: 99 },
                        { id: '2', name: 'מוצר 2', price: 149 },
                        { id: '3', name: 'מוצר 3', price: 199 },
                        { id: '4', name: 'מוצר 4', price: 79 },
                      ]).map((product, i) => (
                        <div 
                          key={product.id || i}
                          className="rounded-lg overflow-hidden"
                          style={{ 
                            backgroundColor: effectiveTheme.cardColor,
                            borderRadius: effectiveTheme.borderRadius
                          }}
                        >
                          <div 
                            className={cn(
                              "bg-muted/50",
                              template.productCardStyle.aspectRatio === '3/4' && "aspect-[3/4]",
                              template.productCardStyle.aspectRatio === '1/1' && "aspect-square",
                              template.productCardStyle.aspectRatio === '4/3' && "aspect-[4/3]",
                            )}
                            style={{
                              backgroundImage: 'imageUrl' in product && product.imageUrl 
                                ? `url(${product.imageUrl})` 
                                : 'image' in product && product.image 
                                  ? `url(${URL.createObjectURL(product.image as File)})`
                                  : undefined,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              backgroundColor: effectiveTheme.mutedColor + '15',
                            }}
                          />
                          <div className="p-2">
                            <p 
                              className="text-[10px] font-medium truncate"
                              style={{ color: effectiveTheme.foregroundColor }}
                            >
                              {product.name}
                            </p>
                            <p 
                              className="text-[10px] font-bold"
                              style={{ color: effectiveTheme.primaryColor }}
                            >
                              ₪{product.price}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mini Footer */}
                  <div 
                    className="py-3 px-4 text-center border-t"
                    style={{ 
                      backgroundColor: effectiveTheme.cardColor,
                      borderColor: effectiveTheme.mutedColor + '20'
                    }}
                  >
                    <p 
                      className="text-[10px]"
                      style={{ color: effectiveTheme.mutedColor }}
                    >
                      © {new Date().getFullYear()} {data.businessName || 'שם העסק'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Template Info & Quick Selector */}
          <div className="p-4 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {/* Show brand colors if available, otherwise template color */}
                {hasBrandColors && data.extractedBranding?.colorPalette ? (
                  <div className="flex -space-x-1">
                    <div 
                      className="w-4 h-4 rounded-full border border-white"
                      style={{ backgroundColor: effectiveTheme.primaryColor }}
                    />
                    {data.extractedBranding.colorPalette.slice(0, 2).map((color, i) => (
                      <div 
                        key={i}
                        className="w-4 h-4 rounded-full border border-white"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                ) : (
                  <div 
                    className="w-4 h-4 rounded-full border"
                    style={{ backgroundColor: template.theme.primaryColor }}
                  />
                )}
                <span className="text-sm text-muted-foreground">
                  {hasBrandColors ? (
                    <>צבעי מותג מ<span className="font-medium text-foreground">ניתוח אתר</span></>
                  ) : (
                    <>תבנית: <span className="font-medium text-foreground">{template.name}</span></>
                  )}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setShowTemplateSelector(!showTemplateSelector)}
              >
                {showTemplateSelector ? 'סגור' : 'שנה תבנית'}
              </Button>
            </div>

            {/* Inline Template Selector + פלטת צבעים - פתוח בדיפולט */}
            {showTemplateSelector && (
              <div className="pt-3 border-t border-border space-y-4">
                {/* פלטת צבעים */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">צבע ראשי:</p>
                  <div className="flex flex-wrap gap-2">
                    {colorPresets.map((preset) => {
                      const currentPrimary = data.extractedBranding?.primaryColor ?? (editableFields.primaryColor || template.theme.primaryColor);
                      const isSelected = currentPrimary.toLowerCase() === preset.color.toLowerCase();
                      return (
                        <button
                          key={preset.color}
                          type="button"
                          onClick={() => {
                            setEditableFields(prev => ({ ...prev, primaryColor: preset.color }));
                            if (onUpdateData) {
                              onUpdateData({
                                extractedBranding: {
                                  ...data.extractedBranding,
                                  primaryColor: preset.color,
                                  brandStyle: data.extractedBranding?.brandStyle || 'modern',
                                  suggestedTagline: data.extractedBranding?.suggestedTagline || '',
                                  businessDescription: data.extractedBranding?.businessDescription || '',
                                  colorPalette: data.extractedBranding?.colorPalette || [preset.color],
                                }
                              });
                            }
                          }}
                          className={cn(
                            "w-9 h-9 rounded-lg transition-all border-2 flex-shrink-0",
                            isSelected ? "ring-2 ring-offset-2 ring-primary border-primary scale-110" : "border-transparent hover:scale-105 hover:border-muted-foreground/30"
                          )}
                          style={{ backgroundColor: preset.color }}
                          title={preset.name}
                        />
                      );
                    })}
                    {onUpdateData && (
                      <label className="w-9 h-9 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary/50 transition-colors cursor-pointer flex-shrink-0" title="צבע מותאם">
                        <input
                          type="color"
                          className="sr-only w-full h-full"
                          value={data.extractedBranding?.primaryColor ?? editableFields.primaryColor}
                          onChange={(e) => {
                            const v = e.target.value;
                            setEditableFields(prev => ({ ...prev, primaryColor: v }));
                            onUpdateData({
                              extractedBranding: {
                                ...data.extractedBranding,
                                primaryColor: v,
                                brandStyle: data.extractedBranding?.brandStyle || 'modern',
                                suggestedTagline: data.extractedBranding?.suggestedTagline || '',
                                businessDescription: data.extractedBranding?.businessDescription || '',
                                colorPalette: data.extractedBranding?.colorPalette || [v],
                              }
                            });
                          }}
                        />
                        <span className="text-xs">+</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* בחירת תבנית */}
                {onUpdateTemplate && (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">בחר תבנית:</p>
                    <div className="grid grid-cols-5 gap-2">
                      {templateList.map((t) => {
                        const isSelected = data.storeTemplate === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => handleTemplateChange(t.id)}
                            className={cn(
                              "relative rounded-lg overflow-hidden border-2 transition-all aspect-square",
                              isSelected ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-primary/30"
                            )}
                            title={t.name}
                          >
                            <div className="absolute inset-0" style={{ backgroundColor: t.theme.backgroundColor }}>
                              <div className="h-1/3" style={{ backgroundColor: t.theme.primaryColor }} />
                              <div className="p-1 flex gap-0.5">
                                <div className="w-1/2 aspect-square rounded-sm" style={{ backgroundColor: t.theme.cardColor }} />
                                <div className="w-1/2 aspect-square rounded-sm" style={{ backgroundColor: t.theme.cardColor }} />
                              </div>
                            </div>
                            {isSelected && (
                              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <Check className="w-4 h-4 text-primary" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Full Preview Dialog with Inline Editing */}
      <Dialog open={showFullPreview} onOpenChange={setShowFullPreview}>
        <DialogContent className="max-w-5xl h-[90vh] p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-4 border-b border-border bg-card">
              <h3 className="font-semibold text-foreground">תצוגה מקדימה</h3>
              <div className="flex items-center gap-3">
                {/* Device switcher */}
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                  <button
                    onClick={() => setDevice("desktop")}
                    className={cn(
                      "p-2 rounded-md transition-colors",
                      device === "desktop" 
                        ? "bg-background shadow-sm text-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Monitor className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDevice("mobile")}
                    className={cn(
                      "p-2 rounded-md transition-colors",
                      device === "mobile" 
                        ? "bg-background shadow-sm text-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Smartphone className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Edit button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setShowFullPreview(false);
                    setShowEditPanel(true);
                  }}
                >
                  <Palette className="h-4 w-4" />
                  ערוך טקסטים וצבעים
                </Button>
              </div>
            </div>
            
            {/* Full Preview Content - Complete Store Preview */}
            <div className="flex-1 bg-muted/50 overflow-auto">
              <div className="p-6 flex justify-center min-h-full">
                <div 
                  className={cn(
                    "bg-background overflow-hidden transition-all duration-300 shadow-xl",
                    device === "mobile" && "border-8 border-foreground/10 rounded-[2rem] w-[375px]",
                    device === "desktop" && "rounded-xl w-full max-w-[1100px]"
                  )}
                  style={templateStyles}
                >
                  {/* Complete Store Preview */}
                  <div className="overflow-hidden">
                    {/* Promo Bar */}
                    {editableFields.promoText && (
                      <div 
                        className="py-2 px-4 text-center text-sm"
                        style={{ 
                          backgroundColor: effectiveTheme.primaryColor,
                          color: '#fff'
                        }}
                      >
                        <span className="font-medium">
                          {editableFields.promoText}
                        </span>
                      </div>
                    )}
                    
                    {/* Header */}
                    <div 
                      className="py-4 px-6 border-b flex items-center justify-between"
                      style={{ 
                        backgroundColor: effectiveTheme.cardColor,
                        borderColor: effectiveTheme.mutedColor + '20'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {data.logo ? (
                          <img 
                            src={URL.createObjectURL(data.logo)} 
                            alt="Logo" 
                            className="w-12 h-12 rounded-xl object-cover shadow-sm"
                          />
                        ) : (
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm"
                            style={{ 
                              backgroundColor: effectiveTheme.primaryColor,
                              color: '#fff'
                            }}
                          >
                            {data.businessName?.charAt(0) || 'ק'}
                          </div>
                        )}
                        <div>
                          <span 
                            className="font-bold text-lg block"
                            style={{ color: effectiveTheme.foregroundColor }}
                          >
                            {data.businessName || 'שם העסק'}
                          </span>
                          <span 
                            className="text-sm"
                            style={{ color: effectiveTheme.mutedColor }}
                          >
                            {data.extractedBranding?.suggestedTagline || categoryConfig.tagline}
                          </span>
                        </div>
                      </div>
                      
                      {/* Navigation mock */}
                      <div className="flex items-center gap-4">
                        {categoryConfig.categories.slice(0, 3).map((cat, i) => (
                          <span 
                            key={i}
                            className="text-sm hover:underline cursor-pointer hidden md:block"
                            style={{ color: effectiveTheme.foregroundColor }}
                          >
                            {cat}
                          </span>
                        ))}
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: effectiveTheme.mutedColor + '20' }}
                        >
                          <span className="text-sm">🛒</span>
                        </div>
                      </div>
                    </div>

                    {/* Hero Section - Full width with all texts */}
                    <div 
                      className="relative overflow-hidden"
                      style={{ backgroundColor: effectiveTheme.primaryColor }}
                    >
                      {/* Hero image background */}
                      <div 
                        className="absolute inset-0"
                        style={{
                          backgroundImage: `url(${heroImageUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />
                      {/* Overlay */}
                      <div 
                        className="absolute inset-0"
                        style={{
                          background: `linear-gradient(135deg, ${effectiveTheme.primaryColor}CC, ${effectiveTheme.primaryColor}90)`,
                        }}
                      />
                      
                      {/* Hero content */}
                      <div className={cn(
                        "relative z-10 text-center",
                        device === "mobile" ? "py-12 px-4" : "py-20 px-8"
                      )}>
                        {/* Badge */}
                        <div 
                          className="inline-block px-4 py-1.5 rounded-full mb-4 text-sm font-medium"
                          style={{ 
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            color: '#fff'
                          }}
                        >
                          {editableFields.heroBadge || categoryConfig.heroBadge}
                        </div>
                        
                        {/* Main Title */}
                        <h1 
                          className={cn(
                            "font-bold mb-4",
                            device === "mobile" ? "text-2xl" : "text-4xl md:text-5xl"
                          )}
                          style={{ color: '#fff' }}
                        >
                          {editableFields.heroTitle || data.businessName || categoryConfig.tagline}
                        </h1>
                        
                        {/* Subtitle */}
                        <p 
                          className={cn(
                            "mb-6 opacity-90 max-w-xl mx-auto",
                            device === "mobile" ? "text-sm" : "text-lg"
                          )}
                          style={{ color: '#fff' }}
                        >
                          {data.extractedBranding?.businessDescription || 'ברוכים הבאים לחנות שלנו! כאן תמצאו את המוצרים הטובים ביותר במחירים הוגנים'}
                        </p>
                        
                        {/* CTA Button */}
                        <button
                          className={cn(
                            "rounded-full font-bold transition-all hover:scale-105",
                            device === "mobile" ? "px-6 py-3 text-sm" : "px-8 py-4 text-base"
                          )}
                          style={{ 
                            backgroundColor: '#fff',
                            color: effectiveTheme.primaryColor,
                            boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                          }}
                        >
                          {editableFields.ctaText || categoryConfig.ctaText}
                        </button>
                      </div>
                    </div>

                    {/* Products Section */}
                    <div 
                      className={cn(device === "mobile" ? "p-4" : "p-8")}
                      style={{ backgroundColor: effectiveTheme.backgroundColor }}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h2 
                          className={cn(
                            "font-bold",
                            device === "mobile" ? "text-xl" : "text-2xl"
                          )}
                          style={{ color: effectiveTheme.foregroundColor }}
                        >
                          {data.products.length > 0 ? 'המוצרים שלך' : 'המוצרים שלנו'}
                        </h2>
                        <span 
                          className="text-sm cursor-pointer hover:underline"
                          style={{ color: effectiveTheme.primaryColor }}
                        >
                          הצג הכל →
                        </span>
                      </div>
                      
                      <div className={cn(
                        "grid gap-4",
                        device === "mobile" ? "grid-cols-2" : "grid-cols-4"
                      )}>
                        {(data.products.length > 0 ? data.products.slice(0, device === "mobile" ? 4 : 8) : [
                          { id: '1', name: 'מוצר פופולרי 1', description: 'תיאור קצר של המוצר', price: 99 },
                          { id: '2', name: 'מוצר פופולרי 2', description: 'תיאור קצר של המוצר', price: 149 },
                          { id: '3', name: 'מוצר פופולרי 3', description: 'תיאור קצר של המוצר', price: 199 },
                          { id: '4', name: 'מוצר פופולרי 4', description: 'תיאור קצר של המוצר', price: 79 },
                          { id: '5', name: 'מוצר מומלץ 1', description: 'תיאור קצר של המוצר', price: 129 },
                          { id: '6', name: 'מוצר מומלץ 2', description: 'תיאור קצר של המוצר', price: 189 },
                          { id: '7', name: 'מוצר מומלץ 3', description: 'תיאור קצר של המוצר', price: 249 },
                          { id: '8', name: 'מוצר מומלץ 4', description: 'תיאור קצר של המוצר', price: 159 },
                        ]).map((product, i) => (
                          <div 
                            key={product.id || i}
                            className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                            style={{ 
                              backgroundColor: effectiveTheme.cardColor,
                              borderRadius: effectiveTheme.borderRadius
                            }}
                          >
                            <div 
                              className={cn(
                                "bg-muted/50 relative overflow-hidden",
                                template.productCardStyle.aspectRatio === '3/4' && "aspect-[3/4]",
                                template.productCardStyle.aspectRatio === '1/1' && "aspect-square",
                                template.productCardStyle.aspectRatio === '4/3' && "aspect-[4/3]",
                              )}
                              style={{
                                backgroundImage: 'imageUrl' in product && product.imageUrl 
                                  ? `url(${product.imageUrl})` 
                                  : 'image' in product && product.image 
                                    ? `url(${URL.createObjectURL(product.image as File)})`
                                    : undefined,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                backgroundColor: effectiveTheme.mutedColor + '15',
                              }}
                            >
                              {/* Quick add button */}
                              <div 
                                className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                style={{ backgroundColor: effectiveTheme.primaryColor }}
                              >
                                <span className="text-white text-lg">+</span>
                              </div>
                            </div>
                            <div className={cn(device === "mobile" ? "p-3" : "p-4")}>
                              <p 
                                className={cn(
                                  "font-medium truncate",
                                  device === "mobile" ? "text-sm" : "text-base"
                                )}
                                style={{ color: effectiveTheme.foregroundColor }}
                              >
                                {product.name}
                              </p>
                              {'description' in product && product.description && (
                                <p 
                                  className="text-xs mt-1 truncate"
                                  style={{ color: effectiveTheme.mutedColor }}
                                >
                                  {product.description}
                                </p>
                              )}
                              <p 
                                className={cn(
                                  "font-bold mt-2",
                                  device === "mobile" ? "text-sm" : "text-lg"
                                )}
                                style={{ color: effectiveTheme.primaryColor }}
                              >
                                ₪{product.price}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Info Section */}
                    <div 
                      className={cn(
                        "border-t",
                        device === "mobile" ? "p-4" : "p-8"
                      )}
                      style={{ 
                        backgroundColor: effectiveTheme.cardColor,
                        borderColor: effectiveTheme.mutedColor + '20'
                      }}
                    >
                      <div className={cn(
                        "grid gap-6",
                        device === "mobile" ? "grid-cols-1" : "grid-cols-3"
                      )}>
                        <div className="text-center">
                          <div 
                            className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                            style={{ backgroundColor: effectiveTheme.primaryColor + '15' }}
                          >
                            <span className="text-xl">🚚</span>
                          </div>
                          <h3 
                            className="font-semibold mb-1"
                            style={{ color: effectiveTheme.foregroundColor }}
                          >
                            משלוח מהיר
                          </h3>
                          <p 
                            className="text-sm"
                            style={{ color: effectiveTheme.mutedColor }}
                          >
                            עד 3 ימי עסקים
                          </p>
                        </div>
                        <div className="text-center">
                          <div 
                            className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                            style={{ backgroundColor: effectiveTheme.primaryColor + '15' }}
                          >
                            <span className="text-xl">💳</span>
                          </div>
                          <h3 
                            className="font-semibold mb-1"
                            style={{ color: effectiveTheme.foregroundColor }}
                          >
                            תשלום מאובטח
                          </h3>
                          <p 
                            className="text-sm"
                            style={{ color: effectiveTheme.mutedColor }}
                          >
                            כרטיסי אשראי וביט
                          </p>
                        </div>
                        <div className="text-center">
                          <div 
                            className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
                            style={{ backgroundColor: effectiveTheme.primaryColor + '15' }}
                          >
                            <span className="text-xl">↩️</span>
                          </div>
                          <h3 
                            className="font-semibold mb-1"
                            style={{ color: effectiveTheme.foregroundColor }}
                          >
                            החזרות קלות
                          </h3>
                          <p 
                            className="text-sm"
                            style={{ color: effectiveTheme.mutedColor }}
                          >
                            עד 14 יום להחזרה
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div 
                      className={cn(
                        "border-t",
                        device === "mobile" ? "py-6 px-4" : "py-8 px-8"
                      )}
                      style={{ 
                        backgroundColor: effectiveTheme.backgroundColor,
                        borderColor: effectiveTheme.mutedColor + '20'
                      }}
                    >
                      <div className={cn(
                        "flex flex-col items-center gap-4",
                        device === "desktop" && "md:flex-row md:justify-between"
                      )}>
                        <div className="flex items-center gap-3">
                          {data.logo ? (
                            <img 
                              src={URL.createObjectURL(data.logo)} 
                              alt="Logo" 
                              className="w-8 h-8 rounded-lg object-cover"
                            />
                          ) : (
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                              style={{ 
                                backgroundColor: effectiveTheme.primaryColor,
                                color: '#fff'
                              }}
                            >
                              {data.businessName?.charAt(0) || 'ק'}
                            </div>
                          )}
                          <span 
                            className="font-semibold"
                            style={{ color: effectiveTheme.foregroundColor }}
                          >
                            {data.businessName || 'שם העסק'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {data.phone && (
                            <span 
                              className="text-sm"
                              style={{ color: effectiveTheme.mutedColor }}
                            >
                              📞 {data.phone}
                            </span>
                          )}
                          {data.orderEmail && (
                            <span 
                              className="text-sm"
                              style={{ color: effectiveTheme.mutedColor }}
                            >
                              ✉️ {data.orderEmail}
                            </span>
                          )}
                        </div>
                        
                        <p 
                          className="text-sm"
                          style={{ color: effectiveTheme.mutedColor }}
                        >
                          © {new Date().getFullYear()} {data.businessName || 'שם העסק'} - כל הזכויות שמורות
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Panel Dialog */}
      <Dialog open={showEditPanel} onOpenChange={setShowEditPanel}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">התאמה אישית</h3>
              <p className="text-sm text-muted-foreground">ערוך את הטקסטים והצבעים של החנות</p>
            </div>

            <Tabs defaultValue="texts" className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="texts" className="gap-2">
                  <Type className="h-4 w-4" />
                  טקסטים
                </TabsTrigger>
                <TabsTrigger value="colors" className="gap-2">
                  <Palette className="h-4 w-4" />
                  צבעים
                </TabsTrigger>
              </TabsList>

              <TabsContent value="texts" className="space-y-4 mt-4">
                {/* Hero Title */}
                <div className="space-y-2">
                  <Label htmlFor="edit-heroTitle">כותרת ראשית</Label>
                  <Input
                    id="edit-heroTitle"
                    value={editableFields.heroTitle}
                    onChange={(e) => setEditableFields(prev => ({ ...prev, heroTitle: e.target.value }))}
                    placeholder={data.businessName || "שם העסק"}
                  />
                  <p className="text-xs text-muted-foreground">הכותרת הגדולה בראש החנות</p>
                </div>

                {/* Hero Badge */}
                <div className="space-y-2">
                  <Label htmlFor="edit-heroBadge">תג / Badge</Label>
                  <Input
                    id="edit-heroBadge"
                    value={editableFields.heroBadge}
                    onChange={(e) => setEditableFields(prev => ({ ...prev, heroBadge: e.target.value }))}
                    placeholder={categoryConfig.heroBadge}
                  />
                  <p className="text-xs text-muted-foreground">תג קטן מעל הכותרת</p>
                </div>

                {/* Promo Text */}
                <div className="space-y-2">
                  <Label htmlFor="edit-promoText" className="flex items-center gap-2">
                    <Megaphone className="h-4 w-4" />
                    טקסט פרומו
                  </Label>
                  <Textarea
                    id="edit-promoText"
                    value={editableFields.promoText}
                    onChange={(e) => setEditableFields(prev => ({ ...prev, promoText: e.target.value }))}
                    placeholder="משלוח חינם בהזמנה מעל ₪199"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">הודעה בפס העליון של החנות</p>
                </div>

                {/* CTA Text */}
                <div className="space-y-2">
                  <Label htmlFor="edit-ctaText">טקסט כפתור ראשי</Label>
                  <Input
                    id="edit-ctaText"
                    value={editableFields.ctaText}
                    onChange={(e) => setEditableFields(prev => ({ ...prev, ctaText: e.target.value }))}
                    placeholder={categoryConfig.ctaText}
                  />
                  <p className="text-xs text-muted-foreground">הטקסט בכפתור הראשי</p>
                </div>
              </TabsContent>

              <TabsContent value="colors" className="space-y-4 mt-4">
                {/* Primary Color */}
                <div className="space-y-3">
                  <Label>צבע ראשי</Label>
                  <div className="flex flex-wrap gap-2">
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.color}
                        type="button"
                        onClick={() => {
                          setEditableFields(prev => ({ ...prev, primaryColor: preset.color }));
                          if (onUpdateData) {
                            onUpdateData({
                              extractedBranding: {
                                ...data.extractedBranding,
                                primaryColor: preset.color,
                                brandStyle: data.extractedBranding?.brandStyle || 'modern',
                                suggestedTagline: data.extractedBranding?.suggestedTagline || '',
                                businessDescription: data.extractedBranding?.businessDescription || '',
                                colorPalette: data.extractedBranding?.colorPalette || [preset.color],
                              }
                            });
                          }
                        }}
                        className={cn(
                          "w-10 h-10 rounded-lg transition-all",
                          editableFields.primaryColor === preset.color 
                            ? "ring-2 ring-offset-2 ring-foreground scale-110" 
                            : "hover:scale-105"
                        )}
                        style={{ backgroundColor: preset.color }}
                        title={preset.name}
                      />
                    ))}
                    <div className="relative">
                      <input
                        type="color"
                        value={editableFields.primaryColor}
                        onChange={(e) => {
                          setEditableFields(prev => ({ ...prev, primaryColor: e.target.value }));
                          if (onUpdateData) {
                            onUpdateData({
                              extractedBranding: {
                                ...data.extractedBranding,
                                primaryColor: e.target.value,
                                brandStyle: data.extractedBranding?.brandStyle || 'modern',
                                suggestedTagline: data.extractedBranding?.suggestedTagline || '',
                                businessDescription: data.extractedBranding?.businessDescription || '',
                                colorPalette: data.extractedBranding?.colorPalette || [e.target.value],
                              }
                            });
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div 
                        className="w-10 h-10 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary/50 transition-colors"
                        title="בחר צבע מותאם"
                      >
                        +
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">הצבע הראשי יופיע בכפתורים וקישורים</p>
                </div>

                {/* Template Quick Change */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <Label>תבנית עיצוב</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {templateList.map((t) => {
                      const isSelected = data.storeTemplate === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            if (onUpdateTemplate) {
                              onUpdateTemplate(t.id);
                            }
                          }}
                          className={cn(
                            "relative rounded-lg overflow-hidden border-2 transition-all aspect-square",
                            isSelected 
                              ? "border-primary ring-2 ring-primary/20" 
                              : "border-transparent hover:border-primary/30"
                          )}
                          title={t.name}
                        >
                          <div 
                            className="absolute inset-0"
                            style={{ backgroundColor: t.theme.backgroundColor }}
                          >
                            <div 
                              className="h-1/3"
                              style={{ backgroundColor: t.theme.primaryColor }}
                            />
                          </div>
                          {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Check className="w-4 h-4 text-primary" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <Button 
              className="w-full" 
              onClick={() => setShowEditPanel(false)}
            >
              <Check className="w-4 h-4" />
              שמור שינויים
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OnboardingPreview;
