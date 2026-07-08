import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useBusinessById, useUpdateBusiness } from "@/hooks/useBusiness";
import { ExternalLink, Loader2, Plus, Trash2, Wand2, FileText, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AboutEditor from "./AboutEditor";
import type { BusinessType } from "@/lib/businessModules";

interface DashboardContentProps {
  businessId?: string;
  businessType?: BusinessType;
}

const ABOUT_LABELS: Record<BusinessType, { title: string; desc: string; saveLabel: string }> = {
  products:   { title: "אודות העסק",  desc: "ספרו על העסק — הסיפור, הערכים, מה מייחד אתכם.",                   saveLabel: "שמרו אודות העסק"   },
  services:   { title: "אודות העסק",  desc: "ספרו על השירות, הניסיון, ומה מייחד אתכם.",                        saveLabel: "שמרו אודות העסק"   },
  nonprofit:  { title: "על הארגון",   desc: "ספרו על מטרת הארגון, הפעילות, ומה מניע אתכם לפעול.",              saveLabel: "שמרו על הארגון"    },
  realestate: { title: "על המשרד",    desc: "ספרו על משרד הנדל\"ן, הניסיון, ואזורי הפעילות שלכם.",             saveLabel: "שמרו על המשרד"     },
};

type ContentTab = "hero" | "about";

const DashboardContent = ({ businessId, businessType = "products" }: DashboardContentProps) => {
  const { data: business, isLoading } = useBusinessById(businessId);
  const updateBusiness = useUpdateBusiness();
  const [activeTab, setActiveTab] = useState<ContentTab>("hero");

  // Hero fields
  const [heroTitle, setHeroTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [heroBenefits, setHeroBenefits] = useState<string[]>([]);
  const [isSavingHero, setIsSavingHero] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // About fields
  const [aboutBody, setAboutBody] = useState("");
  const [aboutContact, setAboutContact] = useState("");
  const [isSavingAbout, setIsSavingAbout] = useState(false);

  useEffect(() => {
    if (!business) return;
    setHeroTitle((business as any).hero_title || "");
    setTagline((business as any).tagline || "");
    const raw = (business as any).hero_benefits;
    setHeroBenefits(Array.isArray(raw) ? raw : []);
    // Prefer about_text (storefront inline) but fall back to about_page_body
    setAboutBody((business as any).about_text || (business as any).about_page_body || "");
    setAboutContact((business as any).about_page_contact || "");
  }, [business]);

  const handleSaveHero = async () => {
    if (!businessId) return;
    setIsSavingHero(true);
    try {
      await updateBusiness.mutateAsync({
        id: businessId,
        hero_title: heroTitle || null,
        tagline: tagline || null,
        hero_benefits: heroBenefits.filter(b => b.trim()),
      } as any);
      toast.success("הכותרת הראשית עודכנה");
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setIsSavingHero(false);
    }
  };

  const handleSaveAbout = async () => {
    if (!businessId) return;
    setIsSavingAbout(true);
    try {
      await updateBusiness.mutateAsync({
        id: businessId,
        // Save to both fields so both inline storefront section and /about page update
        about_text: aboutBody || null,
        about_page_title: aboutBody ? `${aboutLabels.title} — ${business?.name || ""}`.trim() : null,
        about_page_body: aboutBody || null,
        about_page_contact: aboutContact || null,
      } as any);
      toast.success(`${aboutLabels.title} עודכנה`);
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setIsSavingAbout(false);
    }
  };

  const handleGenerateHero = async () => {
    if (!businessId || !business) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          businessName: business.name,
          businessCategory: (business as any).business_category,
          description: aboutBody || tagline || business.name,
        },
      });
      if (error) throw error;
      if (data?.heroTitle) setHeroTitle(data.heroTitle);
      if (data?.tagline) setTagline(data.tagline);
      if (data?.heroBenefits) {
        const benefits = typeof data.heroBenefits === "string"
          ? data.heroBenefits.split("\n").filter(Boolean)
          : Array.isArray(data.heroBenefits) ? data.heroBenefits : [];
        setHeroBenefits(benefits);
      }
      toast.success("תוכן חדש נוצר — בדקו ושמרו");
    } catch {
      toast.error("שגיאה ביצירת תוכן");
    } finally {
      setIsGenerating(false);
    }
  };

  const aboutLabels = ABOUT_LABELS[businessType];
  const storeUrl = business?.slug
    ? `${window.location.origin}/store/${business.slug}`
    : null;

  if (!businessId) return (
    <div className="p-6">
      <p className="text-sm text-muted-foreground">לא נמצא עסק פעיל.</p>
    </div>
  );

  if (isLoading && !business) return (
    <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>טוען...</span>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">תוכן האתר</h1>
        {storeUrl && (
          <a href={storeUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              ראו את החנות
            </Button>
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { id: "hero" as ContentTab, label: "כותרת ראשית", icon: LayoutTemplate },
          { id: "about" as ContentTab, label: aboutLabels.title, icon: FileText },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
              activeTab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Hero tab */}
      {activeTab === "hero" && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">כותרת ראשית</h2>
                <p className="text-sm text-muted-foreground mt-0.5">מה שמבקרים רואים ראשון כשנכנסים לחנות</p>
              </div>
              <Button
                variant="outline" size="sm" className="gap-2 shrink-0"
                onClick={handleGenerateHero}
                disabled={isGenerating}
              >
                {isGenerating
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Wand2 className="h-3.5 w-3.5" />}
                צרו עם AI
              </Button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>כותרת ראשית</Label>
                <Input
                  value={heroTitle}
                  onChange={e => setHeroTitle(e.target.value)}
                  placeholder="למשל: הלבשה ייחודית שתגרום לכם להרגיש טוב"
                />
              </div>
              <div className="space-y-1.5">
                <Label>סלוגן / תת-כותרת</Label>
                <Input
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  placeholder="משפט קצר שמתאר את הייחוד שלכם"
                />
              </div>
              <div className="space-y-1.5">
                <Label>נקודות יתרון</Label>
                <div className="space-y-2">
                  {heroBenefits.map((b, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={b}
                        onChange={e => {
                          const next = [...heroBenefits];
                          next[i] = e.target.value;
                          setHeroBenefits(next);
                        }}
                        placeholder={`יתרון ${i + 1}`}
                      />
                      <Button
                        type="button" variant="ghost" size="icon"
                        onClick={() => setHeroBenefits(heroBenefits.filter((_, j) => j !== i))}
                        className="shrink-0"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                  {heroBenefits.length < 4 && (
                    <Button
                      type="button" variant="ghost" size="sm"
                      className="text-muted-foreground gap-1.5"
                      onClick={() => setHeroBenefits([...heroBenefits, ""])}
                    >
                      <Plus className="h-3.5 w-3.5" /> הוסיפו יתרון
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button onClick={handleSaveHero} disabled={isSavingHero} className="w-full">
            {isSavingHero && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            שמרו כותרת ראשית
          </Button>
        </div>
      )}

      {/* About tab */}
      {activeTab === "about" && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold">{aboutLabels.title}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{aboutLabels.desc}</p>
            </div>

            <AboutEditor
              businessId={businessId}
              businessName={business?.name || ""}
              businessCategory={(business as any)?.business_category}
              currentAboutText={aboutBody}
              disableInternalSave
              onSave={text => setAboutBody(text)}
            />

            <div className="space-y-1.5 pt-3 border-t border-border">
              <Label htmlFor="aboutContact">פרטי יצירת קשר (אופציונלי)</Label>
              <Textarea
                id="aboutContact"
                value={aboutContact}
                onChange={e => setAboutContact(e.target.value)}
                placeholder={"📍 כתובת: ...\n📞 טלפון נוסף: ...\n✉️ מייל: ..."}
                rows={3}
              />
            </div>
          </div>

          <Button onClick={handleSaveAbout} disabled={isSavingAbout} className="w-full">
            {isSavingAbout && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {aboutLabels.saveLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DashboardContent;
