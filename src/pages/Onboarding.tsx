import { useState, useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Eye, Info } from "lucide-react";
import logoDarkBg from "@/assets/logo-dark-bg.png";
import { Button } from "@/components/ui/button";
import OnboardingProgress from "@/components/onboarding/OnboardingProgress";
import StepBusinessType from "@/components/onboarding/StepBusinessType";
import StepIdentity from "@/components/onboarding/StepIdentity";
import StepContact from "@/components/onboarding/StepContact";
import StepVisuals from "@/components/onboarding/StepVisuals";
import StepTemplate from "@/components/onboarding/StepTemplate";
import StepProducts from "@/components/onboarding/StepProducts";
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

export type { BusinessCategory };

export interface ProductCategory {
  id: string;
  name: string;
  description?: string;
}

export interface OnboardingData {
  // Step 0: Business Type
  businessType: BusinessType | null;

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

  // Flow: 1=BusinessType, 2=Identity, 3=Contact, 4=Products, 5=Visuals, 6=Finish
  const totalSteps = 6;

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
      
      // Start from last step (finish) in preview mode
      setCurrentStep(5);
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
    if (currentStep === 5) {
      setIsComplete(true);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const getDisplayStep = () => currentStep;

  if (isComplete) {
    return <OnboardingComplete data={data} />;
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <StepBusinessType data={data} updateData={updateData} onNext={nextStep} onBack={() => navigate(-1)} />;
      case 2:
        return <StepIdentity data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />;
      case 3:
        return <StepContact data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />;
      case 4:
        return <StepProducts data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />;
      case 5:
        return <StepTemplate data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />;
      case 6:
        return <StepFinish data={data} updateData={updateData} onBack={prevStep} />;
      default:
        return null;
    }
  };

  return (
    <>
      <SEOHead title="Onboarding | סיאנגו" noindex={true} />
    <div className="theme-refined min-h-screen bg-surface-1">
      {/* Header */}
      <header className="fixed top-0 right-0 left-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container flex items-center justify-between h-16 relative">
          <div className="flex items-center gap-3">
            {isPreviewMode && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm">
                <Eye className="w-4 h-4" />
                <span>מצב תצוגה</span>
              </div>
            )}
          </div>
          
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <img src={logoDarkBg} alt="Siango" className="h-12 w-auto" />
          </div>
          
          <OnboardingProgress currentStep={getDisplayStep()} totalSteps={totalSteps} />
        </div>
      </header>

      {/* Content */}
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          {renderStep()}

          {/* Persistent reassurance - shown on every build step so the merchant
              always knows nothing here is final and everything is editable later. */}
          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3 text-center">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              כל מה שתגדירו כאן - תבנית, צבעים, מוצרים, פרטים - ניתן לשינוי ולעריכה בכל רגע מלוח הניהול. לא מתחייבים לכלום עכשיו.
            </p>
          </div>
        </div>
      </main>
    </div>
    </>
  );
};

export default Onboarding;
