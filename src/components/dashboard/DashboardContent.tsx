import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useBusinessById, useUpdateBusiness } from "@/hooks/useBusiness";
import { ExternalLink, Loader2, Plus, Trash2, Wand2, FileText, LayoutTemplate, Tags, BookOpen, Upload, X, Heart } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AboutEditor from "./AboutEditor";
import type { BusinessType } from "@/lib/businessModules";

interface DashboardContentProps {
  businessId?: string;
  businessType?: BusinessType;
  businessSubType?: string;
}

const ABOUT_LABELS: Record<BusinessType, { title: string; desc: string; saveLabel: string }> = {
  products:   { title: "אודות העסק",    desc: "ספרו על העסק — הסיפור, הערכים, מה מייחד אתכם.",                saveLabel: "שמרו אודות העסק"    },
  services:   { title: "אודות העסק",    desc: "ספרו על השירות, הניסיון, ומה מייחד אתכם.",                      saveLabel: "שמרו אודות העסק"    },
  nonprofit:  { title: "הסיפור שלנו",   desc: "ספרו על מטרת הארגון, הפעילות, ומה מניע אתכם לפעול.",            saveLabel: "שמרו את הסיפור"      },
  synagogue:  { title: "על בית הכנסת",  desc: "ספרו על הקהילה, נוסח התפילה, השיעורים והפעילות.",              saveLabel: "שמרו על בית הכנסת"  },
  realestate: { title: "על המשרד",      desc: "ספרו על משרד הנדל\"ן, הניסיון, ואזורי הפעילות שלכם.",           saveLabel: "שמרו על המשרד"       },
  vacation:   { title: "על הנכס",       desc: "ספרו על מה שמיוחד במקום — הנוף, האווירה, מה כלול.",             saveLabel: "שמרו על הנכס"        },
};

type ContentTab = "hero" | "about" | "labels" | "rabbi" | "hosting" | "donations";

const DashboardContent = ({ businessId, businessType = "products", businessSubType }: DashboardContentProps) => {
  const isTorahCenter = businessSubType === "torah-center";
  const isDonationBased = businessType === "nonprofit" || businessType === "synagogue";
  const { data: business, isLoading } = useBusinessById(businessId);
  const updateBusiness = useUpdateBusiness();
  const [activeTab, setActiveTab] = useState<ContentTab>("hero");

  // Hero fields
  const [heroTitle, setHeroTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [heroBenefits, setHeroBenefits] = useState<string[]>([]);
  const [heroBadge, setHeroBadge] = useState("");
  const [promoText, setPromoText] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [whatsappMessage, setWhatsappMessage] = useState("");
  const [isSavingHero, setIsSavingHero] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Section labels (customLabels)
  const [labelProducts, setLabelProducts] = useState("");
  const [labelAbout, setLabelAbout] = useState("");
  const [labelCta, setLabelCta] = useState("");
  const [labelGallery, setLabelGallery] = useState("");
  const [isSavingLabels, setIsSavingLabels] = useState(false);

  // About fields
  const [aboutBody, setAboutBody] = useState("");
  const [aboutContact, setAboutContact] = useState("");
  const [isSavingAbout, setIsSavingAbout] = useState(false);

  // Auto-save ref
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleAutosave(data: Record<string, unknown>) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (!businessId) return;
      await supabase.from("business_profiles").update(data as any).eq("id", businessId);
    }, 2000);
  }

  useEffect(() => {
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, []);

  // Hosting policy (vacation only)
  const [hostingPolicy, setHostingPolicy] = useState<Record<string, string>>({});

  // Donation amounts (nonprofit / synagogue only)
  const [donationAmounts, setDonationAmounts] = useState<number[]>([50, 100, 200, 500]);
  const [isSavingDonations, setIsSavingDonations] = useState(false);

  // Rabbi message fields (torah-center only)
  const [rabbiName, setRabbiName] = useState("");
  const [rabbiTitle, setRabbiTitle] = useState("");
  const [rabbiMessage, setRabbiMessage] = useState("");
  const [rabbiImageUrl, setRabbiImageUrl] = useState("");
  const [isUploadingRabbi, setIsUploadingRabbi] = useState(false);
  const [isSavingRabbi, setIsSavingRabbi] = useState(false);
  const rabbiImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!business) return;
    setHeroTitle((business as any).hero_title || "");
    setTagline((business as any).tagline || "");
    const raw = (business as any).hero_benefits;
    setHeroBenefits(Array.isArray(raw) ? raw : []);
    setHeroBadge((business as any).hero_badge || "");
    setPromoText((business as any).promo_text || "");
    setCtaText((business as any).cta_text || "");
    setWhatsappMessage((business as any).whatsapp_message || "");
    const cl = (business as any).custom_labels || {};
    setLabelProducts(cl.productsTitle || "");
    setLabelAbout(cl.aboutTitle || "");
    setLabelCta(cl.ctaTitle || "");
    setLabelGallery(cl.galleryTitle || "");
    // Prefer about_text (storefront inline) but fall back to about_page_body
    setAboutBody((business as any).about_text || (business as any).about_page_body || "");
    setAboutContact((business as any).about_page_contact || "");
    setRabbiName((business as any).rabbi_name || "");
    setRabbiTitle((business as any).rabbi_title || "");
    setRabbiMessage((business as any).rabbi_message || "");
    setRabbiImageUrl((business as any).rabbi_image_url || "");
    const hp = (business as any).settings?.hosting_policy || {};
    setHostingPolicy(hp);
    const da = (business as any).settings?.donation_amounts;
    if (Array.isArray(da) && da.length > 0) setDonationAmounts(da);
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
        hero_badge: heroBadge || null,
        promo_text: promoText || null,
        cta_text: ctaText || null,
        whatsapp_message: whatsappMessage || null,
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

  const handleSaveLabels = async () => {
    if (!businessId) return;
    setIsSavingLabels(true);
    try {
      await updateBusiness.mutateAsync({
        id: businessId,
        custom_labels: {
          ...(labelProducts ? { productsTitle: labelProducts } : {}),
          ...(labelAbout ? { aboutTitle: labelAbout } : {}),
          ...(labelCta ? { ctaTitle: labelCta } : {}),
          ...(labelGallery ? { galleryTitle: labelGallery } : {}),
        },
      } as any);
      toast.success("כותרות הסקשנים עודכנו");
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setIsSavingLabels(false);
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
          rawText: aboutBody || tagline || business.name,
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

  const handleRabbiImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !businessId) return;
    setIsUploadingRabbi(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${businessId}/rabbi-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("business-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
      setRabbiImageUrl(data.publicUrl);
      toast.success("התמונה הועלתה");
    } catch {
      toast.error("שגיאה בהעלאת תמונה");
    } finally {
      setIsUploadingRabbi(false);
    }
  };

  const handleSaveRabbi = async () => {
    if (!businessId) return;
    setIsSavingRabbi(true);
    try {
      await updateBusiness.mutateAsync({
        id: businessId,
        rabbi_name: rabbiName || null,
        rabbi_title: rabbiTitle || null,
        rabbi_message: rabbiMessage || null,
        rabbi_image_url: rabbiImageUrl || null,
      } as any);
      toast.success("דבר הרב עודכן");
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setIsSavingRabbi(false);
    }
  };

  const handleSaveDonations = async () => {
    if (!businessId) return;
    const valid = donationAmounts.filter(n => n > 0);
    if (valid.length === 0) return;
    setIsSavingDonations(true);
    try {
      await supabase.from("business_profiles").update({
        settings: { ...(business as any)?.settings, donation_amounts: valid },
      } as any).eq("id", businessId);
      toast.success("סכומי התרומה עודכנו");
    } catch {
      toast.error("שגיאה בשמירה");
    } finally {
      setIsSavingDonations(false);
    }
  };

  const aboutLabels = ABOUT_LABELS[businessType] ?? ABOUT_LABELS.products;
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
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {([
          { id: "hero" as ContentTab, label: "כותרת ראשית", icon: LayoutTemplate },
          { id: "about" as ContentTab, label: aboutLabels.title, icon: FileText },
          { id: "labels" as ContentTab, label: "כותרות סקשנים", icon: Tags },
          ...(isTorahCenter ? [{ id: "rabbi" as ContentTab, label: "דבר הרב", icon: BookOpen }] : []),
          ...(businessType === "vacation" ? [{ id: "hosting" as ContentTab, label: "מדיניות אירוח", icon: FileText }] : []),
          ...(isDonationBased ? [{ id: "donations" as ContentTab, label: "סכומי תרומה", icon: Heart }] : []),
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
              <button
                type="button"
                onClick={handleGenerateHero}
                disabled={isGenerating}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-violet-600 to-indigo-500 text-white px-5 py-3 text-sm font-semibold shadow hover:opacity-90 transition-opacity disabled:opacity-60 shrink-0"
              >
                ✨ {isGenerating ? "יוצר תוכן..." : "צור עם AI בחינם"}
              </button>
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

          {/* Secondary fields */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <div>
              <h2 className="text-base font-semibold">פרטים נוספים</h2>
              <p className="text-sm text-muted-foreground mt-0.5">בנר, כפתורים והודעות</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>בנר עליון (סרט)</Label>
                <Input
                  value={promoText}
                  onChange={e => setPromoText(e.target.value)}
                  placeholder='למשל: "משלוח חינם בהזמנה מעל ₪199 ⭐ הנחה 10% לנרשמים"'
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>תג מעל הכותרת</Label>
                  <Input
                    value={heroBadge}
                    onChange={e => setHeroBadge(e.target.value)}
                    placeholder='למשל: "חדש בחנות"'
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>טקסט כפתור ראשי</Label>
                  <Input
                    value={ctaText}
                    onChange={e => setCtaText(e.target.value)}
                    placeholder='למשל: "לקולקציה"'
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>הודעת וואטסאפ (מוכנה מראש)</Label>
                <Input
                  value={whatsappMessage}
                  onChange={e => setWhatsappMessage(e.target.value)}
                  placeholder="שלום, הגעתי מהאתר שלכם ואשמח לקבל פרטים נוספים"
                />
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

      {/* Rabbi message tab (torah-center only) */}
      {activeTab === "rabbi" && isTorahCenter && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold">דבר הרב / ראש הישיבה</h2>
              <p className="text-sm text-muted-foreground mt-0.5">תמונה, שם ומלל שיופיעו כסקציה ייחודית באתר</p>
            </div>

            {/* Rabbi photo */}
            <div className="space-y-2">
              <Label>תמונת הרב</Label>
              <input
                ref={rabbiImageInputRef}
                type="file"
                accept="image/*"
                onChange={handleRabbiImageUpload}
                className="hidden"
              />
              {rabbiImageUrl ? (
                <div className="relative inline-block">
                  <img
                    src={rabbiImageUrl}
                    alt="תמונת הרב"
                    className="w-32 h-32 object-cover rounded-2xl border border-border"
                  />
                  <button
                    onClick={() => setRabbiImageUrl("")}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => rabbiImageInputRef.current?.click()}
                  disabled={isUploadingRabbi}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/50 transition-colors"
                >
                  {isUploadingRabbi
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Upload className="h-4 w-4" />}
                  העלו תמונת הרב
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>שם הרב</Label>
                <Input
                  value={rabbiName}
                  onChange={e => setRabbiName(e.target.value)}
                  placeholder='למשל: הרב יצחק כהן'
                />
              </div>
              <div className="space-y-1.5">
                <Label>תואר</Label>
                <Input
                  value={rabbiTitle}
                  onChange={e => setRabbiTitle(e.target.value)}
                  placeholder='ראש הישיבה / אב"ד'
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>דבר הרב</Label>
              <Textarea
                value={rabbiMessage}
                onChange={e => setRabbiMessage(e.target.value)}
                placeholder="כתבו כאן את דברי הרב — ברכה, חזון, מסר לתורמים..."
                rows={6}
                dir="rtl"
              />
            </div>
          </div>

          <Button onClick={handleSaveRabbi} disabled={isSavingRabbi} className="w-full">
            {isSavingRabbi && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            שמרו דבר הרב
          </Button>
        </div>
      )}

      {/* Hosting policy tab (vacation only) */}
      {activeTab === "hosting" && businessType === "vacation" && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold">מדיניות אירוח</h2>
              <p className="text-sm text-muted-foreground mt-0.5">הגדירו את כללי הכניסה, היציאה וההתנהגות באירוח</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">שעת כניסה (check-in)</label>
                <input
                  type="time"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={hostingPolicy?.checkin_time ?? "15:00"}
                  onChange={e => { setHostingPolicy(p => ({ ...p, checkin_time: e.target.value })); scheduleAutosave({ settings: { ...(business as any)?.settings, hosting_policy: { ...hostingPolicy, checkin_time: e.target.value } } }); }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">שעת יציאה (check-out)</label>
                <input
                  type="time"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={hostingPolicy?.checkout_time ?? "11:00"}
                  onChange={e => { setHostingPolicy(p => ({ ...p, checkout_time: e.target.value })); scheduleAutosave({ settings: { ...(business as any)?.settings, hosting_policy: { ...hostingPolicy, checkout_time: e.target.value } } }); }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">מדיניות ביטול</label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={hostingPolicy?.cancellation_policy ?? ""}
                onChange={e => { setHostingPolicy(p => ({ ...p, cancellation_policy: e.target.value })); scheduleAutosave({ settings: { ...(business as any)?.settings, hosting_policy: { ...hostingPolicy, cancellation_policy: e.target.value } } }); }}
              >
                <option value="">בחר מדיניות</option>
                <option value="flexible">גמישה - ביטול עד 24 שעות לפני</option>
                <option value="moderate">מתונה - ביטול עד שבוע לפני</option>
                <option value="strict">מחמירה - ללא החזר</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">חיות מחמד</label>
                <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={hostingPolicy?.pets ?? ""} onChange={e => setHostingPolicy(p => ({ ...p, pets: e.target.value }))}>
                  <option value="">בחר</option>
                  <option value="no">לא מותר</option>
                  <option value="yes">מותר</option>
                  <option value="fee">מותר בתוספת תשלום</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">עישון</label>
                <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={hostingPolicy?.smoking ?? ""} onChange={e => setHostingPolicy(p => ({ ...p, smoking: e.target.value }))}>
                  <option value="">בחר</option>
                  <option value="no">אסור לחלוטין</option>
                  <option value="outside">מותר בחוץ בלבד</option>
                  <option value="yes">מותר</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Donation amounts tab (nonprofit / synagogue only) */}
      {activeTab === "donations" && isDonationBased && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold">סכומי תרומה מוצעים</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                ארבעת הכפתורים שיופיעו בדף התרומה. תורמים יכולים גם להכניס סכום חופשי.
              </p>
            </div>

            {/* Preview */}
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground mb-2 font-medium">תצוגה מקדימה</p>
              <div className="grid grid-cols-4 gap-2">
                {donationAmounts.map((amt, i) => (
                  <div key={i} className={`py-2.5 rounded-xl text-sm font-bold border text-center ${i === 1 ? "bg-primary text-primary-foreground border-primary" : "border-border bg-background"}`}>
                    ₪{amt || "?"}
                  </div>
                ))}
              </div>
            </div>

            {/* Edit amounts */}
            <div className="grid grid-cols-2 gap-3">
              {donationAmounts.map((amt, i) => (
                <div key={i} className="space-y-1">
                  <label className="text-xs text-muted-foreground">כפתור {i + 1}</label>
                  <div className="relative">
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₪</span>
                    <Input
                      type="number"
                      min={1}
                      value={amt}
                      onChange={e => {
                        const next = [...donationAmounts];
                        next[i] = Number(e.target.value) || 0;
                        setDonationAmounts(next);
                      }}
                      className="pr-7"
                      dir="ltr"
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              טיפ: הסכום השני בולט יותר בעיצוב — שימו שם את הסכום הנפוץ ביותר.
            </p>
          </div>

          <Button onClick={handleSaveDonations} disabled={isSavingDonations} className="w-full">
            {isSavingDonations && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            שמרו סכומי תרומה
          </Button>
        </div>
      )}

      {/* Labels tab */}
      {activeTab === "labels" && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold">כותרות סקשנים</h2>
              <p className="text-sm text-muted-foreground mt-0.5">דרסו את הכותרות הקבועות בתבנית. השאירו ריק כדי לשמור על ברירת המחדל.</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>סקשן מוצרים / שירותים</Label>
                <Input
                  value={labelProducts}
                  onChange={e => setLabelProducts(e.target.value)}
                  placeholder={
                    businessType === "nonprofit" ? "הפרויקטים שלנו" :
                    businessType === "realestate" ? "הנכסים שלנו" :
                    businessType === "services" ? "השירותים שלנו" :
                    "הקולקציה שלנו"
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>סקשן אודות</Label>
                <Input
                  value={labelAbout}
                  onChange={e => setLabelAbout(e.target.value)}
                  placeholder={businessType === "nonprofit" ? "הסיפור שלנו" : "קצת עלינו"}
                />
              </div>
              <div className="space-y-1.5">
                <Label>כפתור CTA תחתון</Label>
                <Input
                  value={labelCta}
                  onChange={e => setLabelCta(e.target.value)}
                  placeholder={
                    businessType === "nonprofit" ? "יחד נעשה שינוי" :
                    businessType === "realestate" ? "מעוניינים לשמוע עוד?" :
                    "מוכנים להתחיל?"
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>גלריה / עבודות (אם קיים בתבנית)</Label>
                <Input
                  value={labelGallery}
                  onChange={e => setLabelGallery(e.target.value)}
                  placeholder={businessType === "services" ? "עבודות אחרונות" : "גלריית עבודות"}
                />
              </div>
            </div>
          </div>
          <Button onClick={handleSaveLabels} disabled={isSavingLabels} className="w-full">
            {isSavingLabels && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            שמרו כותרות
          </Button>
        </div>
      )}
    </div>
  );
};

export default DashboardContent;
