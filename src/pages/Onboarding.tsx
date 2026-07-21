import { useState, useEffect } from "react";
import { hebrewToSlug } from "@/lib/utils";
import SEOHead from "@/components/SEOHead";
import { useNavigate, Link } from "react-router-dom";
import { Eye, Store, Building2, Phone, Package, Rocket, Check, ArrowLeft, Clock, CreditCard, Globe, Image, Wand2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AuroraBg, Card, PreviewLogo, PreviewThemeRoot, ThemeToggle } from "@/components/preview-redesign/kit";
import StepBusinessType from "@/components/onboarding/StepBusinessType";
import StepIdentity from "@/components/onboarding/StepIdentity";
import StepContentAI from "@/components/onboarding/StepContentAI";
import StepContact from "@/components/onboarding/StepContact";
import StepProducts from "@/components/onboarding/StepProducts";
import StepBannerUpload from "@/components/onboarding/StepBannerUpload";
import OnboardingComplete from "@/components/onboarding/OnboardingComplete";
import { StoreTemplateId, getTemplate } from "@/lib/storeTemplates";
import { BusinessCategory, getCategoryConfig } from "@/lib/categoryConfig";
import { BusinessType } from "@/components/onboarding/StepBusinessType";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMyBusiness } from "@/hooks/useBusiness";
import { useProducts } from "@/hooks/useProducts";
import { useBanners } from "@/hooks/useBanners";
import { useProductCategories } from "@/hooks/useProductCategories";
import { cleanImageUrl } from "@/lib/imageUrl";
import { useCreateBusiness } from "@/hooks/useCreateBusiness";
import { getPublishFeeIls } from "@/lib/publishPaymentConfig";
import { toast } from "@/hooks/use-toast";

const SUB_TYPE_TO_CATEGORY: Record<string, BusinessCategory> = {
  fashion: 'clothing', bakery: 'bakery', 'general-store': 'other',
  food: 'restaurant', jewelry: 'jewelry', 'home-decor': 'home',
  electronics: 'electronics', sports: 'other', cosmetics: 'beauty',
  pets: 'pets', books: 'books', flowers: 'flowers',
  beauty: 'beauty', barber: 'beauty', fitness: 'fitness',
  renovation: 'handmade', photography: 'art', vacation: 'other',
  broker: 'other', health: 'other', consulting: 'other',
  legal: 'other', developer: 'other', 'car-dealer': 'automotive',
  charity: 'other', crowdfunding: 'other', community: 'other',
  education: 'other', social: 'other', animals: 'pets',
  'torah-center': 'other', synagogue: 'other',
};

const SUB_TYPE_LABELS: Record<string, string> = {
  fashion: 'אופנה / בוטיק', bakery: 'מאפייה / קונדיטוריה', 'general-store': 'חנות כללית',
  food: 'מזון ומשקאות', jewelry: 'תכשיטים / עבודות יד', 'home-decor': 'מוצרי בית / עיצוב',
  electronics: 'אלקטרוניקה', sports: 'ספורט וציוד', cosmetics: 'קוסמטיקה / טיפוח',
  pets: 'חיות מחמד', books: 'ספרים', flowers: 'פרחים ומתנות',
  beauty: 'קוסמטיקה / יופי', barber: 'מספרה', fitness: 'כושר / פילאטיס',
  renovation: 'שיפוצים / בנייה', photography: 'צילום', vacation: 'צימר / נופש',
  broker: 'מתווך / נדל"ן', health: 'בריאות / קליניקה', consulting: 'ייעוץ עסקי',
  legal: 'עו"ד / רו"ח', developer: 'יזם / פרויקט נדל"ן', 'car-dealer': 'רכב / מכירות',
  charity: 'תרומות כלליות', crowdfunding: 'גיוס המונים', community: 'קהילה',
  education: 'חינוך / עמותת ילדים', social: 'רווחה חברתית', animals: 'הגנת בעלי חיים',
  synagogue: 'מרכז תורני / קהילה', 'torah-center': 'מרכז תורני / ישיבה',
};

// labelKey resolves with t() at render so the publish overlay + step bar follow
// the merchant's language. See ob.shell.* in the translation files.
const PUBLISH_STAGES = [
  { at: 0, labelKey: "ob.shell.publish.building" },
  { at: 25, labelKey: "ob.shell.publish.uploading" },
  { at: 55, labelKey: "ob.shell.publish.styling" },
  { at: 80, labelKey: "ob.shell.publish.publishing" },
];

const ONBOARDING_STEPS = [
  { id: 1, labelKey: "ob.shell.step.domain", icon: Store },
  { id: 2, labelKey: "ob.shell.step.details", icon: Building2 },
  { id: 3, labelKey: "ob.shell.step.content", icon: Wand2 },
  { id: 4, labelKey: "ob.shell.step.contact", icon: Phone },
  { id: 5, labelKey: "ob.shell.step.products", icon: Package },
  { id: 6, labelKey: "ob.shell.step.slider", icon: Image },
];

export type { BusinessCategory };

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
}

export interface OnboardingData {
  // Step 0: Business Type
  businessType: BusinessType | null;
  businessSubType?: string;

  // Step 1: Brand Style
  brandSource: "website" | "upload" | "auto";
  websiteUrl?: string;
  extractedBranding?: {
    primaryColor: string;
    brandStyle: 'modern' | 'minimal' | 'bold' | 'elegant';
    suggestedTagline: string;
    businessDescription: string;
    colorPalette: string[];
    websiteTitle?: string;
    heroImageUrl?: string;
  };
  
  // Step 2: Template Selection
  storeTemplate: StoreTemplateId;
  
  // Step 3: Business Details
  businessName: string;
  businessCategory: BusinessCategory;
  customCategoryName?: string;
  bannerStyle: 'products-only' | 'atmosphere' | 'with-people' | 'abstract';
  phone: string;
  address: string;
  orderEmail: string;
  logo?: File | null;
  socialLinks: {
    facebook?: string;
    instagram?: string;
  };
  businessHours: string;
  isReligiousAudience: boolean;
  
  // Step 4: Order Type
  orderType: "orders-only" | "orders-payments";
  
  // Step 5: Products
  productOrganization: "free" | "categories";
  productCategories: ProductCategory[];
  products: Array<{
    id: string;
    name: string;
    description: string;
    price: number | null;
    sku?: string;
    image?: File | null;
    imageUrl?: string;
    categoryId?: string;
  }>;
  
  // AI-generated content
  heroTitle?: string;
  tagline?: string;
  aboutText?: string;
  heroBenefits?: string;
  promoText?: string;

  // Step 6: Payments
  paymentProvider?: "payplus" | "icredit" | "cardcom" | "paypal" | null;
  paymentConnected: boolean;
}

const Onboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: existingBusiness, isLoading: businessLoading } = useMyBusiness();
  const { data: existingProducts } = useProducts(existingBusiness?.id);
  const { data: existingBanners } = useBanners(existingBusiness?.id);
  const { categories: existingCategories } = useProductCategories(existingBusiness?.id);
  
  const createBusiness = useCreateBusiness();
  const [currentStep, setCurrentStep] = useState(1);
  const [isComplete, setIsComplete] = useState(false);
  const [hasUpdatedStatus, setHasUpdatedStatus] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  
  const [data, setData] = useState<OnboardingData>({
    businessType: null,
    brandSource: "upload",
    storeTemplate: "luxury-boutique", // Default template since step 3 was removed
    businessName: localStorage.getItem("onboarding_business") || "",
    businessCategory: "other",
    bannerStyle: "products-only",
    phone: "",
    address: "",
    orderEmail: localStorage.getItem("onboarding_email") || "",
    socialLinks: {
      facebook: "",
      instagram: "",
    },
    businessHours: "",
    isReligiousAudience: false,
    orderType: "orders-only",
    productOrganization: "free",
    productCategories: [],
    products: [],
    paymentConnected: false,
  });

  // Flow: 1=BusinessType, 2=Identity, 3=Contact, 4=Products, 5=BannerUpload, 6=Template, 7=Finish
  const totalSteps = 7;

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // "+ new site" (?new=1): an existing account creating an ADDITIONAL site. Start fresh
  // (don't resume/edit the current site) so onboarding creates a brand-new business.
  const isNewSite = new URLSearchParams(window.location.search).get("new") === "1";

  // Load existing business data if exists and not published (preview mode)
  useEffect(() => {
    if (businessLoading || dataLoaded) return;

    if (existingBusiness && !existingBusiness.is_published && !isNewSite) {
      console.log("Loading existing unpublished business data for preview");
      setIsPreviewMode(true);
      
      // Load business data into onboarding state
      const biz = existingBusiness as any;
      const loadedData: Partial<OnboardingData> = {
        businessName: biz.name,
        businessCategory: (biz.business_category as BusinessCategory) || "other",
        phone: biz.phone || "",
        address: biz.delivery_address || biz.address || "",
        orderEmail: biz.email || biz.order_email || "",
        storeTemplate: (biz.template_id || biz.store_template) as StoreTemplateId || "" as any,
        socialLinks: {
          facebook: biz.facebook_url || "",
          instagram: biz.instagram_url || "",
        },
        businessHours: biz.business_hours || "",
        isReligiousAudience: biz.is_religious_audience || false,
        orderType: biz.payment_enabled ? "orders-payments" : "orders-only",
        paymentConnected: biz.payment_enabled || false,
        paymentProvider: biz.payment_provider as any,
      };
      
      // Load products
      if (existingProducts && existingProducts.length > 0) {
        loadedData.products = existingProducts.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || "",
          price: p.price,
          sku: (p as any).sku,
          imageUrl: cleanImageUrl(p.image_url),
          categoryId: (p as any).category_id,
        }));
      }
      
      // Load categories
      if (existingCategories && existingCategories.length > 0) {
        loadedData.productOrganization = "categories";
        loadedData.productCategories = existingCategories.map(c => ({
          id: c.id,
          name: c.name,
          description: c.description,
        }));
      }
      
      setData(prev => ({ ...prev, ...loadedData }));
      setDataLoaded(true);

      // Business exists but not published — send directly to dashboard to avoid blank step
      navigate("/dashboard");
      return;
    } else if (!businessLoading && !existingBusiness) {
      setDataLoaded(true);
    }
  }, [existingBusiness, existingProducts, existingCategories, businessLoading, dataLoaded]);
  
  // Update user status to "onboarding_started" when they enter the onboarding flow
  useEffect(() => {
    const updateUserStatus = async () => {
      if (user && !hasUpdatedStatus && !isPreviewMode) {
        try {
          await supabase
            .from('profiles')
            .update({ status: 'onboarding_started' })
            .eq('user_id', user.id);
          setHasUpdatedStatus(true);
        } catch (error) {
          console.error('Failed to update user status:', error);
        }
      }
    };
    updateUserStatus();
  }, [user, hasUpdatedStatus, isPreviewMode]);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const getDisplayStep = () => currentStep;

  const handleFinish = async (latestData: OnboardingData) => {
    if (!user) {
      toast({ title: t("ob.fin.err_login"), variant: "destructive" });
      navigate("/login");
      return;
    }
    setIsCreating(true);
    setPublishProgress(8);
    const iv = setInterval(() => {
      setPublishProgress(p => (p < 92 ? p + Math.max(1, Math.round((92 - p) / 12)) : p));
    }, 400);
    try {
      const branding = latestData.extractedBranding;
      const template = getTemplate(latestData.storeTemplate);
      const primaryColor = branding?.primaryColor || template.theme.primaryColor;
      const colorPalette = branding?.colorPalette || [
        template.theme.accentColor, template.theme.mutedColor, template.theme.cardColor,
      ];
      const businessTypeLabels: Record<string, string> = { products: "מוצרים", services: "שירותים", nonprofit: "עמותה" };
      const resolvedCategory: BusinessCategory =
        (latestData.businessSubType ? SUB_TYPE_TO_CATEGORY[latestData.businessSubType] : null)
        || (latestData.businessCategory !== "other" ? latestData.businessCategory : null)
        || 'other';
      const effectiveCustomName = latestData.customCategoryName
        || (latestData.businessSubType ? SUB_TYPE_LABELS[latestData.businessSubType] : null)
        || (latestData.businessType ? businessTypeLabels[latestData.businessType] : undefined);
      const categoryConfig = getCategoryConfig(resolvedCategory);
      const categoriesToCreate = latestData.productCategories?.length
        ? latestData.productCategories.slice()
        : categoryConfig.categories.map((name, idx) => ({ id: `config-${idx}-${name}`, name, description: undefined }));

      const slug = hebrewToSlug(latestData.businessName);

      const result = await createBusiness.mutateAsync({
        businessName: latestData.businessName,
        phone: latestData.phone,
        email: latestData.orderEmail,
        slug,
        tagline: latestData.tagline || branding?.suggestedTagline,
        heroTitle: latestData.heroTitle,
        aboutText: latestData.aboutText,
        heroBenefits: latestData.heroBenefits,
        promoText: latestData.promoText,
        primaryColor,
        colorPalette,
        brandStyle: branding?.brandStyle || "modern",
        businessCategory: resolvedCategory,
        customCategoryName: effectiveCustomName,
        isReligiousAudience: latestData.isReligiousAudience,
        businessType: latestData.businessType,
        businessSubType: latestData.businessSubType,
        address: latestData.address,
        socialLinks: latestData.socialLinks,
        businessHours: latestData.businessHours,
        paymentEnabled: false,
        paymentProvider: null,
        logo: latestData.logo,
        heroImageUrl: branding?.heroImageUrl,
        templateId: latestData.storeTemplate,
        productCategories: categoriesToCreate,
        products: latestData.products.map(p => ({
          id: p.id, name: p.name, description: p.description, price: p.price,
          image: p.image, imageUrl: p.imageUrl, categoryId: p.categoryId,
        })),
      });

      const skipPublishPayment = import.meta.env.VITE_PUBLISH_SKIP_PAYMENT === "true";
      if (skipPublishPayment) {
        const token = crypto.randomUUID();
        await supabase.from("publish_checkout_sessions").insert({
          user_id: user.id, business_id: result.businessId,
          session_token: token, status: "pending",
          amount_ils: getPublishFeeIls(), provider: "icount",
        });
        const { data: fin } = await supabase.functions.invoke("finalize-publish", { body: { sessionToken: token } });
        if (fin?.ok) { navigate("/onboarding/complete", { state: { data: latestData } }); return; }
      }
      navigate(`/publish-payment?businessId=${encodeURIComponent(result.businessId)}`, { state: { onboardingData: latestData } });
    } catch (error: any) {
      toast({ title: t("ob.create.err_title"), description: error.message || t("ob.fin.err_generic"), variant: "destructive" });
      setIsCreating(false);
    } finally {
      clearInterval(iv);
    }
  };

  if (isComplete) {
    return <OnboardingComplete data={data} />;
  }

  if (isCreating) {
    const stage = [...PUBLISH_STAGES].reverse().find(s => publishProgress >= s.at) || PUBLISH_STAGES[0];
    return (
      <PreviewThemeRoot>
        <AuroraBg />
        <div className="min-h-screen flex flex-col items-center justify-center px-4" dir="rtl">
          <div className="space-y-8 w-full max-w-md py-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Rocket className="w-7 h-7 text-primary animate-pulse" />
              </div>
              <h1 className="text-2xl font-medium pv-strong">{t("ob.fin.building")}</h1>
              <p className="text-sm pv-muted">{t(stage.labelKey)}</p>
            </div>
            <div className="space-y-4">
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-primary transition-all duration-500 ease-out rounded-full" style={{ width: `${publishProgress}%` }} />
              </div>
              <p className="text-center text-xs font-medium pv-muted">{Math.round(publishProgress)}%</p>
              <div className="space-y-2.5 pt-2">
                {PUBLISH_STAGES.map((s, i) => {
                  const nextAt = PUBLISH_STAGES[i + 1]?.at ?? 100;
                  const done = publishProgress >= nextAt;
                  const active = stage.at === s.at && !done;
                  return (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-primary text-white" : active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {done ? <Check className="w-3.5 h-3.5" /> : active ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                      </div>
                      <span className={active ? "pv-strong font-medium" : done ? "pv-muted" : "pv-faint"}>{t(s.labelKey)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </PreviewThemeRoot>
    );
  }

  if (currentStep === 0) {
    return (
      <>
        <SEOHead title={t("ob.welcome.seo_title")} />
        <PreviewThemeRoot>
          <AuroraBg />
          <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16" dir="rtl">
            <PreviewLogo className="h-10 w-auto mb-12" />

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="max-w-lg w-full text-center">
              <h1 className="text-4xl md:text-5xl font-display font-bold pv-strong leading-tight mb-4">
                {t("ob.welcome.title_line1")}<br />
                <span className="bg-gradient-to-l from-primary via-emerald-400 to-lime-500 bg-clip-text text-transparent">{t("ob.welcome.title_line2")}</span>
              </h1>
              <p className="text-lg pv-muted mb-10">{t("ob.welcome.subtitle")}</p>

              <div className="flex flex-col gap-3 mb-10 text-right">
                {[
                  { icon: Clock, key: "ob.welcome.feat1" },
                  { icon: CreditCard, key: "ob.welcome.feat2" },
                  { icon: Globe, key: "ob.welcome.feat3" },
                ].map(({ icon: Icon, key }) => (
                  <div key={key} className="flex items-center gap-3 px-4 py-3 rounded-xl pv-surface2 border pv-border">
                    <Icon className="w-5 h-5 text-primary shrink-0" />
                    <span className="pv-text text-sm">{t(key)}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setCurrentStep(1)}
                className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow mb-4">
                {t("ob.welcome.cta")} <ArrowLeft className="w-5 h-5" />
              </button>
              <p className="text-xs pv-faint">
                {t("ob.welcome.have_account")}{" "}
                <Link to="/login" className="text-primary underline underline-offset-2">{t("ob.welcome.login")}</Link>
              </p>
            </motion.div>
          </div>
        </PreviewThemeRoot>
      </>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepBusinessType data={data} updateData={updateData} onNext={nextStep} onBack={() => navigate(-1)} />;
      case 2:
        return <StepIdentity data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />;
      case 3:
        return <StepContentAI data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />;
      case 4:
        return <StepContact data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />;
      case 5:
        return <StepProducts data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />;
      case 6:
        return <StepBannerUpload data={data} updateData={updateData} onNext={() => handleFinish(data)} onBack={prevStep} />;
      default:
        return null;
    }
  };

  const pct = (Math.min(currentStep, 6) / 6) * 100;

  return (
    <>
      <SEOHead title="Onboarding | סיאנגו" noindex={true} />
      <PreviewThemeRoot>
        <AuroraBg />
        <div className="max-w-2xl mx-auto px-4 py-10 min-h-screen" dir="rtl">

          {/* Logo + preview badge */}
          <div className="flex items-center justify-between mb-8">
            <ThemeToggle />
            <PreviewLogo className="h-10 w-auto" />
            {isPreviewMode ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full text-xs text-primary">
                <Eye className="w-3.5 h-3.5" />
                {t("ob.welcome.preview_mode")}
              </div>
            ) : <div className="w-20" />}
          </div>

          {/* Step indicators — only shown for steps 1-6 */}
          {currentStep <= 6 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                {ONBOARDING_STEPS.map((s) => {
                  const done = s.id < currentStep;
                  const on = s.id === currentStep;
                  return (
                    <div key={s.id} className="flex flex-col items-center gap-2 flex-1">
                      <motion.div
                        animate={{ scale: on ? 1.1 : 1 }}
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-colors ${
                          done ? "bg-primary border-primary text-white"
                            : on ? "bg-primary/15 border-primary/50 text-primary"
                            : "pv-surface2 pv-border pv-faint"
                        }`}
                      >
                        {done ? <Check className="w-5 h-5" /> : <s.icon className="w-5 h-5" />}
                      </motion.div>
                      <span className={`text-[11px] md:text-xs text-center ${on ? "text-primary font-medium" : "pv-muted"}`}>{t(s.labelKey)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="h-1.5 rounded-full pv-surface2 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-l from-primary via-emerald-400 to-lime-500"
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}

          {/* Step content */}
          {currentStep <= 7 ? (
            <Card className="p-6 md:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>
            </Card>
          ) : (
            renderStep()
          )}

          {currentStep <= 7 && (
            <p className="text-center pv-faint text-xs mt-5">
              {t("ob.shell.reassure")}
            </p>
          )}
        </div>
      </PreviewThemeRoot>
    </>
  );
};

export default Onboarding;
