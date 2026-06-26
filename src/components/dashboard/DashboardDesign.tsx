import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useUpdateBusiness } from "@/hooks/useBusiness";
import { storeTemplates, type StoreTemplateId, getTemplate } from "@/lib/storeTemplates";
import { STORE_FONTS, loadStoreFonts } from "@/lib/storeFonts";
import { Check, Palette, Type } from "lucide-react";
import { toast } from "sonner";

interface DashboardDesignProps {
  businessId: string | undefined;
  currentTemplateId?: string | null;
}

export default function DashboardDesign({ businessId, currentTemplateId }: DashboardDesignProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<StoreTemplateId>(
    (currentTemplateId as StoreTemplateId) || 'bold-modern'
  );
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
              {/* Preview Image */}
              <div className="aspect-[4/3] bg-muted overflow-hidden">
                <img
                  src={template.previewImage}
                  alt={template.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
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
