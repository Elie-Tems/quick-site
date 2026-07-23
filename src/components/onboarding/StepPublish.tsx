import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { OnboardingData } from "@/pages/Onboarding";
import { Rocket, ArrowRight, Check, Eye, Edit, Package, CreditCard, Palette, Layout, Circle, Pencil, Globe, AlertCircle, Copy } from "lucide-react";
import { StepNavigation } from "./StepNavigation";
import { toast } from "@/hooks/use-toast";
import { useCreateBusiness } from "@/hooks/useCreateBusiness";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import OnboardingPreview from "./OnboardingPreview";
import { StoreTemplateId, getTemplate } from "@/lib/storeTemplates";
import { getCategoryConfig } from "@/lib/categoryConfig";
import { getPublishFeeIls } from "@/lib/publishPaymentConfig";
import { useLanguage } from "@/contexts/LanguageContext";

interface StepPublishProps {
  data: OnboardingData;
  onNext: () => void;
  onBack: () => void;
  onGoToStep?: (step: number) => void;
  onUpdateData?: (updates: Partial<OnboardingData>) => void;
  isPreviewMode?: boolean;
  existingBusinessId?: string;
}

// Webhook for "site published" / new business created
const BUSINESS_WEBHOOK_URL = import.meta.env.VITE_BUSINESS_WEBHOOK_URL || "";

const skipPublishPayment = import.meta.env.VITE_PUBLISH_SKIP_PAYMENT === "true";

const StepPublish = ({ data, onNext, onBack, onGoToStep, onUpdateData, isPreviewMode, existingBusinessId }: StepPublishProps) => {
  const { t } = useLanguage();
  const [isPublishing, setIsPublishing] = useState(false);
  const [legalAcknowledged, setLegalAcknowledged] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const createBusiness = useCreateBusiness();

  const businessSlug = data.businessName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^֐-׿a-z0-9-]/g, "");

  const siteUrl = `https://${import.meta.env.VITE_WEBSITE_URL}/${businessSlug}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(`https://${import.meta.env.VITE_WEBSITE_URL}/${businessSlug}`);
    toast({
      title: t("ob.pub.copy_title"),
      description: t("ob.pub.copy_desc"),
    });
  };

  const handlePublish = async () => {
    console.log('🚀 Starting publish process...');
    console.log('User:', user ? 'authenticated' : 'not authenticated');
    console.log('Business data:', {
      businessName: data.businessName,
      businessCategory: data.businessCategory,
      customCategoryName: data.customCategoryName,
      hasProducts: data.products.length > 0
    });
    
    // Check if user is authenticated
    if (!user) {
      console.log('❌ User not authenticated, redirecting to login');
      toast({
        title: t("ob.fin.err_login"),
        description: t("ob.pub.login_desc"),
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setIsPublishing(true);
    
    try {
      let result: { businessId: string; slug: string };
      
      // If in preview mode and business already exists, skip creation
      if (isPreviewMode && existingBusinessId) {
        console.log('� Preview mode: Using existing business', existingBusinessId);
        
        // Get existing business slug
        const { data: existingBusiness } = await supabase
          .from('businesses')
          .select('slug')
          .eq('id', existingBusinessId)
          .single();
        
        result = {
          businessId: existingBusinessId,
          slug: existingBusiness?.slug || businessSlug,
        };
        
        console.log('✅ Using existing business for payment');
      } else {
        console.log('📝 Creating new business...');
        
        // Use extracted branding if available, otherwise use template colors
        const branding = data.extractedBranding;
        const template = getTemplate(data.storeTemplate);
        
        // Determine colors - priority: extracted branding > template colors
        const primaryColor = branding?.primaryColor || template.theme.primaryColor;
        const colorPalette = branding?.colorPalette || [
          template.theme.accentColor,
          template.theme.mutedColor,
          template.theme.cardColor,
        ];
        
        // Get categories from business category config (not from template!)
        const categoryConfig = getCategoryConfig(data.businessCategory);
        const categoriesToCreate = data.productCategories?.length 
          ? data.productCategories.slice() 
          : categoryConfig.categories.map((name, index) => ({ 
              id: `config-${index}-${name}`,
              name, 
              description: undefined
            }));
        
        console.log('📎 Using colors:', { primaryColor, colorPalette, template: data.storeTemplate });
        console.log('📁 Using categories from business category:', data.businessCategory, categoriesToCreate);
        
        result = await createBusiness.mutateAsync({
          businessName: data.businessName,
          phone: data.phone,
          email: data.orderEmail,
          slug: businessSlug,
          tagline: branding?.suggestedTagline,
          aboutText: data.aboutText,
          primaryColor,
          colorPalette,
          brandStyle: branding?.brandStyle || 'modern',
          businessCategory: data.businessCategory,
          customCategoryName: data.customCategoryName,
          isReligiousAudience: data.isReligiousAudience,
          businessType: data.businessType,
          paymentEnabled: data.orderType === "orders-payments" && data.paymentConnected,
          paymentProvider: data.paymentProvider || null,
          logo: data.logo,
          heroImageUrl: branding?.heroImageUrl, // Pass the pre-generated hero image URL
          templateId: data.storeTemplate, // Save selected template
          productCategories: categoriesToCreate,
          products: data.products.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            image: p.image,
            imageUrl: p.imageUrl,
            categoryId: p.categoryId,
          })),
        });
      }

      // Webhook will be sent only after payment is completed and user clicks "Publish" button
      toast({
        title: t("ob.fin.saved_title"),
        description: skipPublishPayment
          ? t("ob.pub.saved_desc_skip")
          : t("ob.pub.saved_desc_pay"),
      });

      console.log("✅ Business created successfully:", result);

      if (skipPublishPayment && user) {
        const token = crypto.randomUUID();
        const { error: sessErr } = await supabase.from("publish_checkout_sessions").insert({
          user_id: user.id,
          business_id: result.businessId,
          session_token: token,
          status: "pending",
          amount_ils: getPublishFeeIls(),
          provider: "icount",
        });
        if (sessErr) {
          console.error(sessErr);
          toast({
            title: t("ob.fin.err"),
            description: t("ob.pub.err_skip_now"),
            variant: "destructive",
          });
          return;
        }
        const { data: fin, error: finErr } = await supabase.functions.invoke("finalize-publish", {
          body: { sessionToken: token },
        });
        if (fin?.legalNotApproved) {
          toast({
            title: t("ob.fin.built_title"),
            description: t("ob.fin.built_desc"),
          });
          navigate("/dashboard");
          return;
        }
        if (finErr || !fin?.ok) {
          toast({
            title: t("ob.pub.dev_skip_title"),
            description: t("ob.pub.dev_skip_desc"),
            variant: "destructive",
          });
          navigate(`/publish-payment?businessId=${encodeURIComponent(result.businessId)}`, {
            state: { onboardingData: data },
          });
          return;
        }
        navigate("/onboarding/complete", { state: { data } });
        return;
      }

      // Redirect to dashboard instead of payment page
      navigate("/dashboard");
    } catch (error: any) {
      console.error('❌ Failed to publish:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
      });
      toast({
        title: t("ob.fin.err_publish"),
        description: error.message || t("ob.fin.err_generic"),
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const summaryItems = [
    {
      icon: Globe,
      label: t("ob.fin.s_name"),
      value: data.businessName,
    },
    {
      icon: Package,
      label: t("ob.fin.products"),
      value: `${data.products.length} ${t("ob.fin.products")}`,
    },
    {
      icon: CreditCard,
      label: t("ob.pub.order_type"),
      value: data.orderType === "orders-payments" ? t("ob.pub.ot_pay") : t("ob.pub.ot_only"),
    },
  ];

  if (data.orderType === "orders-payments") {
    summaryItems.push({
      icon: Check,
      label: t("ob.pub.s_pay"),
      value: data.paymentConnected ? t("ob.pub.connected") : t("ob.pub.not_connected"),
    });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <span className="inline-block text-sm font-semibold text-primary mb-3 px-3 py-1 rounded-full bg-primary/10">
          {t("ob.pub.last_step")}
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          {t("ob.pub.ready")}
        </h1>
        <p className="text-muted-foreground">
          {skipPublishPayment ? t("ob.pub.ready_sub_skip") : t("ob.pub.ready_sub_pay")}
        </p>
      </div>

      {/* Auth warning if not logged in */}
      {!user && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">{t("ob.fin.err_login")}</p>
            <p className="text-sm text-muted-foreground">
              {t("ob.pub.auth_warn_desc")}
            </p>
          </div>
        </div>
      )}

      {/* Preview Section */}
      <OnboardingPreview 
        data={data} 
        onEditStep={(step) => onGoToStep?.(step)}
        onUpdateTemplate={(templateId: StoreTemplateId) => onUpdateData?.({ storeTemplate: templateId })}
        onUpdateData={onUpdateData}
      />

      {/* Summary */}
      <div className="p-6 rounded-xl bg-card border border-border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{t("ob.pub.summary")}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-xs gap-1"
          >
            <Pencil className="w-3 h-3" />
            {t("ob.pub.edit")}
          </Button>
        </div>
        <div className="space-y-3">
          {summaryItems.map((item, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-1 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-muted-foreground">{item.label}</span>
              </div>
              <span className="font-medium text-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* URL Preview */}
      <div className="p-6 rounded-xl gradient-border bg-card space-y-3">
        <h3 className="font-semibold text-foreground">{t("oc.url_label")}</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 p-3 rounded-lg bg-surface-1 font-mono text-sm text-foreground" dir="ltr">
           {siteUrl}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopyUrl}
            className="shrink-0"
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("ob.pub.domain_hint")}
        </p>
      </div>

      {/* Legal acknowledgment - non-blocking baseline, but must be confirmed once */}
      <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">{t("ob.pub.legal_title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("ob.pub.legal_body")}
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={legalAcknowledged}
            onChange={(e) => setLegalAcknowledged(e.target.checked)}
            className="mt-1 w-4 h-4 accent-primary flex-shrink-0"
          />
          <span className="text-sm text-foreground">
            {t("ob.pub.legal_ack")}
          </span>
        </label>
      </div>

      {/* Publish button */}
      <Button
        variant="hero"
        size="xl"
        className="w-full"
        onClick={handlePublish}
        disabled={isPublishing || !legalAcknowledged}
      >
        {isPublishing ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {t("ob.pub.publishing")}
          </>
        ) : (
          <>
            <Rocket className="w-5 h-5" />
            {skipPublishPayment ? t("ob.pub.complete_dev") : t("ob.pub.save_all")}
          </>
        )}
      </Button>

      {/* Reassurance: nothing here is final */}
      <p className="text-center text-sm text-muted-foreground mt-3">
        {t("ob.pub.reassure")}
      </p>

      {/* Navigation - just back button for this step */}
      <div className="pt-2">
        <Button
          variant="ghost"
          size="lg"
          onClick={onBack}
          className="w-full gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          {t("ob.pub.back_edit")}
        </Button>
      </div>
    </div>
  );
};

export default StepPublish;
