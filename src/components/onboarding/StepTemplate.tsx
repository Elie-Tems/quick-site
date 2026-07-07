import { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Pipette, Loader2, Rocket, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateBusiness } from "@/hooks/useCreateBusiness";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { OnboardingData } from "@/pages/Onboarding";
import { getTemplate, type StoreLayoutId } from "@/lib/storeTemplates";
import { paletteList, type ColorPaletteId } from "@/lib/colorPalettes";
import { getCategoryConfig, BusinessCategory } from "@/lib/categoryConfig";
import { getPublishFeeIls } from "@/lib/publishPaymentConfig";

const StorePreviewPanel = lazy(() => import("./StorePreviewPanel"));

const skipPublishPayment = import.meta.env.VITE_PUBLISH_SKIP_PAYMENT === "true";

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
  other: 'אחר',
};

const LAYOUTS_FOR: Record<string, { id: StoreLayoutId; name: string }[]> = {
  products:  [{ id: 'classic', name: 'חנות קלאסית' }, { id: 'market', name: 'בוטיק / שוק' }],
  services:  [{ id: 'service', name: 'כרטיסי שירות' }, { id: 'classic', name: 'קטלוג' }],
  nonprofit: [{ id: 'service', name: 'עמותה / ארגון' }, { id: 'property', name: 'פרויקט / קמפיין' }],
};
const DEFAULT_LAYOUTS: { id: StoreLayoutId; name: string }[] = [
  { id: 'classic', name: 'חנות קלאסית' },
  { id: 'service', name: 'כרטיסי שירות' },
  { id: 'property', name: 'נדל״ן / נופש' },
  { id: 'market', name: 'בוטיק / שוק' },
];

// Default layout + palette per business sub-type
const SUB_TYPE_TO_TEMPLATE: Record<string, { layout: StoreLayoutId; palette: ColorPaletteId }> = {
  // Product stores
  fashion:         { layout: 'classic',  palette: 'rose-soft' },
  cosmetics:       { layout: 'classic',  palette: 'rose-soft' },
  jewelry:         { layout: 'classic',  palette: 'midnight-gold' },
  bakery:          { layout: 'classic',  palette: 'coral-cream' },
  flowers:         { layout: 'classic',  palette: 'coral-cream' },
  'home-decor':    { layout: 'classic',  palette: 'warm-earth' },
  electronics:     { layout: 'classic',  palette: 'slate-orange' },
  sports:          { layout: 'classic',  palette: 'dark-lime' },
  books:           { layout: 'classic',  palette: 'bw-classic' },
  pets:            { layout: 'market',   palette: 'sage-green' },
  'general-store': { layout: 'market',   palette: 'sage-green' },
  food:            { layout: 'market',   palette: 'coral-cream' },
  // Services
  beauty:          { layout: 'service',  palette: 'rose-soft' },
  barber:          { layout: 'service',  palette: 'midnight-gold' },
  fitness:         { layout: 'service',  palette: 'dark-lime' },
  renovation:      { layout: 'service',  palette: 'warm-earth' },
  photography:     { layout: 'service',  palette: 'bw-classic' },
  health:          { layout: 'service',  palette: 'cool-ocean' },
  consulting:      { layout: 'service',  palette: 'cool-ocean' },
  legal:           { layout: 'service',  palette: 'bw-classic' },
  developer:       { layout: 'service',  palette: 'dark-lime' },
  'car-dealer':    { layout: 'classic',  palette: 'slate-orange' },
  // Real estate / vacation
  broker:          { layout: 'property', palette: 'midnight-gold' },
  vacation:        { layout: 'property', palette: 'cool-ocean' },
  // Nonprofits
  charity:         { layout: 'service',  palette: 'sage-green' },
  crowdfunding:    { layout: 'service',  palette: 'bold-violet' },
  community:       { layout: 'service',  palette: 'warm-earth' },
  education:       { layout: 'service',  palette: 'cool-ocean' },
  social:          { layout: 'service',  palette: 'sage-green' },
  animals:         { layout: 'service',  palette: 'sage-green' },
};

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const StepTemplate = ({ data, updateData, onBack }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createBusiness = useCreateBusiness();

  const layouts = LAYOUTS_FOR[data.businessType ?? ''] ?? DEFAULT_LAYOUTS;

  const subTypeDefaults = data.businessSubType ? SUB_TYPE_TO_TEMPLATE[data.businessSubType] : undefined;

  const [selectedLayout, setSelectedLayout] = useState<StoreLayoutId>(() => {
    const t = data.storeTemplate || '';
    const maybeLayout = t.split('-')[0] as StoreLayoutId;
    if (layouts.find(l => l.id === maybeLayout)) return maybeLayout;
    if (subTypeDefaults && layouts.find(l => l.id === subTypeDefaults.layout)) return subTypeDefaults.layout;
    return layouts[0].id;
  });

  const [selectedPalette, setSelectedPalette] = useState<ColorPaletteId>(() => {
    const t = data.storeTemplate || '';
    const dashIdx = t.indexOf('-');
    if (dashIdx >= 0) {
      const maybePalette = t.slice(dashIdx + 1) as ColorPaletteId;
      if (paletteList.find(p => p.id === maybePalette)) return maybePalette;
    }
    if (subTypeDefaults) return subTypeDefaults.palette;
    return 'bw-classic';
  });

  const [customColor, setCustomColor] = useState(data.extractedBranding?.primaryColor || '#22c55e');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [legalAcknowledged, setLegalAcknowledged] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);

  const commit = (layoutId: StoreLayoutId, paletteId: ColorPaletteId, color: string) => {
    const primaryColor = paletteId === 'custom'
      ? color
      : (paletteList.find(p => p.id === paletteId)?.theme.primaryColor || '#111');
    updateData({
      storeTemplate: `${layoutId}-${paletteId}` as any,
      extractedBranding: {
        ...(data.extractedBranding || { brandStyle: 'modern' as const, suggestedTagline: '', businessDescription: '', colorPalette: [] }),
        primaryColor,
      },
    });
  };

  const handleLayoutSelect = (id: StoreLayoutId) => { setSelectedLayout(id); commit(id, selectedPalette, customColor); };
  const handlePaletteSelect = (id: ColorPaletteId) => { setSelectedPalette(id); setShowColorPicker(id === 'custom'); commit(selectedLayout, id, customColor); };

  const businessSlug = data.businessName.toLowerCase().replace(/\s+/g, '-').replace(/[^֐-׿a-z0-9-]/g, '');

  const handlePublish = async () => {
    if (!user) { toast({ title: 'נדרשת התחברות', variant: 'destructive' }); navigate('/login'); return; }
    setIsPublishing(true);
    setPublishProgress(5);
    const iv = setInterval(() => setPublishProgress(p => p < 88 ? p + Math.max(1, Math.round((88 - p) / 10)) : p), 350);

    try {
      const branding = data.extractedBranding;
      const template = getTemplate(data.storeTemplate);
      const primaryColor = branding?.primaryColor || template.theme.primaryColor;
      const colorPalette = branding?.colorPalette || [template.theme.accentColor, template.theme.mutedColor, template.theme.cardColor];
      const businessTypeLabels: Record<string, string> = { products: 'מוצרים', services: 'שירותים', nonprofit: 'עמותה' };
      const resolvedCategory: BusinessCategory =
        (data.businessSubType ? SUB_TYPE_TO_CATEGORY[data.businessSubType] : null)
        || (data.businessCategory !== 'other' ? data.businessCategory : null)
        || 'other';
      const effectiveCustomName = data.customCategoryName
        || (data.businessSubType ? SUB_TYPE_LABELS[data.businessSubType] : null)
        || (data.businessType ? businessTypeLabels[data.businessType] : undefined);
      const categoryConfig = getCategoryConfig(resolvedCategory);
      const categoriesToCreate = data.productCategories?.length
        ? data.productCategories.slice()
        : categoryConfig.categories.map((name, idx) => ({ id: `config-${idx}-${name}`, name, description: undefined }));

      const result = await createBusiness.mutateAsync({
        businessName: data.businessName, phone: data.phone, email: data.orderEmail, slug: businessSlug,
        tagline: branding?.suggestedTagline, primaryColor, colorPalette, brandStyle: branding?.brandStyle || 'modern',
        businessCategory: resolvedCategory, customCategoryName: effectiveCustomName,
        isReligiousAudience: data.isReligiousAudience, paymentEnabled: false, paymentProvider: null,
        logo: data.logo, heroImageUrl: branding?.heroImageUrl, templateId: data.storeTemplate,
        productCategories: categoriesToCreate,
        products: data.products.map(p => ({ id: p.id, name: p.name, description: p.description, price: p.price, image: p.image, imageUrl: p.imageUrl, categoryId: p.categoryId })),
      });

      clearInterval(iv);
      setPublishProgress(100);

      if (skipPublishPayment && user) {
        const token = crypto.randomUUID();
        const { error: sessErr } = await supabase.from('publish_checkout_sessions').insert({
          user_id: user.id, business_id: result.businessId, session_token: token,
          status: 'pending', amount_ils: getPublishFeeIls(), provider: 'icount',
        });
        if (sessErr) { toast({ title: 'שגיאה', variant: 'destructive' }); return; }
        const { data: fin, error: finErr } = await supabase.functions.invoke('finalize-publish', { body: { sessionToken: token } });
        if (fin?.legalNotApproved) { toast({ title: 'האתר נבנה! 🎉', description: 'אשרו את המסמכים בדשבורד.' }); navigate('/dashboard'); return; }
        if (finErr || !fin?.ok) { navigate(`/publish-payment?businessId=${encodeURIComponent(result.businessId)}`, { state: { onboardingData: data } }); return; }
        navigate('/onboarding/complete', { state: { data } });
        return;
      }
      navigate(`/publish-payment?businessId=${encodeURIComponent(result.businessId)}`, { state: { onboardingData: data } });
    } catch (err: any) {
      clearInterval(iv);
      toast({ title: 'שגיאה בפרסום', description: err.message || 'משהו השתבש, נסה שוב', variant: 'destructive' });
      setIsPublishing(false);
      setPublishProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: 'hsl(var(--background))' }} dir="rtl">

      {/* Back */}
      <button
        onClick={onBack}
        className="absolute top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors"
        style={{ background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
      >
        <ArrowRight className="w-4 h-4" />
        חזרה
      </button>

      {/* Full-screen store preview */}
      <div className="flex-1 overflow-auto">
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        }>
          <StorePreviewPanel data={data} layoutId={selectedLayout} paletteId={selectedPalette} fullscreen />
        </Suspense>
      </div>

      {/* Floating toolbar — two rows */}
      <div
        className="shrink-0 border-t"
        style={{ background: 'hsl(var(--background) / 0.97)', backdropFilter: 'blur(12px)', borderColor: 'hsl(var(--border))' }}
      >
        {/* Row 1: Layout + CTA */}
        <div className="flex items-center gap-3 px-4 pt-3 pb-2">
          <span className="text-xs text-muted-foreground shrink-0">עמדה:</span>
          <div className="flex gap-1.5">
            {layouts.map(l => (
              <button
                key={l.id}
                onClick={() => handleLayoutSelect(l.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                  selectedLayout === l.id ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
                style={selectedLayout === l.id ? undefined : { background: 'hsl(var(--muted))' }}
              >
                {selectedLayout === l.id && <Check className="w-3 h-3" />}
                {l.name}
              </button>
            ))}
          </div>

          {/* Primary CTA */}
          <button
            onClick={() => setShowPublishModal(true)}
            className="mr-auto flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-bold transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            style={{ boxShadow: '0 4px 20px hsl(var(--primary) / 0.4)' }}
          >
            <Rocket className="w-4 h-4 shrink-0" />
            סיימתי — פרסמו
          </button>
        </div>

        {/* Row 2: Colors */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <span className="text-xs text-muted-foreground shrink-0">צבע:</span>
          <div className="flex gap-1.5 overflow-x-auto">
            {paletteList.map(p => (
              <button
                key={p.id}
                onClick={() => handlePaletteSelect(p.id)}
                title={p.name}
                className={`flex gap-0.5 p-1 rounded-lg transition-all shrink-0 ${
                  selectedPalette === p.id ? 'ring-2 ring-primary ring-offset-1' : 'opacity-60 hover:opacity-100'
                }`}
              >
                {p.swatch.slice(0, 2).map((hex, j) => (
                  <span key={j} className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: hex }} />
                ))}
              </button>
            ))}
            <button
              onClick={() => { handlePaletteSelect('custom'); setShowColorPicker(v => !v); }}
              title="צבע חופשי"
              className={`p-1 rounded-lg transition-all shrink-0 ${selectedPalette === 'custom' ? 'ring-2 ring-primary ring-offset-1' : 'opacity-60 hover:opacity-100'}`}
            >
              <Pipette className="w-4 h-4 text-muted-foreground" />
            </button>
            {showColorPicker && selectedPalette === 'custom' && (
              <input
                type="color"
                value={customColor}
                onChange={e => { setCustomColor(e.target.value); commit(selectedLayout, 'custom', e.target.value); }}
                className="w-8 h-8 rounded-lg cursor-pointer shrink-0 p-0.5 border"
                style={{ borderColor: 'hsl(var(--border))' }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Publish modal */}
      <AnimatePresence>
        {showPublishModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={() => !isPublishing && setShowPublishModal(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-lg rounded-t-3xl p-6 space-y-5"
              style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              onClick={e => e.stopPropagation()}
            >
              {isPublishing ? (
                <div className="text-center space-y-4 py-4">
                  <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
                  <p className="font-semibold text-foreground">מקים את האתר שלכם...</p>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      animate={{ width: `${publishProgress}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">עוד כמה רגעים ויש לכם לינק לאתר 🎉</p>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-4xl mb-3">🚀</div>
                    <h2 className="text-xl font-bold text-foreground">מוכנים לפרסם?</h2>
                    <p className="text-sm text-muted-foreground mt-1">69 ₪ לחודש · ביטול בכל עת · ללא התחייבות</p>
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={legalAcknowledged}
                      onChange={e => setLegalAcknowledged(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-primary shrink-0"
                    />
                    <span className="text-xs text-muted-foreground leading-relaxed">
                      קראתי ואני מסכים/ה ל
                      <a href="/terms" target="_blank" className="text-primary hover:underline mx-1">תנאי השימוש</a>
                      ול
                      <a href="/privacy" target="_blank" className="text-primary hover:underline mx-1">מדיניות הפרטיות</a>
                    </span>
                  </label>
                  <button
                    onClick={handlePublish}
                    disabled={!legalAcknowledged}
                    className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style={{ boxShadow: '0 6px 24px hsl(var(--primary) / 0.35)' }}
                  >
                    <Rocket className="w-5 h-5" />
                    פרסמו את האתר ←
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StepTemplate;
