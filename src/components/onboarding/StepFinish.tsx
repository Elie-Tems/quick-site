import { useState } from "react";
import { OnboardingData } from "@/pages/Onboarding";
import { ShoppingCart, CreditCard, Check, Rocket, Loader2 } from "lucide-react";
import { useCreateBusiness } from "@/hooks/useCreateBusiness";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getTemplate } from "@/lib/storeTemplates";
import { getCategoryConfig } from "@/lib/categoryConfig";
import { getPublishFeeIls } from "@/lib/publishPaymentConfig";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onBack: () => void;
}

const skipPublishPayment = import.meta.env.VITE_PUBLISH_SKIP_PAYMENT === "true";

const StepFinish = ({ data, updateData, onBack }: Props) => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [legalAcknowledged, setLegalAcknowledged] = useState(false);
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
      const categoryConfig = getCategoryConfig(data.businessCategory);
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
        businessCategory: data.businessCategory,
        customCategoryName: data.customCategoryName,
        isReligiousAudience: data.isReligiousAudience,
        paymentEnabled: data.orderType === "orders-payments" && data.paymentConnected,
        paymentProvider: data.paymentProvider || null,
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
        if (finErr || !fin?.ok) {
          navigate(`/publish-payment?businessId=${encodeURIComponent(result.businessId)}`, {
            state: { onboardingData: data },
          });
          return;
        }
        navigate("/onboarding/complete", { state: { data } });
        return;
      }
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "שגיאה בפרסום", description: error.message || "משהו השתבש, נסה שוב", variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  const ordersOnly = data.orderType === "orders-only";

  return (
    <div className="space-y-8" dir="rtl">
      <div className="text-center">
        <h1 className="text-2xl font-medium text-foreground mb-1">כמעט שם!</h1>
        <p className="text-sm text-muted-foreground">בחרו איך לקבל הזמנות ופרסמו את האתר</p>
      </div>

      {/* ── Order type ────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-sm font-medium">איך תקבלו הזמנות?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: "orders-only" as const, icon: ShoppingCart, title: "הזמנות בלבד", desc: "ללא סליקה" },
            { id: "orders-payments" as const, icon: CreditCard, title: "הזמנות + תשלום אונליין", desc: "סליקת אשראי וביט ישירות באתר" },
          ].map(opt => {
            const selected = data.orderType === opt.id;
            return (
              <button key={opt.id} onClick={() => updateData({ orderType: opt.id })}
                className={`p-4 rounded-xl border-2 text-right transition-all ${
                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 bg-card"
                }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${selected ? "bg-primary" : "bg-muted"}`}>
                    <opt.icon className={`w-5 h-5 ${selected ? "text-white" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{opt.title}</p>
                      {selected && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Payment provider (only if orders-payments) ─ */}
      {!ordersOnly && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-medium">ספק סליקה</p>
          <button
            onClick={() => updateData({ paymentProvider: "payplus", paymentConnected: false })}
            className={`w-full p-4 rounded-xl border-2 text-right transition-all ${
              data.paymentProvider === "payplus" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
            }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">PayPlus</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">מומלץ</span>
                </div>
                <p className="text-xs text-muted-foreground">סליקת אשראי + ביט + חשבוניות אוטומטיות</p>
              </div>
              {data.paymentProvider === "payplus" && <Check className="w-5 h-5 text-primary shrink-0" />}
            </div>
          </button>
          <p className="text-xs text-muted-foreground">ניתן לחבר את הסליקה גם מתוך הדשבורד לאחר הפרסום</p>
        </div>
      )}

      {/* ── Summary ───────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
        <p className="text-sm font-medium mb-3">סיכום</p>
        {[
          { label: "שם עסק", value: data.businessName || "—" },
          { label: "מוצרים", value: `${data.products.length} מוצרים` },
          { label: "תבנית", value: data.storeTemplate || "—" },
          { label: "הזמנות", value: ordersOnly ? "הזמנות בלבד" : "הזמנות + תשלום" },
        ].map(item => (
          <div key={item.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value}</span>
          </div>
        ))}
      </div>

      {/* ── Legal ─────────────────────────────────────── */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={legalAcknowledged}
          onChange={e => setLegalAcknowledged(e.target.checked)}
          className="mt-0.5 accent-primary w-4 h-4 shrink-0"
        />
        <span className="text-xs text-muted-foreground leading-relaxed">
          קראתי ואני מסכים/ה ל
          <a href="/terms" target="_blank" className="text-primary hover:underline mx-1">תנאי השימוש</a>
          ול
          <a href="/privacy" target="_blank" className="text-primary hover:underline mx-1">מדיניות הפרטיות</a>
        </span>
      </label>

      {/* ── Actions ───────────────────────────────────── */}
      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex-none px-5 h-12 rounded-xl border border-border text-sm hover:bg-muted transition-colors">
          חזרה
        </button>
        <button
          onClick={handlePublish}
          disabled={isPublishing || !legalAcknowledged || !data.businessName}
          className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
          {isPublishing ? "מפרסם..." : "פרסמו את האתר"}
        </button>
      </div>
    </div>
  );
};

export default StepFinish;
