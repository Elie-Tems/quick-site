import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useUpdateBusiness, useMyBusiness } from "@/hooks/useBusiness";
import { storeTemplates, layoutList, buildTemplate, type StoreTemplateId, type StoreTemplate, getTemplate } from "@/lib/storeTemplates";
import { getBusinessType } from "@/lib/businessModules";
import { STORE_FONTS, loadStoreFonts } from "@/lib/storeFonts";
import { Check, Palette, Type, ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface DashboardDesignProps {
  businessId: string | undefined;
  currentTemplateId?: string | null;
  businessSlug?: string;
}

const PALETTE_PRESETS = [
  { key: "purple", primary: "#7c3aed" },
  { key: "blue", primary: "#2563eb" },
  { key: "green", primary: "#16a34a" },
  { key: "orange", primary: "#ea580c" },
  { key: "pink", primary: "#db2777" },
  { key: "cyan", primary: "#0891b2" },
  { key: "black", primary: "#1a1a1a" },
  { key: "brown", primary: "#92400e" },
];

// Layout type labels shown as a chip on each template card
const LAYOUT_LABELS: Record<string, string> = {
  'split': 'פיצול',
  'centered': 'גרדיאנט',
  'full-image': 'תמונה מלאה',
};

// Mini-store thumbnail: communicates layout structure + color palette clearly.
function TemplateThumb({ t }: { t: StoreTemplate }) {
  const { backgroundColor: bg, cardColor: card, primaryColor: primary, foregroundColor: fg, accentColor: accent } = t.theme;
  const layout = t.heroStyle.layout;
  const r = '3px';

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: bg }}>

      {/* ── Navbar ── */}
      <div className="flex items-center justify-between px-2 shrink-0" style={{ height: '12px', background: card, borderBottom: `1px solid ${fg}20` }}>
        <div className="h-1.5 w-7 rounded-sm" style={{ background: primary }} />
        <div className="flex gap-1">
          {[6, 8, 5].map((w, i) => (
            <div key={i} className="h-1 rounded-sm" style={{ width: `${w}px`, background: `${fg}30` }} />
          ))}
        </div>
        <div className="flex gap-1">
          <div className="h-2 w-2 rounded-sm" style={{ background: `${fg}20` }} />
          <div className="h-2 w-2 rounded-sm" style={{ background: `${fg}20` }} />
        </div>
      </div>

      {/* ── Hero ── */}
      {layout === 'split' ? (
        <div className="flex shrink-0" style={{ height: '58px' }}>
          {/* Text side */}
          <div className="flex flex-col justify-center gap-1 px-2 shrink-0" style={{ width: '48%', background: primary }}>
            <div className="rounded-sm" style={{ height: '1.5px', width: '50%', background: 'rgba(255,255,255,0.45)' }} />
            <div className="rounded-sm" style={{ height: '3px', width: '85%', background: 'rgba(255,255,255,0.9)' }} />
            <div className="rounded-sm" style={{ height: '1.5px', width: '70%', background: 'rgba(255,255,255,0.5)' }} />
            <div className="rounded-sm mt-1" style={{ height: '6px', width: '46%', background: 'rgba(255,255,255,0.28)', borderRadius: r }}>
              <div className="h-full flex items-center justify-center">
                <div className="rounded-sm" style={{ height: '1.5px', width: '60%', background: 'rgba(255,255,255,0.75)' }} />
              </div>
            </div>
          </div>
          {/* Image side */}
          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0" style={{ background: `linear-gradient(140deg, ${accent}bb 0%, ${primary}55 60%, ${accent}33 100%)` }} />
            {/* Simulated photo shapes */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded" style={{ width: '55%', height: '70%', background: `${accent}40`, border: `1px solid ${accent}30` }} />
            </div>
          </div>
        </div>
      ) : layout === 'centered' ? (
        <div className="shrink-0 flex flex-col items-center justify-center gap-1 px-3" style={{ height: '58px', background: `linear-gradient(150deg, ${primary} 0%, ${accent}cc 100%)` }}>
          <div className="rounded-sm" style={{ height: '1.5px', width: '35%', background: 'rgba(255,255,255,0.55)' }} />
          <div className="rounded-sm" style={{ height: '3.5px', width: '70%', background: 'rgba(255,255,255,0.92)' }} />
          <div className="rounded-sm" style={{ height: '1.5px', width: '55%', background: 'rgba(255,255,255,0.5)' }} />
          <div className="rounded-full mt-1 flex items-center justify-center" style={{ height: '8px', width: '42%', background: 'rgba(255,255,255,0.25)' }}>
            <div className="rounded-sm" style={{ height: '1.5px', width: '55%', background: 'rgba(255,255,255,0.8)' }} />
          </div>
        </div>
      ) : (
        /* full-image */
        <div className="shrink-0 relative flex flex-col justify-end pb-2 px-2" style={{ height: '58px' }}>
          <div className="absolute inset-0" style={{ background: `linear-gradient(150deg, ${accent}cc, ${primary}99)` }} />
          <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${Math.min(t.heroStyle.overlayOpacity + 0.1, 0.55)})` }} />
          <div className="relative flex flex-col gap-0.5" style={{ alignItems: t.heroStyle.textAlignment === 'center' ? 'center' : 'flex-end' }}>
            <div className="rounded-sm" style={{ height: '1.5px', width: '38%', background: 'rgba(255,255,255,0.6)' }} />
            <div className="rounded-sm" style={{ height: '3px', width: '62%', background: 'rgba(255,255,255,0.92)' }} />
            <div className="rounded-sm mt-0.5" style={{ height: '5px', width: '35%', background: 'rgba(255,255,255,0.22)', borderRadius: r }}>
              <div className="h-full flex items-center justify-center">
                <div className="rounded-sm" style={{ height: '1.5px', width: '55%', background: 'rgba(255,255,255,0.7)' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Category tabs ── */}
      <div className="flex gap-1.5 px-2 shrink-0" style={{ height: '10px', background: bg, borderBottom: `1px solid ${fg}12`, alignItems: 'flex-end', paddingBottom: '2px' }}>
        {['הכל', 'חדש', 'מומלץ'].map((_, i) => (
          <div key={i} className="rounded-sm" style={{ height: i === 0 ? '4px' : '3px', width: i === 0 ? '14px' : '10px', background: i === 0 ? primary : `${fg}22`, borderRadius: '1px' }} />
        ))}
      </div>

      {/* ── Products grid ── */}
      <div className="flex-1 overflow-hidden" style={{ background: bg, padding: '4px 4px 3px' }}>
        <div className="grid grid-cols-3 gap-1 h-full">
          {[0, 1, 2].map((i) => {
            const imgColor = i === 0 ? accent : i === 1 ? primary : `${accent}bb`;
            return (
              <div key={i} className="flex flex-col overflow-hidden" style={{ background: card, borderRadius: r, border: `1px solid ${fg}12` }}>
                {/* Image area with diagonal gradient to simulate photo */}
                <div className="flex-1" style={{ background: `linear-gradient(135deg, ${imgColor}55 0%, ${imgColor}22 50%, ${imgColor}44 100%)`, minHeight: '14px', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: '20%', background: `${imgColor}35`, borderRadius: '1px' }} />
                </div>
                {/* Product info lines */}
                <div style={{ padding: '2px 3px 3px' }}>
                  <div className="rounded-sm mb-0.5" style={{ height: '2px', width: '80%', background: `${fg}38` }} />
                  <div className="rounded-sm" style={{ height: '1.5px', width: '45%', background: primary }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function DashboardDesign({ businessId, currentTemplateId, businessSlug }: DashboardDesignProps) {
  const { t } = useLanguage();
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
      toast.success(t("dash.design.toast_fonts_updated"));
      setHasUnsavedChanges(false);
    } catch { toast.error(t("dash.design.toast_fonts_error")); }
  };

  const { data: biz } = useMyBusiness();
  const [heroImageUrl, setHeroImageUrl] = useState<string>("");
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const heroImageInputRef = useRef<HTMLInputElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [primaryColor, setPrimaryColor] = useState("");
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");
  const [heroOnly, setHeroOnly] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if ((biz as any)?.hero_image_url) setHeroImageUrl((biz as any).hero_image_url);
  }, [(biz as any)?.hero_image_url]);

  // Send postMessage to iframe preview whenever relevant state changes.
  // Includes templateId so the storefront can switch layout without saving.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const headingFont = STORE_FONTS.find(f => f.id === fontHeading)?.family;
    const bodyFont = STORE_FONTS.find(f => f.id === fontBody)?.family;
    iframe.contentWindow?.postMessage(
      {
        type: "DESIGN_PREVIEW",
        templateId: selectedTemplate,
        primaryColor,
        theme: previewTheme,
        headingFont: headingFont || undefined,
        bodyFont: bodyFont || undefined,
      },
      "*"
    );
  }, [selectedTemplate, primaryColor, previewTheme, fontHeading, fontBody]);

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("dash.design.toast_image_type_error"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("dash.design.toast_image_size_error"));
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
      toast.success(t("dash.design.toast_hero_updated"));
    } catch (err: any) {
      toast.error(err.message || t("dash.design.toast_upload_error"));
    } finally {
      setIsUploadingHero(false);
      if (heroImageInputRef.current) heroImageInputRef.current.value = "";
    }
  };

  const handleSaveTemplate = async () => {
    if (!businessId) {
      toast.error(t("dash.design.toast_no_business_id"));
      return;
    }

    try {
      await updateBusiness.mutateAsync({
        id: businessId,
        template_id: selectedTemplate,
      });
      toast.success(t("dash.design.toast_template_updated"));
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error(t("dash.design.toast_template_error"));
    }
  };

  // Legacy commerce templates never include the property/service layouts, so a
  // business whose vertical isn't plain "products" would only ever be offered
  // shopping-store templates. Surface the layout(s) suited to this business's
  // type first (built fresh from storeLayouts, which does include "property"),
  // then the legacy grid for everyone else / extra choice.
  const businessType = biz ? getBusinessType(biz as any) : undefined;
  const suitedLayouts = businessType
    ? layoutList.filter((l) => l.suitedFor.includes(businessType as any))
    : [];
  const templateList = [
    ...suitedLayouts.map((l) => buildTemplate(l.id, l.defaultPalette)),
    ...Object.values(storeTemplates),
  ];
  const storeUrl = businessSlug ? `${window.location.origin}/${businessSlug}?preview=1` : "about:blank";

  const hasChanges = selectedTemplate !== currentTemplateId || hasUnsavedChanges;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left panel: controls ── */}
      <div className="w-80 shrink-0 border-l border-border flex flex-col bg-card">
        {/* Sticky header + save button */}
        <div className="p-4 pb-3 border-b border-border shrink-0">
          <h1 className="text-base font-semibold text-foreground flex items-center gap-2 mb-0.5">
            <Palette className="h-5 w-5" />
            {t("dash.design.heading")}
          </h1>
          <p className="text-xs text-muted-foreground mb-3">
            {t("dash.design.subtitle")}
          </p>
          <Button
            className="w-full"
            onClick={handleSaveTemplate}
            disabled={updateBusiness.isPending || !hasChanges}
            variant={hasChanges ? "default" : "outline"}
          >
            {updateBusiness.isPending ? t("dash.design.saving") : t("dash.design.save_changes")}
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">

          {/* ── Palette presets + custom color picker ── */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">{t("dash.design.primary_color_label")}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {PALETTE_PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  title={t(`dash.design.color_${p.key}`)}
                  onClick={() => { setPrimaryColor(p.primary); setHasUnsavedChanges(true); }}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${primaryColor === p.primary ? "border-foreground scale-110" : "border-transparent hover:scale-105"}`}
                  style={{ backgroundColor: p.primary }}
                />
              ))}
            </div>
            {/* Color wheel + hex input */}
            <div className="flex items-center gap-2">
              <label className="relative cursor-pointer" title={t("dash.design.custom_color_title")}>
                <input
                  type="color"
                  value={primaryColor || "#16a34a"}
                  onChange={e => { setPrimaryColor(e.target.value); setHasUnsavedChanges(true); }}
                  className="sr-only"
                />
                <div
                  className="w-8 h-8 rounded-full border-2 border-border flex items-center justify-center text-[10px] font-bold text-white shadow-sm hover:scale-105 transition-transform"
                  style={{ background: `conic-gradient(red, yellow, lime, cyan, blue, magenta, red)` }}
                  title={t("dash.design.pick_color_title")}
                />
              </label>
              <input
                type="text"
                value={primaryColor}
                onChange={e => {
                  const v = e.target.value.trim();
                  setPrimaryColor(v);
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) setHasUnsavedChanges(true);
                }}
                placeholder="#16a34a"
                maxLength={7}
                dir="ltr"
                className="flex-1 h-8 rounded-lg border border-border bg-background px-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
              {primaryColor && /^#[0-9a-fA-F]{6}$/.test(primaryColor) && (
                <div className="w-8 h-8 rounded-lg border border-border shrink-0" style={{ backgroundColor: primaryColor }} />
              )}
            </div>
          </div>

          {/* ── Fonts ── */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Type className="h-4 w-4" /> {t("dash.design.fonts_heading")}</h3>
              {fontsChanged && (
                <Button size="sm" onClick={saveFonts} disabled={updateBusiness.isPending}>{updateBusiness.isPending ? t("dash.design.saving") : t("dash.design.save")}</Button>
              )}
            </div>

            {/* Live font preview */}
            <div className="rounded-lg border border-border bg-background p-3 mb-3 text-center">
              <div className="text-base font-bold text-foreground mb-0.5" style={{ fontFamily: STORE_FONTS.find(f => f.id === fontHeading)?.family }}>{t("dash.design.font_preview_heading")}</div>
              <div className="text-xs text-muted-foreground" style={{ fontFamily: STORE_FONTS.find(f => f.id === fontBody)?.family }}>{t("dash.design.font_preview_body")}</div>
            </div>

            {([
              { label: t("dash.design.font_headings_label"), val: fontHeading, set: setFontHeading },
              { label: t("dash.design.font_body_label"), val: fontBody, set: setFontBody },
            ] as const).map(({ label, val, set }) => (
              <div key={label} className="mb-3">
                <div className="text-xs font-medium text-foreground mb-1.5">{label}</div>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => { set(""); setHasUnsavedChanges(true); }} className={`px-2 py-1.5 rounded-md border text-xs transition-colors ${!val ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>{t("dash.design.font_default")}</button>
                  {STORE_FONTS.map((f) => (
                    <button key={f.id} onClick={() => { set(f.id); setHasUnsavedChanges(true); }} style={{ fontFamily: f.family }}
                      className={`px-2 py-1.5 rounded-md border text-xs transition-colors ${val === f.id ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                      {f.preview}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── Templates Grid ── */}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t("dash.design.template_label")}</p>
            <div className="grid grid-cols-2 gap-2">
              {templateList.map((template) => {
                const isSelected = selectedTemplate === template.id;
                const isCurrent = currentTemplateId === template.id;
                const layoutLabel = LAYOUT_LABELS[template.heroStyle.layout];
                const [layoutName, colorName] = template.name.split(' · ');

                return (
                  <button
                    key={template.id}
                    onClick={() => { setSelectedTemplate(template.id); setHasUnsavedChanges(true); }}
                    className={`relative group rounded-xl border-2 overflow-hidden transition-all hover:shadow-md ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="aspect-[4/3] overflow-hidden">
                      <TemplateThumb t={template} />
                    </div>
                    <div className="absolute top-1.5 right-1.5">
                      <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.45)', color: 'white', backdropFilter: 'blur(4px)' }}>
                        {layoutLabel}
                      </span>
                    </div>
                    {(isSelected || isCurrent) && (
                      <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    <div className="p-1.5 bg-card">
                      <p className="text-[11px] font-semibold text-foreground leading-tight truncate">{layoutName}</p>
                      {colorName && (
                        <p className="text-[10px] text-muted-foreground truncate">{colorName}</p>
                      )}
                      {isCurrent && !isSelected && (
                        <span className="text-[9px] text-primary font-medium">{t("dash.design.badge_active")}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Hero Image ── */}
          <div className="border-t border-border pt-4 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <ImagePlus className="h-4 w-4" />
                {t("dash.design.hero_heading")}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("dash.design.hero_subtitle")}
              </p>
            </div>

            {heroImageUrl && (
              <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                <img src={heroImageUrl} alt="Hero" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={async () => {
                    setHeroImageUrl("");
                    if (!businessId) return;
                    try {
                      await updateBusiness.mutateAsync({ id: businessId, hero_image_url: null } as any);
                      toast.success(t("dash.design.toast_hero_removed"));
                    } catch (err: any) {
                      toast.error(err.message || t("dash.design.toast_hero_remove_error"));
                    }
                  }}
                  className="absolute top-1.5 left-1.5 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div>
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
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {t("dash.design.uploading")}
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-3.5 w-3.5" />
                      {t("dash.design.upload_from_computer")}
                    </>
                  )}
                </Button>
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={heroImageUrl}
                  onChange={(e) => setHeroImageUrl(e.target.value)}
                  placeholder={t("dash.design.hero_url_placeholder")}
                  dir="ltr"
                  className="flex-1 h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-sm"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs px-2.5"
                  onClick={async () => {
                    if (!businessId) return;
                    try {
                      await updateBusiness.mutateAsync({ id: businessId, hero_image_url: heroImageUrl || null } as any);
                      toast.success(t("dash.design.toast_hero_updated"));
                    } catch (err: any) {
                      toast.error(err.message || t("dash.design.toast_hero_save_error"));
                    }
                  }}
                >
                  {t("dash.design.save")}
                </Button>
              </div>
            </div>
          </div>

          {/* Info tip */}
          <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">💡 {t("dash.design.tip_label")}</p>
            <ul className="space-y-0.5 mr-3">
              <li>• {t("dash.design.tip_1")}</li>
              <li>• {t("dash.design.tip_2")}</li>
            </ul>
          </div>
        </div>{/* end scrollable content */}
      </div>

      {/* ── Right panel: live iframe preview ── */}
      <div className="flex-1 flex flex-col bg-muted/20">
        {/* Control bar */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2 bg-card shrink-0">
          <span className="text-xs text-muted-foreground">{t("dash.design.live_preview_label")}</span>
          <div className="flex gap-1 mr-auto flex-wrap">
            {/* Hero / Full toggle */}
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                onClick={() => setHeroOnly(true)}
                className={`px-2 py-1 text-xs transition-colors ${heroOnly ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted/50"}`}
              >
                כניסה לאתר
              </button>
              <button
                onClick={() => setHeroOnly(false)}
                className={`px-2 py-1 text-xs transition-colors ${!heroOnly ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted/50"}`}
              >
                כל הדף
              </button>
            </div>
            {/* Light / Dark toggle */}
            <button
              onClick={() => setPreviewTheme("light")}
              className={`rounded px-2 py-1 text-xs transition-colors ${previewTheme === "light" ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50"}`}
            >
              ☀️
            </button>
            <button
              onClick={() => setPreviewTheme("dark")}
              className={`rounded px-2 py-1 text-xs transition-colors ${previewTheme === "dark" ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50"}`}
            >
              🌙
            </button>
          </div>
        </div>

        {/* iframe wrapper — hero-only clips the top ~380px at 1:1 scale */}
        <div className="flex-1 relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={heroOnly ? {
              overflow: 'hidden',
            } : {}}
          >
            <iframe
              ref={iframeRef}
              src={storeUrl}
              title={t("dash.design.iframe_title")}
              style={heroOnly ? {
                width: '100%',
                height: '100%',
                border: 'none',
                clipPath: 'inset(0 0 0 0)',
              } : {
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
            {/* In hero-only mode, a fade at the bottom signals more content below */}
            {heroOnly && (
              <div
                className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-4 pointer-events-none"
                style={{ height: '120px', background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.12))' }}
              >
                <span className="text-xs text-white/70 bg-black/30 px-3 py-1 rounded-full pointer-events-auto cursor-pointer select-none" onClick={() => setHeroOnly(false)}>
                  לחץ לצפייה בכל הדף ↓
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
