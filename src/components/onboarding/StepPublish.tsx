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
  const [isPublishing, setIsPublishing] = useState(false);
  const [legalAcknowledged, setLegalAcknowledged] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const createBusiness = useCreateBusiness();

  const businessSlug = data.businessName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0590-\u05ffa-z0-9-]/g, "");
  
  const siteUrl = `https://${import.meta.env.VITE_WEBSITE_URL}/store/${businessSlug}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(`https://${import.meta.env.VITE_WEBSITE_URL}/store/${businessSlug}`);
    toast({
      title: "הכתובת הועתקה",
      description: "הכתובת הועתקה ללוח",
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
        title: "נדרשת התחברות",
        description: "יש להתחבר כדי לפרסם את האתר",
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
          primaryColor,
          colorPalette,
          brandStyle: branding?.brandStyle || 'modern',
          businessCategory: data.businessCategory,
          customCategoryName: data.customCategoryName,
          isReligiousAudience: data.isReligiousAudience,
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
        title: "החנות נשמרה",
        description: skipPublishPayment
          ? "מעבירים להשלמה…"
          : "ממשיכים לתשלום לפרסום בכתובת הציבורית",
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
            title: "שגיאה",
            description: "לא ניתן לדלג על תשלום כעת",
            variant: "destructive",
          });
          return;
        }
        const { data: fin, error: finErr } = await supabase.functions.invoke("finalize-publish", {
          body: { sessionToken: token },
        });
        if (finErr || !fin?.ok) {
          toast({
            title: "דילוג תשלום (פיתוח)",
            description:
              "הגדירו ב-Supabase סוד ALLOW_UNVERIFIED_PUBLISH=true או השלימו תשלום רגיל.",
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
        title: "שגיאה בפרסום",
        description: error.message || "משהו השתבש, נסה שוב",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const summaryItems = [
    {
      icon: Globe,
      label: "שם העסק",
      value: data.businessName,
    },
    {
      icon: Package,
      label: "מוצרים",
      value: `${data.products.length} מוצרים`,
    },
    {
      icon: CreditCard,
      label: "סוג הזמנות",
      value: data.orderType === "orders-payments" ? "הזמנות + סליקה" : "הזמנות בלבד",
    },
  ];

  if (data.orderType === "orders-payments") {
    summaryItems.push({
      icon: Check,
      label: "סליקה",
      value: data.paymentConnected ? "מחובר" : "לא מחובר",
    });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <span className="inline-block text-sm font-semibold text-primary mb-3 px-3 py-1 rounded-full bg-primary/10">
          שלב אחרון
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          הכל מוכן לפרסום! 🎉
        </h1>
        <p className="text-muted-foreground">
          {skipPublishPayment
            ? "בדוק את הפרטים ולחץ להשלמה (מצב פיתוח ללא תשלום)"
            : "בדוק את הפרטים - נשמור את החנות ונמשיך לתשלום לפרסום בכתובת הציבורית"}
        </p>
      </div>

      {/* Auth warning if not logged in */}
      {!user && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">נדרשת התחברות</p>
            <p className="text-sm text-muted-foreground">
              יש להתחבר כדי לפרסם את האתר. לחיצה על "האתר באוויר" תעביר אותך להתחברות.
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
          <h3 className="font-semibold text-foreground">סיכום</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-xs gap-1"
          >
            <Pencil className="w-3 h-3" />
            ערוך
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
        <h3 className="font-semibold text-foreground">כתובת האתר שלך</h3>
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
          ניתן לחבר דומיין מותאם אישית בהמשך
        </p>
      </div>

      {/* Legal acknowledgment - non-blocking baseline, but must be confirmed once */}
      <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">⚖️ נושאים משפטיים</h3>
        <p className="text-sm text-muted-foreground">
          לאתר שלך נוצרו אוטומטית <strong className="text-foreground">תקנון</strong> ו
          <strong className="text-foreground">מדיניות פרטיות</strong> (תבנית בסיסית). ניתן לערוך אותם בכל עת
          בלוח הניהול תחת "מסמכים משפטיים".
        </p>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={legalAcknowledged}
            onChange={(e) => setLegalAcknowledged(e.target.checked)}
            className="mt-1 w-4 h-4 accent-primary flex-shrink-0"
          />
          <span className="text-sm text-foreground">
            קראתי והבנתי שהתקנון ומדיניות הפרטיות הם תבנית בלבד, ושהאחריות המשפטית לבדיקתם והתאמתם לעסק מוטלת עליי.
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
            מפרסם את האתר...
          </>
        ) : (
          <>
            <Rocket className="w-5 h-5" />
            {skipPublishPayment ? "השלם (פיתוח)" : "שמור הכל"}
          </>
        )}
      </Button>

      {/* Reassurance: nothing here is final */}
      <p className="text-center text-sm text-muted-foreground mt-3">
        ✏️ אל דאגה - תוכלו לערוך הכל (טקסטים, מוצרים, צבעים ועיצוב) גם אחרי שהאתר יהיה באוויר.
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
          חזרה לעריכה
        </Button>
      </div>
    </div>
  );
};

export default StepPublish;
