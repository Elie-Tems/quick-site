import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Check, X, CreditCard, Loader2, Palette, Image, Type, Megaphone, RefreshCw, Store, Utensils, Coffee, Shirt, Gem, Smartphone, Dumbbell, Car, PawPrint, Flower2, BookOpen, Home, ShoppingBasket, MoreHorizontal, ImagePlus, MessageCircle, Wine, Gamepad2, Palette as PaletteIcon, Baby, Gift, Pill, Sofa, Refrigerator, Scissors, Truck, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useUpdateBusiness } from "@/hooks/useBusiness";
import { BusinessCategory, businessCategoryList } from "@/lib/categoryConfig";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useAdmin";
import { useLanguage } from "@/contexts/LanguageContext";

export type { BusinessCategory };

const categoryIcons: Record<BusinessCategory, React.ComponentType<any>> = {
  bakery: Store,
  restaurant: Utensils,
  cafe: Coffee,
  clothing: Shirt,
  jewelry: Gem,
  electronics: Smartphone,
  beauty: Flower2,
  fitness: Dumbbell,
  automotive: Car,
  pets: PawPrint,
  flowers: Flower2,
  books: BookOpen,
  home: Home,
  grocery: ShoppingBasket,
  wine_alcohol: Wine,
  toys: Gamepad2,
  art: PaletteIcon,
  baby: Baby,
  gifts: Gift,
  pharmacy: Pill,
  furniture: Sofa,
  appliances: Refrigerator,
  handmade: Scissors,
  other: MoreHorizontal,
};

export interface BusinessSettings {
  id?: string; // Business ID for regenerating hero
  name: string;
  phone: string;
  email: string;
  tagline?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  primaryColor: string;
  brandStyle: 'modern' | 'minimal' | 'bold' | 'elegant';
  // Payments
  paymentEnabled: boolean;
  paymentProvider?: 'icredit' | 'cardcom' | 'tranzila' | 'meshulam' | 'payplus';
  apiKey?: string;
  apiSecret?: string;
  // Shipping / fulfillment
  deliveryMode?: 'pickup_only' | 'pickup_and_delivery';
  deliveryFee?: number;
  // Editable storefront texts
  heroTitle?: string;
  heroBadge?: string;
  heroBenefits?: string[];
  promoText?: string;
  ctaText?: string;
  // Toggles for optional texts
  useTagline?: boolean;
  useHeroTitle?: boolean;
  useHeroBadge?: boolean;
  usePromoText?: boolean;
  useCtaText?: boolean;
  useHeroBenefits?: boolean;
  useMarqueeBar?: boolean;
  // Business category for AI hero generation
  businessCategory?: BusinessCategory;
  customCategoryName?: string;
  // About section
  // WhatsApp settings
  whatsappEnabled?: boolean;
  whatsappMessage?: string;
  // Close the store automatically on Shabbat/Yom Tov
  shabbatMode?: boolean;
  // Store URL slug (ASCII only)
  slug?: string;
}

interface DashboardSettingsProps {
  settings: BusinessSettings;
  onSettingsChange: (settings: BusinessSettings) => void;
  businessType?: string;
}

function AccordionSection({
  title,
  summary,
  children,
  defaultOpen = false,
}: {
  title: string;
  summary?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/30 transition-colors text-right"
        onClick={() => setOpen((o) => !o)}
      >
        <div>
          <p className="font-semibold text-foreground text-sm">{title}</p>
          {!open && summary && (
            <p className="text-xs text-muted-foreground mt-0.5">{summary}</p>
          )}
        </div>
        <svg
          className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 mr-2 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="p-4 border-t border-border bg-card">{children}</div>
      )}
    </div>
  );
}

const paymentProviders = [
  { id: 'icredit', name: 'iCredit', logo: '💳', description: 'סליקה ישראלית פופולרית', signupUrl: 'https://icredit.co.il' },
  { id: 'cardcom', name: 'Cardcom', logo: '💳', description: 'סליקה מאובטחת', signupUrl: 'https://www.cardcom.solutions' },
  { id: 'tranzila', name: 'Tranzila', logo: '💳', description: 'סליקה מובילה בישראל', signupUrl: 'https://tranzila.com' },
  { id: 'meshulam', name: 'משולם', logo: '💳', description: 'חיוב ותשלומים', signupUrl: 'https://meshulam.co.il' },
  { id: 'payplus', name: 'PayPlus', logo: '💳', description: 'סליקה מתקדמת', signupUrl: 'https://www.payplus.co.il' },
] as const;

const brandStyles = [
  { id: 'modern', name: 'מודרני', description: 'עיצוב נקי וחד' },
  { id: 'minimal', name: 'מינימליסטי', description: 'פשוט ואלגנטי' },
  { id: 'bold', name: 'נועז', description: 'צבעים חזקים ובולטים' },
  { id: 'elegant', name: 'יוקרתי', description: 'מראה פרימיום' },
] as const;

const colorPresets = [
  { color: '#7c3aed', name: 'סגול' },
  { color: '#2563eb', name: 'כחול' },
  { color: '#059669', name: 'ירוק' },
  { color: '#dc2626', name: 'אדום' },
  { color: '#ea580c', name: 'כתום' },
  { color: '#0891b2', name: 'טורקיז' },
  { color: '#be185d', name: 'ורוד' },
  { color: '#000000', name: 'שחור' },
];

const categories = businessCategoryList.map(({ id, label }) => ({
  id,
  label,
  icon: categoryIcons[id],
}));

const DashboardSettings = ({ settings, onSettingsChange, businessType }: DashboardSettingsProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { t } = useLanguage();
  const [formData, setFormData] = useState(settings);

  // Re-sync when the parent reloads business data (e.g. after save)
  useEffect(() => {
    setFormData(settings);
  }, [settings.id]);
  const [isResettingOnboarding, setIsResettingOnboarding] = useState(false);

  const handleResetOnboarding = useCallback(async () => {
    if (!user) return;
    if (!window.confirm(t("dash.settings.reset_onboarding_confirm"))) return;
    setIsResettingOnboarding(true);
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed_at: null, status: "registered" } as any)
      .eq("id", user.id);
    setIsResettingOnboarding(false);
    if (error) {
      toast({ title: t("dash.settings.error_generic"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("dash.settings.reset_onboarding_done_title"), description: t("dash.settings.reset_onboarding_done_desc") });
      setTimeout(() => window.location.href = "/", 1200);
    }
  }, [user, t]);
  const updateBusiness = useUpdateBusiness();
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const logoImageInputRef = useRef<HTMLInputElement>(null);

  // ברירת מחדל: מכובה (false) - המשתמש צריך להפעיל באופן ידני
  const effectiveUseTagline = formData.useTagline ?? false;

  // לעדכן את האובייקט settings של הדשבורד בכל שינוי טופס - בשביל תצוגה מקדימה חיה
  useEffect(() => {
    onSettingsChange(formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!settings.id) {
      toast({
        title: t("dash.settings.error_generic"),
        description: t("dash.settings.error_missing_business_id"),
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      await updateBusiness.mutateAsync({
        id: settings.id,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        tagline: effectiveUseTagline ? (formData.tagline || null) : "",
        marquee_bar_enabled: formData.useMarqueeBar ?? false,
        logo_url: formData.logoUrl || null,
        primary_color: formData.primaryColor,
        brand_style: formData.brandStyle,
        business_category: formData.businessCategory || 'other',
        custom_category_name: formData.customCategoryName || null,
        shabbat_mode: formData.shabbatMode ?? false,
        ...(formData.slug ? { slug: formData.slug } : {}),
          delivery_mode: formData.deliveryMode || 'pickup_only',
          delivery_fee: formData.deliveryMode === 'pickup_and_delivery'
            ? (typeof formData.deliveryFee === 'number' ? formData.deliveryFee : 0)
            : null,
      } as any);
      
      onSettingsChange(formData);
    } catch (error: any) {
      toast({
        title: t("dash.settings.error_save_title"),
        description: error.message || t("dash.settings.error_try_again"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');
    
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setConnectionStatus(formData.apiKey && formData.apiKey.length > 5 ? 'success' : 'error');
    setIsTestingConnection(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings.id) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: t("dash.settings.error_invalid_file_title"),
        description: t("dash.settings.error_invalid_file_desc"),
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("dash.settings.error_file_too_large_title"),
        description: t("dash.settings.error_file_too_large_desc"),
        variant: "destructive",
      });
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `${settings.id}/branding/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath);

      const logoUrl = urlData.publicUrl;
      setFormData(prev => ({ ...prev, logoUrl }));
      toast({
        title: t("dash.settings.logo_upload_success_title"),
        description: t("dash.settings.logo_upload_success_desc"),
      });
    } catch (err: any) {
      console.error('Failed to upload logo image:', err);
      toast({
        title: t("dash.settings.error_logo_upload_title"),
        description: err.message || t("dash.settings.error_try_again_later"),
        variant: "destructive",
      });
    } finally {
      if (logoImageInputRef.current) {
        logoImageInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 w-full">
      {/* Gradient header */}
      <div className="rounded-2xl bg-gradient-to-l from-gray-500/10 to-gray-500/5 border border-border p-5 mb-1 flex items-center gap-4">
        <div className="text-4xl">⚙️</div>
        <div>
          <h1 className="text-lg font-bold text-foreground">{t("dash.settings.page_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dash.settings.page_subtitle")}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Business Info Section */}
        <AccordionSection title={t("dash.settings.section_business_info")} summary={formData.name || t("dash.settings.section_business_info_summary")} defaultOpen>
          <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t("dash.settings.field_business_name")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("dash.settings.field_business_name")}
                />
              </div>

              {/* Store URL slug */}
              <div className="space-y-2">
                <Label htmlFor="slug">{t("dash.settings.field_store_url")}</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">siango.app/store/</span>
                  <Input
                    id="slug"
                    dir="ltr"
                    value={formData.slug || ""}
                    onChange={(e) => {
                      const cleaned = e.target.value
                        .toLowerCase()
                        .replace(/\s+/g, "-")
                        .replace(/[^a-z0-9-]/g, "")
                        .replace(/-{2,}/g, "-");
                      setFormData({ ...formData, slug: cleaned });
                    }}
                    placeholder="my-store"
                    className="font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t("dash.settings.field_store_url_help")}</p>
              </div>

              {/* Shabbat mode - auto-close the store on Shabbat/Yom Tov */}
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 p-4">
                <div>
                  <p className="font-medium text-foreground">🕯️ {t("dash.settings.shabbat_mode_title")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("dash.settings.shabbat_mode_desc")}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formData.shabbatMode === true ? t("dash.settings.status_active") : t("dash.settings.status_off")}
                  </span>
                  <Switch
                    id="shabbat-mode"
                    checked={formData.shabbatMode === true}
                    onCheckedChange={(checked) => setFormData({ ...formData, shabbatMode: checked })}
                    aria-label={t("dash.settings.shabbat_mode_title")}
                  />
                </div>
              </div>

              {/* Top strip (marquee) with business name - on/off */}
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 p-4">
                <div>
                  <p className="font-medium text-foreground">{t("dash.settings.marquee_title")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("dash.settings.marquee_desc")}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formData.useMarqueeBar === true ? t("dash.settings.status_shown") : t("dash.settings.status_hidden")}
                  </span>
                  <Switch
                    id="use-marquee-bar"
                    checked={formData.useMarqueeBar === true}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, useMarqueeBar: checked })
                    }
                    aria-label={t("dash.settings.marquee_aria_label")}
                  />
                </div>
              </div>

              {/* Tagline with switch */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tagline">{t("dash.settings.field_tagline")}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {effectiveUseTagline ? t("dash.settings.status_enabled") : t("dash.settings.tagline_disabled_label")}
                    </span>
                    <Switch
                      checked={effectiveUseTagline}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, useTagline: checked })
                      }
                    />
                  </div>
                </div>
                <Input
                  id="tagline"
                  value={formData.tagline || ''}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder={t("dash.settings.field_tagline_placeholder")}
                  disabled={!effectiveUseTagline}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("dash.settings.field_phone")}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    dir="ltr"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="050-0000000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t("dash.settings.field_order_email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    dir="ltr"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="orders@mybusiness.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t("dash.settings.field_logo")}</Label>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-muted-foreground">{formData.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        type="url"
                        value={formData.logoUrl || ''}
                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                        placeholder={t("dash.settings.field_logo_url_placeholder")}
                        dir="ltr"
                        className="flex-1"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          ref={logoImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => logoImageInputRef.current?.click()}
                          className="gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          {t("dash.settings.upload_logo_button")}
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("dash.settings.field_logo_help")}
                    </p>
                  </div>
                </div>
              </div>
          </div>
        </AccordionSection>

        {/* Business Category Section */}
        <AccordionSection
          title={t("dash.settings.section_category")}
          summary={formData.businessCategory ? categories.find(c => c.id === formData.businessCategory)?.label || t("dash.settings.category_not_selected") : t("dash.settings.category_not_selected")}
        >
          <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {t("dash.settings.category_help")}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, businessCategory: cat.id })}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      formData.businessCategory === cat.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <cat.icon
                      className={`w-5 h-5 ${
                        formData.businessCategory === cat.id ? "text-primary" : "text-foreground/70"
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        formData.businessCategory === cat.id ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Category Name - shown only when "other" is selected */}
              {formData.businessCategory === "other" && (
                <div className="space-y-2">
                  <Label htmlFor="customCategoryName">{t("dash.settings.field_custom_category")}</Label>
                  <Input
                    id="customCategoryName"
                    value={formData.customCategoryName || ""}
                    onChange={(e) => setFormData({ ...formData, customCategoryName: e.target.value })}
                    placeholder={t("dash.settings.field_custom_category_placeholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("dash.settings.field_custom_category_help")}
                  </p>
                </div>
              )}
          </div>
        </AccordionSection>

        {/* Shipping / Lodging Section - conditional on businessType */}
        {businessType !== "vacation" ? (
        <AccordionSection title={t("dash.settings.section_shipping")} summary={t("dash.settings.section_shipping_summary")}>
          <div className="space-y-4">
              <div className="space-y-3">
                <Label>{t("dash.settings.field_delivery_mode")}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label={t("dash.settings.field_delivery_mode")}>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryMode: 'pickup_only' })}
                    className={`flex flex-col gap-1 p-4 rounded-lg border cursor-pointer transition-colors text-right ${
                      (formData.deliveryMode || 'pickup_only') === 'pickup_only'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/30'
                    }`}
                    aria-pressed={(formData.deliveryMode || 'pickup_only') === 'pickup_only'}
                  >
                    <span className="font-medium text-foreground">{t("dash.settings.delivery_mode_pickup_only")}</span>
                    <span className="text-xs text-foreground/80">
                      {t("dash.settings.delivery_mode_pickup_only_desc")}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryMode: 'pickup_and_delivery' })}
                    className={`flex flex-col gap-1 p-4 rounded-lg border cursor-pointer transition-colors text-right ${
                      formData.deliveryMode === 'pickup_and_delivery'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/30'
                    }`}
                    aria-pressed={formData.deliveryMode === 'pickup_and_delivery'}
                  >
                    <span className="font-medium text-foreground">{t("dash.settings.delivery_mode_pickup_and_delivery")}</span>
                    <span className="text-xs text-foreground/80">
                      {t("dash.settings.delivery_mode_pickup_and_delivery_desc")}
                    </span>
                  </button>
                </div>
              </div>

              {formData.deliveryMode === 'pickup_and_delivery' && (
                <div className="space-y-2">
                  <Label htmlFor="deliveryFee">{t("dash.settings.field_delivery_fee")}</Label>
                  <Input
                    id="deliveryFee"
                    type="number"
                    dir="ltr"
                    min={0}
                    value={formData.deliveryFee ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deliveryFee: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                    placeholder={t("dash.settings.field_delivery_fee_placeholder")}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("dash.settings.field_delivery_fee_help")}
                  </p>
                </div>
              )}
          </div>
        </AccordionSection>
        ) : (
        <AccordionSection title={t("dash.settings.section_lodging")} summary={t("dash.settings.section_lodging_summary")}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("dash.settings.field_checkin_time")}</label>
                <input type="time" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" defaultValue="15:00" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">{t("dash.settings.field_checkout_time")}</label>
                <input type="time" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" defaultValue="11:00" />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t("dash.settings.field_cancellation_policy")}</label>
              <select className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="flexible">{t("dash.settings.cancellation_flexible")}</option>
                <option value="moderate">{t("dash.settings.cancellation_moderate")}</option>
                <option value="strict">{t("dash.settings.cancellation_strict")}</option>
              </select>
            </div>
          </div>
        </AccordionSection>
        )}

        {/* Legal Section */}
        <AccordionSection title={t("dash.settings.section_legal")} summary={t("dash.settings.section_legal_summary")}>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("dash.settings.section_legal_desc")}
            </p>
          </div>
        </AccordionSection>

        {/* Payments Section (commented out) */}
        {/* <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
          <button
            type="button"
            className="w-full flex items-center justify-between text-right"
            onClick={() => setShowPayments(prev => !prev)}
          >
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col items-start">
                <h2 className="font-semibold text-lg text-foreground">סליקת אשראי</h2>
                <p className="text-xs text-muted-foreground">
                  חבר ספק סליקה כדי לאפשר תשלום בכרטיס אשראי באתר.
                </p>
              </div>
            </div>
            {showPayments ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          
          {showPayments && (
            <div className="pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  חבר את חשבון הסליקה שלך כדי לקבל תשלומי אשראי ישירות מהלקוחות.
                </p>
                <Switch
                  checked={formData.paymentEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, paymentEnabled: checked })}
                />
              </div>

              {formData.paymentEnabled && (
                <>
                  <div className="space-y-3">
                    <Label>בחר ספק סליקה</Label>
                    <RadioGroup
                      value={formData.paymentProvider}
                      onValueChange={(value) => setFormData({ ...formData, paymentProvider: value as BusinessSettings['paymentProvider'] })}
                      className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                    >
                      {paymentProviders.map((provider) => (
                        <Label
                          key={provider.id}
                          htmlFor={provider.id}
                          className={`flex flex-col items-center gap-2 p-4 rounded-lg border cursor-pointer transition-colors ${
                            formData.paymentProvider === provider.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border hover:border-primary/30'
                          }`}
                        >
                          <RadioGroupItem value={provider.id} id={provider.id} className="sr-only" />
                          <span className="text-2xl">{provider.logo}</span>
                          <span className="text-sm font-medium">{provider.name}</span>
                          <span className="text-xs text-muted-foreground text-center">{provider.description}</span>
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>

                  {formData.paymentProvider && (
                    <> */}
                      {/* Sign up link */}
                      {/* <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-sm text-foreground mb-2">
                          אין לך חשבון {paymentProviders.find(p => p.id === formData.paymentProvider)?.name}?
                        </p>
                        <a 
                          href={paymentProviders.find(p => p.id === formData.paymentProvider)?.signupUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline font-medium"
                        >
                          פתח חשבון חדש ←
                        </a>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="apiKey">API Key / מפתח סוחר</Label>
                        <Input
                          id="apiKey"
                          type="password"
                          dir="ltr"
                          value={formData.apiKey || ''}
                          onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                          placeholder="הזן את ה-API Key שקיבלת מספק הסליקה"
                        />
                        <p className="text-xs text-muted-foreground">
                          תמצא את המפתח בלוח הבקרה של ספק הסליקה שלך
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="apiSecret">API Secret / סיסמה סודית</Label>
                        <Input
                          id="apiSecret"
                          type="password"
                          dir="ltr"
                          value={formData.apiSecret || ''}
                          onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                          placeholder="הזן את ה-API Secret"
                        />
                      </div>

                      <div className="flex items-center gap-3">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={testConnection}
                          disabled={isTestingConnection || !formData.apiKey}
                          className="gap-2"
                        >
                          {isTestingConnection && <Loader2 className="h-4 w-4 animate-spin" />}
                          בדוק חיבור
                        </Button>
                        
                        {connectionStatus === 'success' && (
                          <div className="flex items-center gap-1.5 text-green-600 text-sm">
                            <Check className="h-4 w-4" />
                            החיבור תקין
                          </div>
                        )}
                        {connectionStatus === 'error' && (
                          <div className="flex items-center gap-1.5 text-destructive text-sm">
                            <X className="h-4 w-4" />
                            בדוק שהמפתחות נכונים
                          </div>
                        )}
                      </div>
                      
                      <div className="p-3 rounded-lg bg-muted/50 border border-border">
                        <p className="text-xs text-muted-foreground">
                          💡 <strong>טיפ:</strong> לאחר חיבור מוצלח, לקוחות יוכלו לשלם באשראי ישירות באתר שלך. 
                          הכסף יועבר ישירות לחשבון הבנק המחובר לספק הסליקה.
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div> */}

        {/* Save Button */}
        <Button type="submit" size="lg" className="w-full gap-2" disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("dash.settings.save_button")}
        </Button>
      </form>

      {/* Account section — email + password. Separate from the business form. */}
      <AccountSection />

        {/* Dev: reset onboarding — admin-only. This wipes onboarding_completed_at and
            throws the account back into the setup wizard, so it must never be exposed
            to real merchants. */}
      {isAdmin && (
          <div className="border-t border-border pt-4 mt-2">
            <p className="text-xs text-muted-foreground mb-2 text-right">{t("dash.settings.admin_dev_tools_label")}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-amber-700 border-amber-300 hover:bg-amber-50"
              onClick={handleResetOnboarding}
              disabled={isResettingOnboarding}
            >
              {isResettingOnboarding && <Loader2 className="h-3.5 w-3.5 animate-spin ml-2" />}
              <RefreshCw className="h-3.5 w-3.5 ml-2" />
              {t("dash.settings.reset_onboarding_button")}
            </Button>
          </div>
        )}
    </div>
  );
};

// ── AccountSection: email + password change (separate from business form) ─────
function AccountSection() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setIsSavingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (error) throw error;
      toast({ title: t("dash.settings.email_change_sent_title"), description: t("dash.settings.email_change_sent_desc") });
      setNewEmail("");
    } catch (err: any) {
      toast({ title: t("dash.settings.error_generic"), description: err.message || t("dash.settings.error_update_email"), variant: "destructive" });
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: t("dash.settings.error_password_too_short_title"), description: t("dash.settings.error_password_too_short_desc"), variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t("dash.settings.error_passwords_mismatch_title"), description: t("dash.settings.error_passwords_mismatch_desc"), variant: "destructive" });
      return;
    }
    setIsSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: t("dash.settings.password_updated_title"), description: t("dash.settings.password_updated_desc") });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: t("dash.settings.error_generic"), description: err.message || t("dash.settings.error_update_password"), variant: "destructive" });
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="space-y-3 border-t border-border pt-4 mt-2" dir="rtl">
      <p className="text-sm font-semibold text-foreground">{t("dash.settings.account_section_title")}</p>

      {/* Current email (read-only display) */}
      <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">{t("dash.settings.current_email_label")}</p>
          <p className="text-sm font-medium text-foreground">{user?.email}</p>
        </div>
      </div>

      {/* Change email */}
      <form onSubmit={handleEmailChange} className="space-y-2">
        <Label htmlFor="new-email" className="text-xs text-muted-foreground">{t("dash.settings.change_email_label")}</Label>
        <div className="flex gap-2">
          <Input
            id="new-email"
            type="email"
            placeholder={t("dash.settings.change_email_placeholder")}
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            className="flex-1 text-sm"
            dir="ltr"
          />
          <Button type="submit" variant="outline" size="sm" disabled={isSavingEmail || !newEmail.trim()}>
            {isSavingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("dash.settings.change_button")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("dash.settings.change_email_help")}</p>
      </form>

      {/* Change password */}
      <form onSubmit={handlePasswordChange} className="space-y-2 pt-1">
        <Label className="text-xs text-muted-foreground">{t("dash.settings.change_password_label")}</Label>
        <Input
          type="password"
          placeholder={t("dash.settings.new_password_placeholder")}
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          className="text-sm"
          dir="ltr"
        />
        <Input
          type="password"
          placeholder={t("dash.settings.confirm_password_placeholder")}
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          className="text-sm"
          dir="ltr"
        />
        <Button type="submit" variant="outline" size="sm" className="w-full" disabled={isSavingPassword || !newPassword}>
          {isSavingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
          {t("dash.settings.update_password_button")}
        </Button>
      </form>
    </div>
  );
}

export default DashboardSettings;
