import { useState, useRef, useEffect, useCallback } from "react";
import { Upload, Check, X, CreditCard, Loader2, Palette, Image, Type, Megaphone, RefreshCw, Store, Utensils, Coffee, Shirt, Gem, Smartphone, Dumbbell, Car, PawPrint, Flower2, BookOpen, Home, ShoppingBasket, MoreHorizontal, ImagePlus, MessageCircle, Wine, Gamepad2, Palette as PaletteIcon, Baby, Gift, Pill, Sofa, Refrigerator, Scissors, Truck, ChevronDown, ChevronUp, Tag } from "lucide-react";
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
}

interface DashboardSettingsProps {
  settings: BusinessSettings;
  onSettingsChange: (settings: BusinessSettings) => void;
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

const DashboardSettings = ({ settings, onSettingsChange }: DashboardSettingsProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [formData, setFormData] = useState(settings);
  const [isResettingOnboarding, setIsResettingOnboarding] = useState(false);

  const handleResetOnboarding = useCallback(async () => {
    if (!user) return;
    if (!window.confirm("לאפס את תהליך ה-Onboarding? בכניסה הבאה תועבר לאשף ההגדרה מחדש.")) return;
    setIsResettingOnboarding(true);
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed_at: null, status: "registered" } as any)
      .eq("id", user.id);
    setIsResettingOnboarding(false);
    if (error) {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "אופס!", description: "ה-Onboarding אופס — מרענן..." });
      setTimeout(() => window.location.href = "/", 1200);
    }
  }, [user]);
  const updateBusiness = useUpdateBusiness();
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const logoImageInputRef = useRef<HTMLInputElement>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showBusinessInfo, setShowBusinessInfo] = useState(false);
  const [showShipping, setShowShipping] = useState(false);
  const [showWhatsapp, setShowWhatsapp] = useState(false);
  const [showPayments, setShowPayments] = useState(false);

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
        title: "שגיאה",
        description: "מזהה העסק חסר",
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
        whatsapp_enabled: formData.whatsappEnabled ?? true,
        whatsapp_message: formData.whatsappMessage || null,
        shabbat_mode: formData.shabbatMode ?? false,
          delivery_mode: formData.deliveryMode || 'pickup_only',
          delivery_fee: formData.deliveryMode === 'pickup_and_delivery'
            ? (typeof formData.deliveryFee === 'number' ? formData.deliveryFee : 0)
            : null,
      } as any);
      
      onSettingsChange(formData);
    } catch (error: any) {
      toast({
        title: "שגיאה בשמירה",
        description: error.message || "נסה שוב",
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
        title: "קובץ לא תקין",
        description: "יש להעלות קובץ תמונה בלבד (JPG, PNG, WEBP)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "הקובץ גדול מדי",
        description: "גודל הקובץ המקסימלי הוא 5MB",
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
        title: "הלוגו הועלה בהצלחה! 🎉",
        description: "אל תשכח לשמור את ההגדרות כדי לעדכן את החנות.",
      });
    } catch (err: any) {
      console.error('Failed to upload logo image:', err);
      toast({
        title: "שגיאה בהעלאת הלוגו",
        description: err.message || "נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    } finally {
      if (logoImageInputRef.current) {
        logoImageInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 w-full">
      <h1 className="text-2xl font-semibold text-foreground">הגדרות</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Info Section */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-4">
          <button
            type="button"
            className="w-full flex items-center justify-between text-right"
            onClick={() => setShowBusinessInfo(prev => !prev)}
          >
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col items-start">
                <h2 className="font-semibold text-lg text-foreground">פרטי העסק</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  שם, סלוגן, טלפון, אימייל ולוגו
                </p>
              </div>
            </div>
            {showBusinessInfo ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {showBusinessInfo && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">שם העסק</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="שם העסק"
                />
              </div>

              {/* Shabbat mode - auto-close the store on Shabbat/Yom Tov */}
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 p-4">
                <div>
                  <p className="font-medium text-foreground">🕯️ סגירת החנות בשבת</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    החנות תיסגר אוטומטית בשבת ובחגים (לפי זמני ישראל) ותיפתח בצאת השבת/החג.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formData.shabbatMode === true ? "פעיל" : "כבוי"}
                  </span>
                  <Switch
                    id="shabbat-mode"
                    checked={formData.shabbatMode === true}
                    onCheckedChange={(checked) => setFormData({ ...formData, shabbatMode: checked })}
                    aria-label="סגירת החנות בשבת"
                  />
                </div>
              </div>

              {/* Top strip (marquee) with business name - on/off */}
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 p-4">
                <div>
                  <p className="font-medium text-foreground">פס עליון עם שם החנות</p>
                  <p className="text-xs text-muted-foreground mt-0.5">הפס המסתובב מעל התפריט עם שם העסק</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formData.useMarqueeBar === true ? "מוצג" : "מוסתר"}
                  </span>
                  <Switch
                    id="use-marquee-bar"
                    checked={formData.useMarqueeBar === true}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, useMarqueeBar: checked })
                    }
                    aria-label="הצג פס עליון עם שם החנות"
                  />
                </div>
              </div>

              {/* Tagline with switch */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tagline">סלוגן / תיאור קצר</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {effectiveUseTagline ? "מופעל" : "ללא סלוגן"}
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
                  placeholder="המוצרים הכי טובים במחירים הכי טובים"
                  disabled={!effectiveUseTagline}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">טלפון</Label>
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
                  <Label htmlFor="email">אימייל לקבלת הזמנות *</Label>
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
                <Label>לוגו</Label>
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
                        placeholder="URL ללוגו"
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
                          העלה לוגו
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      ניתן להדביק קישור ללוגו או להעלות קובץ תמונה (עד 5MB)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Business Category Section */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-4">
          <button
            type="button"
            className="w-full flex items-center justify-between text-right"
            onClick={() => setShowCategoryPicker(prev => !prev)}
          >
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col items-start">
                <h2 className="font-semibold text-lg text-foreground">קטגוריית העסק</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formData.businessCategory
                    ? categories.find(c => c.id === formData.businessCategory)?.label || "לא נבחרה קטגוריה"
                    : "לא נבחרה קטגוריה"}
                </p>
              </div>
            </div>
            {showCategoryPicker ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {showCategoryPicker && (
            <div className="space-y-3 pt-4">
              <p className="text-xs text-muted-foreground">
                בחר קטגוריה כדי להתאים טקסטים ותמונות לסוג העסק.
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
                  <Label htmlFor="customCategoryName">שם הקטגוריה המותאמת אישית</Label>
                  <Input
                    id="customCategoryName"
                    value={formData.customCategoryName || ""}
                    onChange={(e) => setFormData({ ...formData, customCategoryName: e.target.value })}
                    placeholder="לדוגמה: סטודיו צילום, שירותי ניקיון, מוצרי טבע..."
                  />
                  <p className="text-xs text-muted-foreground">
                    הקטגוריה תשמש לזיהוי העסק במערכת
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Shipping / Fulfillment Section */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-4">
          <button
            type="button"
            className="w-full flex items-center justify-between text-right"
            onClick={() => setShowShipping(prev => !prev)}
          >
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col items-start">
                <h2 className="font-semibold text-lg text-foreground">משלוחים ואיסוף</h2>
                <p className="text-xs text-muted-foreground">
                  קבע האם הלקוחות יכולים רק לאסוף מהחנות או גם להזמין משלוח, ומה עלות המשלוח.
                </p>
              </div>
            </div>
            {showShipping ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {showShipping && (
            <div className="space-y-4 pt-4">
              <div className="space-y-3">
                <Label>אופן אספקה</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="אופן אספקה">
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
                    <span className="font-medium text-foreground">איסוף עצמי בלבד</span>
                    <span className="text-xs text-foreground/80">
                      הלקוח יבחר רק איסוף עצמי, ללא אפשרות משלוח.
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
                    <span className="font-medium text-foreground">איסוף עצמי + משלוחים</span>
                    <span className="text-xs text-foreground/80">
                      בצ׳קאווט הלקוח יוכל לבחור בין איסוף עצמי למשלוח.
                    </span>
                  </button>
                </div>
              </div>

              {formData.deliveryMode === 'pickup_and_delivery' && (
                <div className="space-y-2">
                  <Label htmlFor="deliveryFee">עלות משלוח (₪)</Label>
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
                    placeholder="לדוגמה: 25"
                  />
                  <p className="text-xs text-muted-foreground">
                    עלות המשלוח שתתווסף לסכום ההזמנה כאשר הלקוח בוחר משלוח.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* WhatsApp Section */}
        <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-4">
          <button
            type="button"
            className="w-full flex items-center justify-between text-right"
            onClick={() => setShowWhatsapp(prev => !prev)}
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-[#25D366]" />
              <h2 className="font-semibold text-lg text-foreground">כפתור וואטסאפ</h2>
            </div>
            {showWhatsapp ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {showWhatsapp && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {formData.whatsappEnabled ?? true
                    ? "כפתור וואטסאפ צף יופיע בחנות שלך ויאפשר ללקוחות ליצור איתך קשר בקלות"
                    : "הכפתור מוסתר בחנות. להצגת כפתור וואטסאפ - הפעל את המתג למעלה."}
                </p>
                <Switch
                  checked={formData.whatsappEnabled ?? true}
                  onCheckedChange={(checked) => setFormData({ ...formData, whatsappEnabled: checked })}
                />
              </div>

              {(formData.whatsappEnabled ?? true) && (
                <div className="space-y-4">
                  {/* Phone for WhatsApp */}
                  <div className="space-y-2">
                    <Label htmlFor="whatsappPhone">מספר טלפון לוואטסאפ</Label>
                    <Input
                      id="whatsappPhone"
                      type="tel"
                      dir="ltr"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="050-0000000"
                    />
                    <p className="text-xs text-muted-foreground">
                      המספר שיפתח בלחיצה על כפתור הוואטסאפ (משתמש במספר הטלפון של העסק)
                    </p>
                  </div>

                  {/* Default WhatsApp Message */}
                  <div className="space-y-2">
                    <Label htmlFor="whatsappMessage">הודעה אוטומטית</Label>
                    <Textarea
                      id="whatsappMessage"
                      value={formData.whatsappMessage || ''}
                      onChange={(e) => setFormData({ ...formData, whatsappMessage: e.target.value })}
                      placeholder="שלום, הגעתי מהאתר שלכם ואשמח לקבל פרטים נוספים"
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">
                      ההודעה שתופיע מראש כשהלקוח לוחץ על כפתור הוואטסאפ
                    </p>
                  </div>

                  {/* Preview */}
                  <div className="p-4 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20">
                    <p className="text-sm font-medium text-foreground mb-2">תצוגה מקדימה:</p>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-md">
                        <MessageCircle className="h-6 w-6" fill="currentColor" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">
                          לחיצה תפתח וואטסאפ עם ההודעה:
                        </p>
                        <p className="text-sm font-medium text-foreground mt-1">
                          "{formData.whatsappMessage || 'שלום, הגעתי מהאתר שלכם ואשמח לקבל פרטים נוספים'}"
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Payments Section */}
        {/* <div className="bg-card rounded-xl border border-border p-5 shadow-soft space-y-4">
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
          שמור הגדרות
        </Button>

        {/* Dev: reset onboarding */}
        <div className="border-t border-border pt-4 mt-2">
          <p className="text-xs text-muted-foreground mb-2 text-right">בדיקות ופיתוח</p>
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
            אפס Onboarding — עבור לאשף מחדש
          </Button>
        </div>
      </form>
    </div>
  );
};

export default DashboardSettings;
