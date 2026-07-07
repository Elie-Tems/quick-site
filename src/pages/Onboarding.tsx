import { useState, useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import { useNavigate, Link } from "react-router-dom";
import { Eye, Store, Building2, Phone, Package, Palette, Rocket, Check, ArrowLeft, Clock, CreditCard, Globe, Image, Wand2 } from "lucide-react";
import logoDarkBg from "@/assets/logo-dark-bg.png";
import { motion, AnimatePresence } from "framer-motion";
import { AuroraBg, Card, PreviewThemeRoot } from "@/components/preview-redesign/kit";
import StepBusinessType from "@/components/onboarding/StepBusinessType";
import StepIdentity from "@/components/onboarding/StepIdentity";
import StepContentAI from "@/components/onboarding/StepContentAI";
import StepContact from "@/components/onboarding/StepContact";
import StepTemplate from "@/components/onboarding/StepTemplate";
import StepProducts from "@/components/onboarding/StepProducts";
import StepBannerUpload from "@/components/onboarding/StepBannerUpload";
import StepFinish from "@/components/onboarding/StepFinish";
import OnboardingComplete from "@/components/onboarding/OnboardingComplete";
import { StoreTemplateId } from "@/lib/storeTemplates";
import { BusinessCategory } from "@/lib/categoryConfig";
import { BusinessType } from "@/components/onboarding/StepBusinessType";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness } from "@/hooks/useBusiness";
import { useProducts } from "@/hooks/useProducts";
import { useBanners } from "@/hooks/useBanners";
import { useProductCategories } from "@/hooks/useProductCategories";

const ONBOARDING_STEPS = [
  { id: 1, label: "תחום", icon: Store },
  { id: 2, label: "פרטים", icon: Building2 },
  { id: 3, label: "תוכן", icon: Wand2 },
  { id: 4, label: "קשר", icon: Phone },
  { id: 5, label: "מוצרים", icon: Package },
  { id: 6, label: "סליידר", icon: Image },
  { id: 7, label: "תבנית", icon: Palette },
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
    price: number;
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
  const { data: existingBusiness, isLoading: businessLoading } = useMyBusiness();
  const { data: existingProducts } = useProducts(existingBusiness?.id);
  const { data: existingBanners } = useBanners(existingBusiness?.id);
  const { categories: existingCategories } = useProductCategories(existingBusiness?.id);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isComplete, setIsComplete] = useState(false);
  const [hasUpdatedStatus, setHasUpdatedStatus] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  
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

  // Load existing business data if exists and not published (preview mode)
  useEffect(() => {
    if (businessLoading || dataLoaded) return;
    
    if (existingBusiness && !existingBusiness.is_published) {
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
          imageUrl: p.image_url || undefined,
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
      
      // Start from template step in preview mode
      setCurrentStep(7);
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

  if (isComplete) {
    return <OnboardingComplete data={data} />;
  }

  // Template step gets its own full-screen layout — no card, no progress bar
  if (currentStep === 7) {
    return (
      <>
        <SEOHead title="בחרו תבנית | סיאנגו" noindex={true} />
        <PreviewThemeRoot>
          <StepTemplate data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />
        </PreviewThemeRoot>
      </>
    );
  }

  if (currentStep === 0) {
    return (
      <>
        <SEOHead title="בניית אתר לעסק | סיאנגו" />
        <PreviewThemeRoot>
          <AuroraBg />
          <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16" dir="rtl">
            <img src={logoDarkBg} alt="Siango" className="h-10 w-auto mb-12" />

            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="max-w-lg w-full text-center">
              <h1 className="text-4xl md:text-5xl font-display font-bold pv-strong leading-tight mb-4">
                האתר שלכם<br />
                <span className="bg-gradient-to-l from-primary via-emerald-400 to-lime-500 bg-clip-text text-transparent">מוכן תוך 5 דקות</span>
              </h1>
              <p className="text-lg pv-muted mb-10">בלי מפתחים, בלי עלויות גבוהות, בלי כאב ראש.</p>

              <div className="flex flex-col gap-3 mb-10 text-right">
                {[
                  { icon: Clock, text: "תהליך הקמה של 5 דקות בלבד" },
                  { icon: CreditCard, text: "69 ₪ לחודש, ללא התחייבות" },
                  { icon: Globe, text: "דומיין, סליקה ומייל כלולים" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 px-4 py-3 rounded-xl pv-surface2 border pv-border">
                    <Icon className="w-5 h-5 text-primary shrink-0" />
                    <span className="pv-text text-sm">{text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setCurrentStep(1)}
                className="w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow mb-4">
                בואו נתחיל <ArrowLeft className="w-5 h-5" />
              </button>
              <p className="text-xs pv-faint">
                כבר יש לכם חשבון?{" "}
                <Link to="/login" className="text-primary underline underline-offset-2">כניסה</Link>
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
        return <StepBannerUpload data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />;
      case 7:
        return <StepTemplate data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />;
      case 8:
        return <StepFinish data={data} updateData={updateData} onBack={prevStep} />;
      default:
        return null;
    }
  };

  const pct = (Math.min(currentStep, 7) / 7) * 100;

  return (
    <>
      <SEOHead title="Onboarding | סיאנגו" noindex={true} />
      <PreviewThemeRoot>
        <AuroraBg />
        <div className="max-w-2xl mx-auto px-4 py-10 min-h-screen" dir="rtl">

          {/* Logo + preview badge */}
          <div className="flex items-center justify-between mb-8">
            <div className="w-24" />
            <img src={logoDarkBg} alt="Siango" className="h-10 w-auto" />
            {isPreviewMode ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full text-xs text-primary">
                <Eye className="w-3.5 h-3.5" />
                מצב תצוגה
              </div>
            ) : <div className="w-24" />}
          </div>

          {/* Step indicators — only shown for steps 1-5 */}
          {currentStep <= 7 && (
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
                      <span className={`text-[11px] md:text-xs text-center ${on ? "text-primary font-medium" : "pv-muted"}`}>{s.label}</span>
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
              כל הפרטים ניתנים לשינוי בכל עת מלוח הניהול
            </p>
          )}
        </div>
      </PreviewThemeRoot>
    </>
  );
};

export default Onboarding;
