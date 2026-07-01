import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useUpdateBusiness } from "@/hooks/useBusiness";
import { storeTemplates, type StoreTemplateId, type StoreTemplate, getTemplate } from "@/lib/storeTemplates";
import { STORE_FONTS, loadStoreFonts } from "@/lib/storeFonts";
import { Check, Palette, Type } from "lucide-react";
import { toast } from "sonner";

interface DashboardDesignProps {
  businessId: string | undefined;
  currentTemplateId?: string | null;
}

// Real theme-based thumbnail: renders a mini-store using the template's OWN
// colors + hero layout, so the preview actually reflects what the store looks
// like (was random stock photos that felt disconnected / "not updating").
function TemplateThumb({ t }: { t: StoreTemplate }) {
  const { backgroundColor: bg, cardColor: card, primaryColor: primary, foregroundColor: fg, accentColor: accent } = t.theme;
  const layout = t.heroStyle.layout;
  return (
    <div className="w-full h-full flex flex-col" style={{ background: bg }}>
      {/* navbar */}
      <div className="h-4 flex items-center justify-between px-2 shrink-0" style={{ background: card }}>
        <div className="w-4 h-1.5 rounded-sm" style={{ background: primary }} />
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: fg, opacity: 0.3 }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: primary }} />
        </div>
      </div>
      {/* hero */}
      {layout === "split" ? (
        <div className="flex-1 flex" style={{ minHeight: 0 }}>
          <div className="w-1/2 flex flex-col justify-center gap-1 px-2" style={{ background: primary }}>
            <div className="w-8 h-1 rounded-sm bg-white/70" />
            <div className="w-10 h-1.5 rounded-sm bg-white/90" />
            <div className="w-6 h-1.5 rounded-sm mt-0.5" style={{ background: accent }} />
          </div>
          <div className="w-1/2" style={{ background: `linear-gradient(135deg, ${accent}, ${card})` }} />
        </div>
      ) : layout === "centered" ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-1" style={{ background: `linear-gradient(135deg, ${primary}22, ${accent}22)` }}>
          <div className="w-10 h-1.5 rounded-sm" style={{ background: fg }} />
          <div className="w-6 h-1 rounded-sm" style={{ background: primary }} />
          <div className="w-8 h-1.5 rounded-full mt-0.5" style={{ background: primary }} />
        </div>
      ) : (
        <div className="flex-1 relative" style={{ background: `linear-gradient(135deg, ${primary}, ${accent})` }}>
          <div className="absolute bottom-1 right-2 flex flex-col items-end gap-1">
            <div className="w-8 h-1.5 rounded-sm bg-white/90" />
            <div className="w-5 h-1 rounded-sm bg-white/60" />
          </div>
        </div>
      )}
      {/* product tiles */}
      <div className="h-8 grid grid-cols-3 gap-1 p-1 shrink-0" style={{ background: bg }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-sm flex flex-col justify-end p-0.5 overflow-hidden" style={{ background: card }}>
            <div className="w-full h-3 rounded-sm mb-0.5" style={{ background: `${accent}55` }} />
            <div className="w-4 h-1 rounded-sm" style={{ background: primary }} />
          </div>
        ))}
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
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Palette className="h-6 w-6" />
            עיצוב החנות
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            בחר תבנית עיצוב לחנות שלך
          </p>
        </div>
        {selectedTemplate !== currentTemplateId && (
          <Button onClick={handleSaveTemplate} disabled={updateBusiness.isPending}>
            {updateBusiness.isPending ? 'שומר...' : 'שמור שינויים'}
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
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2"><Type className="h-5 w-5" /> פונטים</h3>
          {fontsChanged && (
            <Button onClick={saveFonts} disabled={updateBusiness.isPending}>{updateBusiness.isPending ? "שומר..." : "שמור פונטים"}</Button>
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
    </div>
  );
}
