import { useState, useEffect } from "react";
import { OnboardingData } from "@/pages/Onboarding";
import { Check, Rocket, Loader2, Info, CreditCard } from "lucide-react";
import { useCreateBusiness } from "@/hooks/useCreateBusiness";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getTemplate } from "@/lib/storeTemplates";
import { getCategoryConfig, BusinessCategory } from "@/lib/categoryConfig";
import { getPublishFeeIls } from "@/lib/publishPaymentConfig";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onBack: () => void;
}

const skipPublishPayment = import.meta.env.VITE_PUBLISH_SKIP_PAYMENT === "true";

// Map sub-category id → BusinessCategory for getCategoryConfig
const SUB_TYPE_TO_CATEGORY: Record<string, BusinessCategory> = {
  // products
  fashion: 'clothing', bakery: 'bakery', 'general-store': 'other',
  food: 'restaurant', jewelry: 'jewelry', 'home-decor': 'home',
  electronics: 'electronics', sports: 'other', cosmetics: 'beauty',
  pets: 'pets', books: 'books', flowers: 'flowers',
  // services
  beauty: 'beauty', barber: 'beauty', fitness: 'fitness',
  renovation: 'handmade', photography: 'art', vacation: 'other',
  broker: 'other', health: 'other', consulting: 'other',
  legal: 'other', developer: 'other', 'car-dealer': 'automotive',
  // nonprofit
  charity: 'other', crowdfunding: 'other', community: 'other',
  education: 'other', social: 'other', animals: 'pets',
};

// Human-readable Hebrew label for each sub-category
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
  other: 'אחר',
};

// Staged publish progress for a reassuring "building your site" experience.
const PUBLISH_STAGES = [
  { at: 0, label: "מקימים את החנות..." },
  { at: 25, label: "מעלים מוצרים ותמונות..." },
  { at: 55, label: "מחילים עיצוב וצבעים..." },
  { at: 80, label: "מפרסמים את האתר..." },
];

const StepFinish = ({ data, updateData, onBack }: Props) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [legalAcknowledged, setLegalAcknowledged] = useState(false);

  // Animate the progress bar while publishing (eases toward 92%, then the real
  // completion navigates away). Gives the merchant a sense of momentum.
  useEffect(() => {
    if (!isPublishing) { setPublishProgress(0); return; }
    setPublishProgress(8);
    const iv = setInterval(() => {
      setPublishProgress((p) => (p < 92 ? p + Math.max(1, Math.round((92 - p) / 12)) : p));
    }, 400);
    return () => clearInterval(iv);
  }, [isPublishing]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const createBusiness = useCreateBusiness();

  const businessSlug = data.businessName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^֐-׿a-z0-9-]/g, "");

  const handlePublish = async () => {
    if (!user) {
      toast({ title: "נדרשת התחברות", variant: "destructive" });
      navigate("/login");
      return;
    }
    setIsPublishing(true);
    try {
      const branding = data.extractedBranding;
      const template = getTemplate(data.storeTemplate);
      const primaryColor = branding?.primaryColor || template.theme.primaryColor;
      const colorPalette = branding?.colorPalette || [
        template.theme.accentColor, template.theme.mutedColor, template.theme.cardColor,
      ];
      // Resolve category: sub-type wins > explicit businessCategory > fallback "other"
      const businessTypeLabels: Record<string, string> = {
        products: "מוצרים", services: "שירותים", nonprofit: "עמותה",
      };
      const resolvedCategory: BusinessCategory =
        (data.businessSubType ? SUB_TYPE_TO_CATEGORY[data.businessSubType] : null)
        || (data.businessCategory !== "other" ? data.businessCategory : null)
        || 'other';
      const effectiveCategory = resolvedCategory;
      const effectiveCustomName = data.customCategoryName
        || (data.businessSubType ? SUB_TYPE_LABELS[data.businessSubType] : null)
        || (data.businessType ? businessTypeLabels[data.businessType] : undefined);

      const categoryConfig = getCategoryConfig(effectiveCategory);
      const categoriesToCreate = data.productCategories?.length
        ? data.productCategories.slice()
        : categoryConfig.categories.map((name, idx) => ({ id: `config-${idx}-${name}`, name, description: undefined }));

      const result = await createBusiness.mutateAsync({
        businessName: data.businessName,
        phone: data.phone,
        email: data.orderEmail,
        slug: businessSlug,
        tagline: branding?.suggestedTagline,
        primaryColor,
        colorPalette,
        brandStyle: branding?.brandStyle || "modern",
        businessCategory: resolvedCategory,
        customCategoryName: effectiveCustomName,
        isReligiousAudience: data.isReligiousAudience,
        businessType: data.businessType,
        businessSubType: data.businessSubType,
        paymentEnabled: false,
        paymentProvider: null,
        logo: data.logo,
        heroImageUrl: branding?.heroImageUrl,
        templateId: data.storeTemplate,
        productCategories: categoriesToCreate,
        products: data.products.map(p => ({
          id: p.id, name: p.name, description: p.description, price: p.price,
          image: p.image, imageUrl: p.imageUrl, categoryId: p.categoryId,
        })),
      });

      toast({ title: "החנות נשמרה", description: "ממשיכים לתשלום לפרסום" });

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
          toast({ title: "שגיאה", description: "לא ניתן לדלג על תשלום", variant: "destructive" });
          return;
        }
        const { data: fin, error: finErr } = await supabase.functions.invoke("finalize-publish", {
          body: { sessionToken: token },
        });
        if (fin?.legalNotApproved) {
          toast({
            title: "האתר נבנה! 🎉",
            description: "נשאר רק לאשר את המסמכים המשפטיים (תקנון ומדיניות פרטיות) בדשבורד כדי לפרסם.",
          });
          navigate("/dashboard");
          return;
        }
        if (finErr || !fin?.ok) {
          navigate(`/publish-payment?businessId=${encodeURIComponent(result.businessId)}`, {
            state: { onboardingData: data },
          });
          return;
        }
        navigate("/onboarding/complete", { state: { data } });
        return;
      }
      // Paid publishing: go straight to the iCount payment page (not the
      // dashboard) - the toast promised "ממשיכים לתשלום", and the site publishes
      // once payment is verified by the webhook.
      navigate(`/publish-payment?businessId=${encodeURIComponent(result.businessId)}`, {
        state: { onboardingData: data },
      });
    } catch (error: any) {
      toast({ title: "שגיאה בפרסום", description: error.message || "משהו השתבש, נסה שוב", variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  // ── Publishing progress view (shown while the site is being built) ──
  if (isPublishing) {
    const stage = [...PUBLISH_STAGES].reverse().find((s) => publishProgress >= s.at) || PUBLISH_STAGES[0];
    return (
      <div className="space-y-8 py-6" dir="rtl">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Rocket className="w-7 h-7 text-primary animate-pulse" />
          </div>
          <h1 className="text-2xl font-medium text-foreground">בונים את האתר שלך...</h1>
          <p className="text-sm text-muted-foreground">{stage.label}</p>
        </div>

        <div className="max-w-md mx-auto space-y-4">
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
              style={{ width: `${publishProgress}%` }}
            />
          </div>
          <p className="text-center text-xs font-medium text-muted-foreground">{Math.round(publishProgress)}%</p>

          {/* Stage timeline */}
          <div className="space-y-2.5 pt-2">
            {PUBLISH_STAGES.map((s, i) => {
              const nextAt = PUBLISH_STAGES[i + 1]?.at ?? 100;
              const done = publishProgress >= nextAt;
              const active = stage.at === s.at && !done;
              return (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    done ? "bg-primary text-white" : active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {done ? <Check className="w-3.5 h-3.5" /> : active ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                  </div>
                  <span className={active ? "text-foreground font-medium" : done ? "text-muted-foreground" : "text-muted-foreground/50"}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Hero */}
      <div className="text-center py-4">
        <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4 relative">
          <Rocket className="w-9 h-9 text-primary" />
          <span className="absolute -top-1 -right-1 text-lg">✨</span>
        </div>
        <h1 className="text-3xl font-semibold text-foreground">כמעט שם!</h1>
        <p className="text-sm text-muted-foreground mt-2">עוד לחיצה אחת - והחנות שלכם בשידור חי 🎉</p>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { emoji: "🏪", label: "שם העסק", value: data.businessName || "—" },
          { emoji: "📦", label: "מוצרים", value: `${data.products.length} מוצרים` },
          { emoji: "🎨", label: "תבנית", value: getTemplate(data.storeTemplate).name },
          { emoji: "📩", label: "הזמנות", value: "ישירות למייל" },
        ].map(item => (
          <div key={item.label} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
            <span className="text-xl leading-none mt-0.5">{item.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-medium truncate mt-0.5">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Payment upsell hint - compact */}
      <div className="rounded-xl bg-primary/5 border border-primary/15 p-3.5 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-foreground leading-relaxed">
          רוצים לקבל תשלומים בכרטיס / ביט ישירות באתר? אפשר להוסיף סליקה בכל רגע מלוח הניהול.
        </p>
      </div>

      {/* Legal */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={legalAcknowledged}
          onChange={e => setLegalAcknowledged(e.target.checked)}
          className="mt-0.5 accent-primary w-4 h-4 shrink-0"
        />
        <span className="text-xs text-muted-foreground leading-relaxed">
          קראתי ואני מסכים/ה ל
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mx-1">תנאי השימוש</a>
          ול
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mx-1">מדיניות הפרטיות</a>
        </span>
      </label>

      {/* Actions */}
      <div className="flex gap-3 pb-2">
        <button onClick={onBack}
          className="flex-none px-5 h-12 rounded-xl border border-border text-sm hover:bg-muted transition-colors">
          חזרה
        </button>
        <button
          onClick={handlePublish}
          disabled={isPublishing || !legalAcknowledged || !data.businessName}
          className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-base font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg shadow-primary/20"
        >
          {isPublishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
          {isPublishing ? "מפרסם..." : "פרסמו את האתר ←"}
        </button>
      </div>
    </div>
  );
};

export default StepFinish;
