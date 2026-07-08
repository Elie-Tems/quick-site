import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useUpdateBusiness, useMyBusiness } from "@/hooks/useBusiness";
import { storeTemplates, type StoreTemplateId, type StoreTemplate, getTemplate } from "@/lib/storeTemplates";
import { STORE_FONTS, loadStoreFonts } from "@/lib/storeFonts";
import { Check, Palette, Type, ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DashboardDesignProps {
  businessId: string | undefined;
  currentTemplateId?: string | null;
}

// Realistic mini-store thumbnail: looks like an actual storefront so merchants
// can understand the vibe at a glance without needing to imagine.
function TemplateThumb({ t }: { t: StoreTemplate }) {
  const { backgroundColor: bg, cardColor: card, primaryColor: primary, foregroundColor: fg, accentColor: accent, borderRadius } = t.theme;
  const layout = t.heroStyle.layout;
  // Scale down border-radius for the tiny preview
  const r = parseInt(borderRadius) > 12 ? '6px' : parseInt(borderRadius) > 6 ? '3px' : parseInt(borderRadius) > 0 ? '2px' : '0px';
  const productColors = [accent, primary, `${accent}99`];

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: bg }}>

      {/* ── Navbar ── */}
      <div className="flex items-center justify-between px-2 shrink-0" style={{ height: '14px', background: card, borderBottom: `1px solid ${fg}15` }}>
        {/* Logo */}
        <div className="h-2 w-8 rounded-sm" style={{ background: primary, borderRadius: '1px' }} />
        {/* Nav links */}
        <div className="flex gap-1">
          {[3, 4, 3].map((w, i) => (
            <div key={i} className="h-1 rounded-sm" style={{ width: `${w * 2}px`, background: `${fg}28` }} />
          ))}
        </div>
        {/* Cart icon placeholder */}
        <div className="h-2.5 w-2.5 rounded-sm" style={{ background: `${fg}18` }} />
      </div>

      {/* ── Hero ── */}
      {layout === 'split' ? (
        <div className="flex shrink-0" style={{ height: '54px' }}>
          <div className="w-[46%] flex flex-col justify-center gap-0.5 px-2 shrink-0" style={{ background: primary }}>
            <div className="h-1 rounded-sm bg-white/40" style={{ width: '55%' }} />
            <div className="h-1.5 rounded-sm bg-white/85" style={{ width: '80%' }} />
            <div className="h-2 mt-1 flex items-center px-1.5 rounded-sm" style={{ width: '50%', background: 'rgba(255,255,255,0.25)', borderRadius: r }}>
              <div className="h-0.5 w-full rounded-sm bg-white/70" />
            </div>
          </div>
          <div className="flex-1" style={{ background: `linear-gradient(135deg, ${accent}cc 0%, ${primary}44 100%)` }} />
        </div>
      ) : layout === 'centered' ? (
        <div className="shrink-0 flex flex-col items-center justify-center gap-0.5 px-2" style={{ height: '54px', background: `linear-gradient(160deg, ${primary}ee, ${accent}99)` }}>
          <div className="h-1 rounded-sm bg-white/50" style={{ width: '40%' }} />
          <div className="h-1.5 rounded-sm bg-white/90" style={{ width: '65%' }} />
          <div className="h-2 mt-1 flex items-center justify-center px-2 rounded-full" style={{ width: '38%', background: 'rgba(255,255,255,0.3)' }}>
            <div className="h-0.5 w-full rounded-sm bg-white/80" />
          </div>
        </div>
      ) : (
        <div className="shrink-0 relative flex flex-col justify-end pb-2 px-2" style={{ height: '54px', background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${Math.min(t.heroStyle.overlayOpacity + 0.15, 0.6)})` }} />
          <div className="relative flex flex-col gap-0.5" style={{ alignItems: t.heroStyle.textAlignment === 'center' ? 'center' : t.heroStyle.textAlignment === 'left' ? 'flex-start' : 'flex-end' }}>
            <div className="h-1 rounded-sm bg-white/55" style={{ width: '40%' }} />
            <div className="h-1.5 rounded-sm bg-white/90" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {/* ── Products section ── */}
      <div className="flex-1 overflow-hidden" style={{ background: bg, padding: '5px 5px 4px' }}>
        {/* Section label */}
        <div className="h-1 w-10 mb-1.5 rounded-sm" style={{ background: `${fg}22` }} />
        <div className="grid grid-cols-3 gap-1" style={{ height: 'calc(100% - 10px)' }}>
          {productColors.map((color, i) => (
            <div key={i} className="flex flex-col overflow-hidden" style={{ background: card, borderRadius: r, border: `1px solid ${fg}10` }}>
              {/* Product image area */}
              <div className="flex-1" style={{ background: `linear-gradient(150deg, ${color}40, ${color}18)`, minHeight: '16px' }}>
                {/* subtle product shape */}
                <div className="w-full h-full flex items-center justify-center">
                  <div className="rounded-sm" style={{ width: '55%', height: '55%', background: `${color}55` }} />
                </div>
              </div>
              {/* Product info */}
              <div style={{ padding: '3px 4px 4px' }}>
                <div className="rounded-sm mb-1" style={{ height: '2px', width: '78%', background: `${fg}35` }} />
                <div className="rounded-sm" style={{ height: '2px', width: '44%', background: primary }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardDesign({ businessId, currentTemplateId }: DashboardDesignProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<StoreTemplateId>(
    (currentTemplateId && storeTemplates[currentTemplateId as StoreTemplateId]
      ? (currentTemplateId as StoreTemplateId)
      : 'luxury-boutique')
  );
  // Keep local selection in sync if the saved template loads/changes after mount.
  useEffect(() => {
    if (currentTemplateId && storeTemplates[currentTemplateId as StoreTemplateId]) {
      setSelectedTemplate(currentTemplateId as StoreTemplateId);
    }
  }, [currentTemplateId]);
  const updateBusiness = useUpdateBusiness();

  // ── Per-store fonts (heading + body) ──
  const [fontHeading, setFontHeading] = useState<string>("");
  const [fontBody, setFontBody] = useState<string>("");
  const { data: fonts } = useQuery({
    queryKey: ["biz-fonts", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await (supabase as any).from("businesses").select("font_heading, font_body").eq("id", businessId).maybeSingle();
      return data as { font_heading: string | null; font_body: string | null } | null;
    },
  });
  useEffect(() => { if (fonts) { setFontHeading(fonts.font_heading || ""); setFontBody(fonts.font_body || ""); } }, [fonts]);
  useEffect(() => { loadStoreFonts(fontHeading, fontBody); }, [fontHeading, fontBody]);

  const fontsChanged = (fonts?.font_heading || "") !== fontHeading || (fonts?.font_body || "") !== fontBody;
  const saveFonts = async () => {
    if (!businessId) return;
    try {
      await updateBusiness.mutateAsync({ id: businessId, font_heading: fontHeading || null, font_body: fontBody || null } as any);
      toast.success("הפונטים עודכנו! מתעדכן בחנות שלך.");
    } catch { toast.error("שגיאה בשמירת הפונטים"); }
  };

  const { data: biz } = useMyBusiness();
  const [heroImageUrl, setHeroImageUrl] = useState<string>("");
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const heroImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ((biz as any)?.hero_image_url) setHeroImageUrl((biz as any).hero_image_url);
  }, [(biz as any)?.hero_image_url]);

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    if (!file.type.startsWith("image/")) {
      toast.error("יש להעלות קובץ תמונה בלבד (JPG, PNG, WEBP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("גודל הקובץ המקסימלי הוא 5MB");
      return;
    }
    setIsUploadingHero(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `hero-${Date.now()}.${fileExt}`;
      const filePath = `${businessId}/branding/${fileName}`;
      const { error } = await supabase.storage.from("business-assets").upload(filePath, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("business-assets").getPublicUrl(filePath);
      setHeroImageUrl(data.publicUrl);
      await updateBusiness.mutateAsync({ id: businessId, hero_image_url: data.publicUrl } as any);
      toast.success("תמונת הבאנר עודכנה!");
    } catch (err: any) {
      toast.error(err.message || "שגיאה בהעלאה");
    } finally {
      setIsUploadingHero(false);
      if (heroImageInputRef.current) heroImageInputRef.current.value = "";
    }
  };

  const handleSaveTemplate = async () => {
    if (!businessId) {
      toast.error('לא נמצא מזהה עסק');
      return;
    }

    try {
      await updateBusiness.mutateAsync({
        id: businessId,
        template_id: selectedTemplate,
      });
      toast.success('התבנית עודכנה בהצלחה!');
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('שגיאה בעדכון התבנית');
    }
  };

  const templateList = Object.values(storeTemplates);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Palette className="h-6 w-6" />
            עיצוב החנות
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            בחר תבנית עיצוב לחנות שלך
          </p>
        </div>
        {selectedTemplate !== currentTemplateId && (
          <Button onClick={handleSaveTemplate} disabled={updateBusiness.isPending}>
            {updateBusiness.isPending ? 'שומר...' : 'שמרו שינויים'}
          </Button>
        )}
      </div>

      {/* Current Template Info */}
      {currentTemplateId && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-foreground">
                תבנית נוכחית: {getTemplate(currentTemplateId as StoreTemplateId).name}
              </p>
              <p className="text-sm text-muted-foreground">
                {getTemplate(currentTemplateId as StoreTemplateId).description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {templateList.map((template) => {
          const isSelected = selectedTemplate === template.id;
          const isCurrent = currentTemplateId === template.id;

          return (
            <button
              key={template.id}
              onClick={() => setSelectedTemplate(template.id)}
              className={`relative group rounded-lg border-2 overflow-hidden transition-all hover:shadow-lg ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {/* Preview - real theme-based thumbnail (matches the actual store) */}
              <div className="aspect-[4/3] overflow-hidden">
                <TemplateThumb t={template} />
              </div>

              {/* Template Info */}
              <div className="p-2.5 bg-card">
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex-1 text-right">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5 justify-end">
                      {template.name}
                      {isCurrent && (
                        <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                          פעיל
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Color Preview */}
                <div className="flex gap-1.5 mt-2">
                  <div
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: template.theme.primaryColor }}
                    title="צבע ראשי"
                  />
                  <div
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: template.theme.accentColor }}
                    title="צבע משני"
                  />
                  <div
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: template.theme.backgroundColor }}
                    title="רקע"
                  />
                </div>
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground rounded-full p-1.5">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Fonts ── */}
      <div className="border-t border-border pt-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2"><Type className="h-5 w-5" /> פונטים</h3>
          {fontsChanged && (
            <Button onClick={saveFonts} disabled={updateBusiness.isPending}>{updateBusiness.isPending ? "שומר..." : "שמרו פונטים"}</Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">בחרו פונט נפרד לכותרות ולטקסט - שליטה מדויקת על הסגנון של החנות.</p>

        {/* Live preview */}
        <div className="rounded-xl border border-border bg-card p-5 mb-5 text-center">
          <div className="text-2xl font-bold text-foreground mb-1" style={{ fontFamily: STORE_FONTS.find(f => f.id === fontHeading)?.family }}>הכותרת של החנות שלי</div>
          <div className="text-sm text-muted-foreground" style={{ fontFamily: STORE_FONTS.find(f => f.id === fontBody)?.family }}>וכך ייראה הטקסט הרגיל בחנות - תיאורי מוצרים, מחירים והכל. נקי, ברור ומקצועי.</div>
        </div>

        {([["כותרות", fontHeading, setFontHeading], ["טקסט (גוף)", fontBody, setFontBody]] as const).map(([label, val, set]) => (
          <div key={label} className="mb-5">
            <div className="text-sm font-medium text-foreground mb-2">{label}</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => set("")} className={`px-3 py-2 rounded-lg border text-sm transition-colors ${!val ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>ברירת מחדל</button>
              {STORE_FONTS.map((f) => (
                <button key={f.id} onClick={() => set(f.id)} style={{ fontFamily: f.family }}
                  className={`px-3 py-2 rounded-lg border text-sm transition-colors ${val === f.id ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {f.preview} <span className="text-xs opacity-60">· {f.label.split(" · ")[1] || f.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="bg-muted/30 rounded-xl p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-2">💡 טיפ:</p>
        <ul className="space-y-1 mr-4">
          <li>• כל תבנית כוללת ערכת צבעים, פונטים ועיצוב ייחודיים</li>
          <li>• ניתן להחליף תבנית בכל עת ללא השפעה על המוצרים והתוכן</li>
          <li>• התבנית תשפיע על מראה החנות הציבורית שלך</li>
        </ul>
      </div>

      {/* Hero Image Section */}
      <div className="border-t border-border pt-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            תמונת רקע ראשית
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            תמונה שתופיע בחלק העליון של החנות - ניתן להעלות מהמחשב או להדביק קישור
          </p>
        </div>

        {heroImageUrl && (
          <div className="relative aspect-video max-w-sm rounded-lg overflow-hidden bg-muted">
            <img src={heroImageUrl} alt="Hero" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setHeroImageUrl("")}
              className="absolute top-2 left-2 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              ref={heroImageInputRef}
              type="file"
              accept="image/*"
              onChange={handleHeroImageUpload}
              className="hidden"
              id="hero-upload-design"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => heroImageInputRef.current?.click()}
              disabled={isUploadingHero}
              className="w-full gap-2"
            >
              {isUploadingHero ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  מעלה תמונה...
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4" />
                  העלה מהמחשב
                </>
              )}
            </Button>
          </div>

          <div className="flex-[2] flex gap-2">
            <input
              type="url"
              value={heroImageUrl}
              onChange={(e) => setHeroImageUrl(e.target.value)}
              placeholder="או הדבק URL לתמונה"
              dir="ltr"
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                if (!businessId) return;
                try {
                  await updateBusiness.mutateAsync({ id: businessId, hero_image_url: heroImageUrl || null } as any);
                  toast.success("תמונת הבאנר עודכנה!");
                } catch (err: any) {
                  toast.error(err.message || "שגיאה בשמירה");
                }
              }}
            >
              שמור
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
