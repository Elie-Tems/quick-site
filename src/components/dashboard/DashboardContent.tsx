import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useBusinessById, useUpdateBusiness } from "@/hooks/useBusiness";
import { ExternalLink, Loader2, Plus, Trash2, Wand2, FileText, LayoutTemplate, Tags, BookOpen, Upload, X, Heart, Award, Images, ClipboardList, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AboutEditor from "./AboutEditor";
import type { BusinessType } from "@/lib/businessModules";
import { useLanguage } from "@/contexts/LanguageContext";

interface DashboardContentProps {
  businessId?: string;
  businessType?: BusinessType;
  businessSubType?: string;
}

type ContentTab = "hero" | "about" | "labels" | "rabbi" | "hosting" | "donations" | "differentiation" | "gallery" | "leadform";

const DashboardContent = ({ businessId, businessType = "products", businessSubType }: DashboardContentProps) => {
  const { t } = useLanguage();
  const isTorahCenter = businessSubType === "torah-center";
  const isDonationBased = businessType === "nonprofit" || businessType === "synagogue";
  const { data: business, isLoading } = useBusinessById(businessId);
  const updateBusiness = useUpdateBusiness();
  const [activeTab, setActiveTab] = useState<ContentTab>("hero");

  const ABOUT_LABELS: Record<BusinessType, { title: string; desc: string; saveLabel: string }> = {
    products:   { title: t("dash.content.about_labels.products.title"),   desc: t("dash.content.about_labels.products.desc"),   saveLabel: t("dash.content.about_labels.products.save") },
    services:   { title: t("dash.content.about_labels.services.title"),   desc: t("dash.content.about_labels.services.desc"),   saveLabel: t("dash.content.about_labels.services.save") },
    nonprofit:  { title: t("dash.content.about_labels.nonprofit.title"),  desc: t("dash.content.about_labels.nonprofit.desc"),  saveLabel: t("dash.content.about_labels.nonprofit.save") },
    synagogue:  { title: t("dash.content.about_labels.synagogue.title"),  desc: t("dash.content.about_labels.synagogue.desc"),  saveLabel: t("dash.content.about_labels.synagogue.save") },
    realestate: { title: t("dash.content.about_labels.realestate.title"), desc: t("dash.content.about_labels.realestate.desc"), saveLabel: t("dash.content.about_labels.realestate.save") },
    vacation:   { title: t("dash.content.about_labels.vacation.title"),   desc: t("dash.content.about_labels.vacation.desc"),   saveLabel: t("dash.content.about_labels.vacation.save") },
  };

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

  // Differentiation section
  const [diffHeading, setDiffHeading] = useState("");
  const [diffSubheading, setDiffSubheading] = useState("");
  const [diffItems, setDiffItems] = useState<{ icon: string; title: string; body: string }[]>([]);
  const [isSavingDiff, setIsSavingDiff] = useState(false);

  // Gallery
  const [galleryHeading, setGalleryHeading] = useState("");
  const [galleryImages, setGalleryImages] = useState<{ url: string; caption: string }[]>([]);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [isSavingGallery, setIsSavingGallery] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Lead form
  const [leadFormEnabled, setLeadFormEnabled] = useState(false);
  const [leadFormHeading, setLeadFormHeading] = useState("");
  const [leadFormSubheading, setLeadFormSubheading] = useState("");
  const [isSavingLeadForm, setIsSavingLeadForm] = useState(false);

  // Auto-save ref
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleAutosave(data: Record<string, unknown>) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (!businessId) return;
      await supabase.from("businesses").update(data as any).eq("id", businessId);
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
    // Differentiation
    const rawDiff = (business as any).differentiation;
    if (rawDiff && typeof rawDiff === "object") {
      setDiffHeading(rawDiff.heading || "");
      setDiffSubheading(rawDiff.subheading || "");
      setDiffItems(Array.isArray(rawDiff.items) ? rawDiff.items : []);
    }
    // Gallery
    const rawGallery = (business as any).gallery_images;
    if (rawGallery && typeof rawGallery === "object") {
      setGalleryHeading(rawGallery.heading || "");
      setGalleryImages(Array.isArray(rawGallery.images) ? rawGallery.images : []);
    }
    // Lead form
    setLeadFormEnabled(!!(business as any).lead_form_enabled);
    const clLeadForm = (business as any).custom_labels || {};
    setLeadFormHeading(clLeadForm.leadFormHeading || "");
    setLeadFormSubheading(clLeadForm.leadFormSubheading || "");
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
      toast.success(t("dash.content.toast.hero_saved"));
    } catch {
      toast.error(t("dash.content.toast.save_error"));
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
      toast.success(`${aboutLabels.title} ${t("dash.content.toast.updated_suffix")}`);
    } catch {
      toast.error(t("dash.content.toast.save_error"));
    } finally {
      setIsSavingAbout(false);
    }
  };

  const handleSaveLabels = async () => {
    if (!businessId) return;
    setIsSavingLabels(true);
    try {
      const existingLabels = (business as any)?.custom_labels || {};
      await updateBusiness.mutateAsync({
        id: businessId,
        custom_labels: {
          ...existingLabels,
          ...(labelProducts ? { productsTitle: labelProducts } : {}),
          ...(labelAbout ? { aboutTitle: labelAbout } : {}),
          ...(labelCta ? { ctaTitle: labelCta } : {}),
          ...(labelGallery ? { galleryTitle: labelGallery } : {}),
        },
      } as any);
      toast.success(t("dash.content.toast.labels_saved"));
    } catch {
      toast.error(t("dash.content.toast.save_error"));
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
          businessType,
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
      toast.success(t("dash.content.toast.ai_generated"));
    } catch {
      toast.error(t("dash.content.toast.ai_generate_error"));
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
      toast.success(t("dash.content.toast.image_uploaded"));
    } catch {
      toast.error(t("dash.content.toast.image_upload_error"));
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
      toast.success(t("dash.content.toast.rabbi_saved"));
    } catch {
      toast.error(t("dash.content.toast.save_error"));
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
      toast.success(t("dash.content.toast.donations_saved"));
    } catch {
      toast.error(t("dash.content.toast.save_error"));
    } finally {
      setIsSavingDonations(false);
    }
  };

  const handleSaveDiff = async () => {
    if (!businessId) return;
    setIsSavingDiff(true);
    try {
      await updateBusiness.mutateAsync({
        id: businessId,
        differentiation: { heading: diffHeading, subheading: diffSubheading, items: diffItems.filter(it => it.title.trim()) },
      } as any);
      toast.success(t("dash.content.toast.diff_saved"));
    } catch { toast.error(t("dash.content.toast.save_error")); }
    finally { setIsSavingDiff(false); }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !businessId) return;
    setIsUploadingGallery(true);
    try {
      const uploaded: { url: string; caption: string }[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${businessId}/gallery-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("business-assets").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
        uploaded.push({ url: data.publicUrl, caption: "" });
      }
      setGalleryImages(prev => [...prev, ...uploaded]);
      toast.success(`${uploaded.length} ${t("dash.content.toast.photos_uploaded")}`);
    } catch { toast.error(t("dash.content.toast.photos_upload_error")); }
    finally { setIsUploadingGallery(false); if (galleryInputRef.current) galleryInputRef.current.value = ""; }
  };

  const handleSaveGallery = async () => {
    if (!businessId) return;
    setIsSavingGallery(true);
    try {
      await updateBusiness.mutateAsync({
        id: businessId,
        gallery_images: { heading: galleryHeading, images: galleryImages.filter(img => img.url) },
      } as any);
      toast.success(t("dash.content.toast.gallery_saved"));
    } catch { toast.error(t("dash.content.toast.save_error")); }
    finally { setIsSavingGallery(false); }
  };

  const handleSaveLeadForm = async () => {
    if (!businessId) return;
    setIsSavingLeadForm(true);
    try {
      const cl = (business as any)?.custom_labels || {};
      await updateBusiness.mutateAsync({
        id: businessId,
        lead_form_enabled: leadFormEnabled,
        custom_labels: { ...cl, leadFormHeading, leadFormSubheading },
      } as any);
      toast.success(t("dash.content.toast.leadform_saved"));
    } catch { toast.error(t("dash.content.toast.save_error")); }
    finally { setIsSavingLeadForm(false); }
  };

  const aboutLabels = ABOUT_LABELS[businessType] ?? ABOUT_LABELS.products;
  const storeUrl = business?.slug
    ? `${window.location.origin}/store/${business.slug}`
    : null;

  if (!businessId) return (
    <div className="p-6">
      <p className="text-sm text-muted-foreground">{t("dash.content.no_active_business")}</p>
    </div>
  );

  if (isLoading && !business) return (
    <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>{t("dash.content.loading")}</span>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">{t("dash.content.page_title")}</h1>
        {storeUrl && (
          <a href={storeUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              {t("dash.content.view_store")}
            </Button>
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {([
          { id: "hero" as ContentTab, label: t("dash.content.tab.hero"), icon: LayoutTemplate },
          { id: "about" as ContentTab, label: aboutLabels.title, icon: FileText },
          { id: "labels" as ContentTab, label: t("dash.content.tab.labels"), icon: Tags },
          ...(isTorahCenter ? [{ id: "rabbi" as ContentTab, label: t("dash.content.tab.rabbi"), icon: BookOpen }] : []),
          ...(businessType === "vacation" ? [{ id: "hosting" as ContentTab, label: t("dash.content.tab.hosting"), icon: FileText }] : []),
          ...(isDonationBased ? [{ id: "donations" as ContentTab, label: t("dash.content.tab.donations"), icon: Heart }] : []),
          ...((businessType === "realestate" || businessType === "services") ? [{ id: "differentiation" as ContentTab, label: t("dash.content.tab.differentiation"), icon: Award }] : []),
          ...((businessType === "realestate" || businessType === "services" || businessType === "vacation" || (business as {enabled_modules?: string[] | null} | undefined)?.enabled_modules?.includes("gallery")) ? [{ id: "gallery" as ContentTab, label: t("dash.content.tab.gallery"), icon: Images }] : []),
          ...((businessType === "realestate" || businessType === "services") ? [{ id: "leadform" as ContentTab, label: t("dash.content.tab.leadform"), icon: ClipboardList }] : []),
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
                <h2 className="text-base font-semibold">{t("dash.content.hero.title")}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{t("dash.content.hero.subtitle")}</p>
              </div>
              <button
                type="button"
                onClick={handleGenerateHero}
                disabled={isGenerating}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-l from-violet-600 to-indigo-500 text-white px-5 py-3 text-sm font-semibold shadow hover:opacity-90 transition-opacity disabled:opacity-60 shrink-0"
              >
                ✨ {isGenerating ? t("dash.content.hero.generating") : t("dash.content.hero.generate_ai")}
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("dash.content.hero.title")}</Label>
                <Input
                  value={heroTitle}
                  onChange={e => setHeroTitle(e.target.value)}
                  placeholder={t("dash.content.hero.title_placeholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dash.content.hero.tagline_label")}</Label>
                <Input
                  value={tagline}
                  onChange={e => setTagline(e.target.value)}
                  placeholder={t("dash.content.hero.tagline_placeholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dash.content.hero.benefits_label")}</Label>
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
                        placeholder={`${t("dash.content.hero.benefit_item")} ${i + 1}`}
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
                      <Plus className="h-3.5 w-3.5" /> {t("dash.content.hero.add_benefit")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Secondary fields */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <div>
              <h2 className="text-base font-semibold">{t("dash.content.hero.more_details")}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{t("dash.content.hero.more_details_sub")}</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("dash.content.hero.promo_label")}</Label>
                <Input
                  value={promoText}
                  onChange={e => setPromoText(e.target.value)}
                  placeholder={t("dash.content.hero.promo_placeholder")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("dash.content.hero.badge_label")}</Label>
                  <Input
                    value={heroBadge}
                    onChange={e => setHeroBadge(e.target.value)}
                    placeholder={t("dash.content.hero.badge_placeholder")}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("dash.content.hero.cta_label")}</Label>
                  <Input
                    value={ctaText}
                    onChange={e => setCtaText(e.target.value)}
                    placeholder={t("dash.content.hero.cta_placeholder")}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("dash.content.hero.whatsapp_label")}</Label>
                <Input
                  value={whatsappMessage}
                  onChange={e => setWhatsappMessage(e.target.value)}
                  placeholder={t("dash.content.hero.whatsapp_placeholder")}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSaveHero} disabled={isSavingHero} className="w-full">
            {isSavingHero && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {t("dash.content.hero.save")}
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
              <Label htmlFor="aboutContact">{t("dash.content.about.contact_label")}</Label>
              <Textarea
                id="aboutContact"
                value={aboutContact}
                onChange={e => setAboutContact(e.target.value)}
                placeholder={t("dash.content.about.contact_placeholder")}
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
              <h2 className="text-base font-semibold">{t("dash.content.rabbi.title")}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{t("dash.content.rabbi.subtitle")}</p>
            </div>

            {/* Rabbi photo */}
            <div className="space-y-2">
              <Label>{t("dash.content.rabbi.photo_label")}</Label>
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
                    alt={t("dash.content.rabbi.photo_alt")}
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
                  {t("dash.content.rabbi.upload_photo")}
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("dash.content.rabbi.name_label")}</Label>
                <Input
                  value={rabbiName}
                  onChange={e => setRabbiName(e.target.value)}
                  placeholder={t("dash.content.rabbi.name_placeholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dash.content.rabbi.role_label")}</Label>
                <Input
                  value={rabbiTitle}
                  onChange={e => setRabbiTitle(e.target.value)}
                  placeholder={t("dash.content.rabbi.role_placeholder")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("dash.content.rabbi.message_label")}</Label>
              <Textarea
                value={rabbiMessage}
                onChange={e => setRabbiMessage(e.target.value)}
                placeholder={t("dash.content.rabbi.message_placeholder")}
                rows={6}
                dir="rtl"
              />
            </div>
          </div>

          <Button onClick={handleSaveRabbi} disabled={isSavingRabbi} className="w-full">
            {isSavingRabbi && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {t("dash.content.rabbi.save")}
          </Button>
        </div>
      )}

      {/* Hosting policy tab (vacation only) */}
      {activeTab === "hosting" && businessType === "vacation" && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold">{t("dash.content.hosting.title")}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{t("dash.content.hosting.subtitle")}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("dash.content.hosting.checkin")}</label>
                <input
                  type="time"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={hostingPolicy?.checkin_time ?? "15:00"}
                  onChange={e => { setHostingPolicy(p => ({ ...p, checkin_time: e.target.value })); scheduleAutosave({ settings: { ...(business as any)?.settings, hosting_policy: { ...hostingPolicy, checkin_time: e.target.value } } }); }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("dash.content.hosting.checkout")}</label>
                <input
                  type="time"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={hostingPolicy?.checkout_time ?? "11:00"}
                  onChange={e => { setHostingPolicy(p => ({ ...p, checkout_time: e.target.value })); scheduleAutosave({ settings: { ...(business as any)?.settings, hosting_policy: { ...hostingPolicy, checkout_time: e.target.value } } }); }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("dash.content.hosting.cancellation")}</label>
              <select
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                value={hostingPolicy?.cancellation_policy ?? ""}
                onChange={e => { setHostingPolicy(p => ({ ...p, cancellation_policy: e.target.value })); scheduleAutosave({ settings: { ...(business as any)?.settings, hosting_policy: { ...hostingPolicy, cancellation_policy: e.target.value } } }); }}
              >
                <option value="">{t("dash.content.hosting.choose_policy")}</option>
                <option value="flexible">{t("dash.content.hosting.policy_flexible")}</option>
                <option value="moderate">{t("dash.content.hosting.policy_moderate")}</option>
                <option value="strict">{t("dash.content.hosting.policy_strict")}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("dash.content.hosting.pets")}</label>
                <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={hostingPolicy?.pets ?? ""} onChange={e => setHostingPolicy(p => ({ ...p, pets: e.target.value }))}>
                  <option value="">{t("dash.content.hosting.choose")}</option>
                  <option value="no">{t("dash.content.hosting.pets_no")}</option>
                  <option value="yes">{t("dash.content.hosting.pets_yes")}</option>
                  <option value="fee">{t("dash.content.hosting.pets_fee")}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("dash.content.hosting.smoking")}</label>
                <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={hostingPolicy?.smoking ?? ""} onChange={e => setHostingPolicy(p => ({ ...p, smoking: e.target.value }))}>
                  <option value="">{t("dash.content.hosting.choose")}</option>
                  <option value="no">{t("dash.content.hosting.smoking_no")}</option>
                  <option value="outside">{t("dash.content.hosting.smoking_outside")}</option>
                  <option value="yes">{t("dash.content.hosting.smoking_yes")}</option>
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
              <h2 className="text-base font-semibold">{t("dash.content.donations.title")}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("dash.content.donations.subtitle")}
              </p>
            </div>

            {/* Preview */}
            <div className="rounded-xl bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground mb-2 font-medium">{t("dash.content.donations.preview")}</p>
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
                  <label className="text-xs text-muted-foreground">{t("dash.content.donations.button")} {i + 1}</label>
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
              {t("dash.content.donations.tip")}
            </p>
          </div>

          <Button onClick={handleSaveDonations} disabled={isSavingDonations} className="w-full">
            {isSavingDonations && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {t("dash.content.donations.save")}
          </Button>
        </div>
      )}

      {/* Differentiation tab */}
      {activeTab === "differentiation" && (businessType === "realestate" || businessType === "services") && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold">{t("dash.content.diff.title")}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{t("dash.content.diff.subtitle")}</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("dash.content.diff.heading_label")}</Label>
                <Input value={diffHeading} onChange={e => setDiffHeading(e.target.value)} placeholder={t("dash.content.diff.heading_placeholder")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dash.content.diff.subheading_label")}</Label>
                <Input value={diffSubheading} onChange={e => setDiffSubheading(e.target.value)} placeholder={t("dash.content.diff.subheading_placeholder")} />
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{t("dash.content.diff.cards_title")}</p>
                {diffItems.length < 6 && (
                  <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
                    onClick={() => setDiffItems([...diffItems, { icon: "", title: "", body: "" }])}>
                    <Plus className="h-3.5 w-3.5" /> {t("dash.content.diff.add_card")}
                  </Button>
                )}
              </div>
              {diffItems.map((item, i) => (
                <div key={i} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input value={item.icon} onChange={e => { const n = [...diffItems]; n[i] = { ...n[i], icon: e.target.value }; setDiffItems(n); }} placeholder={t("dash.content.diff.icon_placeholder")} className="w-32" />
                    <Input value={item.title} onChange={e => { const n = [...diffItems]; n[i] = { ...n[i], title: e.target.value }; setDiffItems(n); }} placeholder={t("dash.content.diff.card_title_placeholder")} className="flex-1" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => setDiffItems(diffItems.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <Textarea value={item.body} onChange={e => { const n = [...diffItems]; n[i] = { ...n[i], body: e.target.value }; setDiffItems(n); }} placeholder={t("dash.content.diff.card_body_placeholder")} rows={2} />
                </div>
              ))}
              {diffItems.length === 0 && (
                <button type="button" onClick={() => setDiffItems([{ icon: "", title: "", body: "" }])}
                  className="w-full py-6 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 transition-colors">
                  + {t("dash.content.diff.add_first_card")}
                </button>
              )}
            </div>
          </div>
          <Button onClick={handleSaveDiff} disabled={isSavingDiff} className="w-full">
            {isSavingDiff && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {t("dash.content.diff.save")}
          </Button>
        </div>
      )}

      {/* Gallery tab */}
      {activeTab === "gallery" && (businessType === "realestate" || businessType === "services" || businessType === "vacation") && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold">{t("dash.content.gallery.title")}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {businessType === "realestate" ? t("dash.content.gallery.desc_realestate") : businessType === "vacation" ? t("dash.content.gallery.desc_vacation") : t("dash.content.gallery.desc_services")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>{t("dash.content.gallery.heading_label")}</Label>
              <Input value={galleryHeading} onChange={e => setGalleryHeading(e.target.value)}
                placeholder={businessType === "services" ? t("dash.content.gallery.placeholder_services") : t("dash.content.gallery.placeholder_default")} />
            </div>

            <div className="space-y-2">
              <input ref={galleryInputRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isUploadingGallery}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/50 transition-colors w-full justify-center"
              >
                {isUploadingGallery ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {t("dash.content.gallery.upload")}
              </button>
            </div>

            {galleryImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {galleryImages.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img.url} alt={img.caption || `${t("dash.content.gallery.image_alt")} ${i + 1}`} className="w-full aspect-square object-cover rounded-xl border border-border" />
                    <button
                      onClick={() => setGalleryImages(galleryImages.filter((_, j) => j !== i))}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <Input
                      value={img.caption}
                      onChange={e => { const n = [...galleryImages]; n[i] = { ...n[i], caption: e.target.value }; setGalleryImages(n); }}
                      placeholder={t("dash.content.gallery.caption_placeholder")}
                      className="mt-1 text-xs h-7 px-2"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button onClick={handleSaveGallery} disabled={isSavingGallery} className="w-full">
            {isSavingGallery && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {t("dash.content.gallery.save")}
          </Button>
        </div>
      )}

      {/* Lead form tab */}
      {activeTab === "leadform" && (businessType === "realestate" || businessType === "services") && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">{t("dash.content.leadform.title")}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{t("dash.content.leadform.subtitle")}</p>
              </div>
              <button type="button" onClick={() => setLeadFormEnabled(!leadFormEnabled)} className="shrink-0 mt-0.5">
                {leadFormEnabled
                  ? <ToggleRight className="w-10 h-10 text-primary" />
                  : <ToggleLeft className="w-10 h-10 text-muted-foreground" />}
              </button>
            </div>

            {!leadFormEnabled && (
              <div className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground text-center">
                {t("dash.content.leadform.disabled_notice")}
              </div>
            )}

            {leadFormEnabled && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{t("dash.content.leadform.heading_label")}</Label>
                  <Input value={leadFormHeading} onChange={e => setLeadFormHeading(e.target.value)}
                    placeholder={businessType === "realestate" ? t("dash.content.leadform.placeholder_realestate") : t("dash.content.leadform.placeholder_services")} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("dash.content.leadform.subheading_label")}</Label>
                  <Input value={leadFormSubheading} onChange={e => setLeadFormSubheading(e.target.value)}
                    placeholder={t("dash.content.leadform.subheading_placeholder")} />
                </div>
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">{t("dash.content.leadform.preview_title")}</p>
                  <p>• {t("dash.content.leadform.field_name")}</p>
                  <p>• {t("dash.content.leadform.field_phone")}</p>
                  <p>• {t("dash.content.leadform.field_email")}</p>
                  <p>• {t("dash.content.leadform.field_message")}</p>
                </div>
              </div>
            )}
          </div>
          <Button onClick={handleSaveLeadForm} disabled={isSavingLeadForm} className="w-full">
            {isSavingLeadForm && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {t("dash.content.leadform.save")}
          </Button>
        </div>
      )}

      {/* Labels tab */}
      {activeTab === "labels" && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div>
              <h2 className="text-base font-semibold">{t("dash.content.labels.title")}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">{t("dash.content.labels.subtitle")}</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t("dash.content.labels.products_label")}</Label>
                <Input
                  value={labelProducts}
                  onChange={e => setLabelProducts(e.target.value)}
                  placeholder={
                    businessType === "nonprofit" ? t("dash.content.labels.products_ph_nonprofit") :
                    businessType === "realestate" ? t("dash.content.labels.products_ph_realestate") :
                    businessType === "services" ? t("dash.content.labels.products_ph_services") :
                    t("dash.content.labels.products_ph_default")
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dash.content.labels.about_label")}</Label>
                <Input
                  value={labelAbout}
                  onChange={e => setLabelAbout(e.target.value)}
                  placeholder={businessType === "nonprofit" ? t("dash.content.labels.about_ph_nonprofit") : t("dash.content.labels.about_ph_default")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dash.content.labels.cta_label")}</Label>
                <Input
                  value={labelCta}
                  onChange={e => setLabelCta(e.target.value)}
                  placeholder={
                    businessType === "nonprofit" ? t("dash.content.labels.cta_ph_nonprofit") :
                    businessType === "realestate" ? t("dash.content.labels.cta_ph_realestate") :
                    t("dash.content.labels.cta_ph_default")
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("dash.content.labels.gallery_label")}</Label>
                <Input
                  value={labelGallery}
                  onChange={e => setLabelGallery(e.target.value)}
                  placeholder={businessType === "services" ? t("dash.content.labels.gallery_ph_services") : t("dash.content.labels.gallery_ph_default")}
                />
              </div>
            </div>
          </div>
          <Button onClick={handleSaveLabels} disabled={isSavingLabels} className="w-full">
            {isSavingLabels && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            {t("dash.content.labels.save")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DashboardContent;
