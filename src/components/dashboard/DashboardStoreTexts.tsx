import { useState, useEffect } from "react";
import { useMyBusiness, useUpdateBusiness } from "@/hooks/useBusiness";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DashboardStoreTexts = () => {
  const { data: biz } = useMyBusiness();
  const updateBusiness = useUpdateBusiness();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [heroTitle, setHeroTitle] = useState("");
  const [heroBadge, setHeroBadge] = useState("");
  const [promoText, setPromoText] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [heroBenefits, setHeroBenefits] = useState(["", "", ""]);

  const [useHeroTitle, setUseHeroTitle] = useState(false);
  const [useHeroBadge, setUseHeroBadge] = useState(false);
  const [usePromoText, setUsePromoText] = useState(false);
  const [useCtaText, setUseCtaText] = useState(false);
  const [useHeroBenefits, setUseHeroBenefits] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!biz) return;
    setHeroTitle(biz.hero_title ?? "");
    setHeroBadge(biz.hero_badge ?? "");
    setPromoText(biz.promo_text ?? "");
    setCtaText(biz.cta_text ?? "");
    const benefits = Array.isArray((biz as any).hero_benefits) ? (biz as any).hero_benefits as string[] : [];
    setHeroBenefits([benefits[0] ?? "", benefits[1] ?? "", benefits[2] ?? ""]);

    setUseHeroTitle(biz.hero_title !== "" && biz.hero_title !== null);
    setUseHeroBadge(!!biz.hero_badge);
    setUsePromoText(!!biz.promo_text);
    setUseCtaText(biz.cta_text != null);
    setUseHeroBenefits(Array.isArray((biz as any).hero_benefits) && ((biz as any).hero_benefits as string[]).length > 0);
  }, [biz]);

  const handleSave = async () => {
    if (!biz?.id) return;
    setIsSaving(true);
    try {
      await updateBusiness.mutateAsync({
        id: biz.id,
        hero_title: useHeroTitle ? (heroTitle || null) : "",
        hero_badge: useHeroBadge ? (heroBadge || null) : null,
        promo_text: usePromoText ? (promoText || null) : null,
        cta_text: useCtaText ? (ctaText || null) : "",
        hero_benefits: useHeroBenefits
          ? (heroBenefits.filter(Boolean).length ? heroBenefits.filter(Boolean) : null)
          : null,
      } as any);
      await queryClient.invalidateQueries({ queryKey: ["my-business"] });
      toast({ title: "נשמר בהצלחה", description: "הטקסטים עודכנו בחנות שלך" });
    } catch (err: any) {
      toast({ title: "שגיאה בשמירה", description: err.message || "נסה שוב", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const primaryColor = (biz as any)?.primary_color ?? "#7c3aed";
  const businessName = biz?.name ?? "שם החנות";

  return (
    <div className="p-4 md:p-6 space-y-6 w-full" dir="rtl">
      <h1 className="text-2xl font-semibold text-foreground">טקסטים בחנות</h1>

      {/* Live mini preview */}
      <div
        className="rounded-2xl overflow-hidden border border-border shadow-sm"
        style={{ background: primaryColor, minHeight: "180px" }}
      >
        <div className="p-5 flex flex-col gap-3 text-white">
          {useHeroBadge && heroBadge ? (
            <span
              className="self-start text-xs font-semibold px-3 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.25)" }}
            >
              {heroBadge}
            </span>
          ) : (
            <span className="self-start text-xs px-3 py-1 rounded-full text-white/40 border border-white/20">
              תג (badge)
            </span>
          )}

          <h2 className="text-2xl font-bold leading-tight">
            {useHeroTitle && heroTitle ? heroTitle : (
              <span className="text-white/50">{businessName}</span>
            )}
          </h2>

          <button
            className="self-start text-sm font-semibold px-4 py-2 rounded-lg"
            style={{ background: "rgba(255,255,255,0.25)" }}
          >
            {useCtaText && ctaText ? ctaText : (
              <span className="text-white/60">לקולקציה</span>
            )}
          </button>

          {useHeroBenefits && heroBenefits.some(Boolean) ? (
            <div className="flex flex-wrap gap-3 text-xs text-white/80">
              {heroBenefits.filter(Boolean).map((b, i) => (
                <span key={i}>{b}</span>
              ))}
            </div>
          ) : (
            <div className="flex gap-3 text-xs text-white/30">
              <span>יתרון 1</span>
              <span>יתרון 2</span>
              <span>יתרון 3</span>
            </div>
          )}
        </div>
      </div>

      {/* Editing form */}
      <div className="space-y-5">
        {/* Hero Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="heroTitle">כותרת ראשית (Hero)</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {useHeroTitle ? "מופעל" : "ללא כותרת מותאמת"}
              </span>
              <Switch checked={useHeroTitle} onCheckedChange={setUseHeroTitle} />
            </div>
          </div>
          <Input
            id="heroTitle"
            value={heroTitle}
            onChange={(e) => setHeroTitle(e.target.value)}
            placeholder={businessName}
            disabled={!useHeroTitle}
          />
          <p className="text-xs text-muted-foreground">הכותרת הגדולה בראש החנות. השאר ריק להצגת שם העסק</p>
        </div>

        {/* Hero Badge */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="heroBadge">תג / Badge</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {useHeroBadge ? "מופעל" : "ללא תג"}
              </span>
              <Switch checked={useHeroBadge} onCheckedChange={setUseHeroBadge} />
            </div>
          </div>
          <Input
            id="heroBadge"
            value={heroBadge}
            onChange={(e) => setHeroBadge(e.target.value)}
            placeholder="חדש בחנות"
            disabled={!useHeroBadge}
          />
          <p className="text-xs text-muted-foreground">תג קטן שמופיע מעל הכותרת הראשית</p>
        </div>

        {/* Promo Text */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="promoText" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              טקסט פרומו (באנר עליון)
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {usePromoText ? "מופעל" : "ללא פרומו"}
              </span>
              <Switch checked={usePromoText} onCheckedChange={setUsePromoText} />
            </div>
          </div>
          <Textarea
            id="promoText"
            value={promoText}
            onChange={(e) => setPromoText(e.target.value)}
            placeholder="משלוח חינם בהזמנה מעל ₪199 ⭐ הנחה 10% לנרשמים חדשים"
            rows={2}
            disabled={!usePromoText}
          />
          <p className="text-xs text-muted-foreground">הודעה שמופיעה בפס בראש החנות</p>
        </div>

        {/* CTA Text */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="ctaText">טקסט כפתור ראשי (CTA)</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {useCtaText ? "מופעל" : "טקסט דיפולטי"}
              </span>
              <Switch checked={useCtaText} onCheckedChange={setUseCtaText} />
            </div>
          </div>
          <Input
            id="ctaText"
            value={ctaText}
            onChange={(e) => setCtaText(e.target.value)}
            placeholder="לקולקציה"
            disabled={!useCtaText}
          />
          <p className="text-xs text-muted-foreground">הטקסט בכפתור הראשי שמוביל למוצרים</p>
        </div>

        {/* Hero Benefits */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>פס מידע מתחת לבאנר</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {useHeroBenefits ? "מופעל" : "מוסתר"}
              </span>
              <Switch checked={useHeroBenefits} onCheckedChange={setUseHeroBenefits} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            עד 3 שורות שמופיעות מתחת ל-Hero (למשל: משלוח חינם, החזרות, תשלום מאובטח).
          </p>
          {[0, 1, 2].map((i) => (
            <Input
              key={i}
              value={heroBenefits[i]}
              onChange={(e) => {
                const next = [...heroBenefits];
                next[i] = e.target.value;
                setHeroBenefits(next);
              }}
              placeholder={
                i === 0
                  ? "🚚 משלוח חינם מעל ₪199"
                  : i === 1
                  ? "↩️ החלפה והחזרה עד 14 יום"
                  : "💳 תשלום מאובטח"
              }
              disabled={!useHeroBenefits}
            />
          ))}
        </div>
      </div>

      <Button size="lg" className="w-full gap-2" onClick={handleSave} disabled={isSaving}>
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        שמור שינויים
      </Button>
    </div>
  );
};

export default DashboardStoreTexts;
