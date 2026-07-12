import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pipette, Loader2, Rocket, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateBusiness } from "@/hooks/useCreateBusiness";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { OnboardingData } from "@/pages/Onboarding";
import { buildTemplate, type StoreLayoutId } from "@/lib/storeTemplates";
import { paletteList, type ColorPaletteId } from "@/lib/colorPalettes";
import { getCategoryConfig, BusinessCategory } from "@/lib/categoryConfig";
import { getPublishFeeIls } from "@/lib/publishPaymentConfig";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import SoftErrorBoundary from "@/components/SoftErrorBoundary";

const StorePreviewPanel = lazyWithRetry(() => import("./StorePreviewPanel"));

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

// Templates with visual style names (not business-type names)
const ALL_TEMPLATES: { id: StoreLayoutId; name: string; desc: string; gradient: string; forTypes: string[] }[] = [
  { id: 'classic',    name: 'קלאסי',    desc: 'רשת נקייה ומסודרת',         gradient: 'linear-gradient(135deg,#6366f1 0%,#4338ca 100%)', forTypes: ['products','realestate','nonprofit','services',''] },
  { id: 'boutique',   name: 'אלגנטי',   desc: 'מינימליסטי ויוקרתי',        gradient: 'linear-gradient(135deg,#ec4899 0%,#be185d 100%)', forTypes: ['products','services',''] },
  { id: 'market',     name: 'תוסס',     desc: 'צבעוני עם תמונות גדולות',   gradient: 'linear-gradient(135deg,#f59e0b 0%,#ea580c 100%)', forTypes: ['products',''] },
  { id: 'service',    name: 'מקצועי',   desc: 'כרטיסי שירות ברורים',       gradient: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 100%)', forTypes: ['services','nonprofit',''] },
  { id: 'beauty-spa', name: 'עדין',     desc: 'עיצוב רך ורומנטי',          gradient: 'linear-gradient(135deg,#f472b6 0%,#a855f7 100%)', forTypes: ['services',''] },
  { id: 'home-pro',   name: 'עוצמתי',   desc: 'כהה ומכובד',                gradient: 'linear-gradient(135deg,#78716c 0%,#44403c 100%)', forTypes: ['services',''] },
  { id: 'property',   name: 'גלריה',    desc: 'תמונות גדולות ומרשימות',    gradient: 'linear-gradient(135deg,#0ea5e9 0%,#1d4ed8 100%)', forTypes: ['realestate','services',''] },
  { id: 'charity',    name: 'קהילתי',   desc: 'לארגונים ועמותות',          gradient: 'linear-gradient(135deg,#22c55e 0%,#15803d 100%)', forTypes: ['nonprofit',''] },
];

const SUB_TYPE_TO_TEMPLATE: Record<string, { layout: StoreLayoutId; palette: ColorPaletteId }> = {
  fashion:         { layout: 'boutique',   palette: 'rose-soft' },
  cosmetics:       { layout: 'boutique',   palette: 'rose-soft' },
  jewelry:         { layout: 'boutique',   palette: 'midnight-gold' },
  bakery:          { layout: 'classic',    palette: 'coral-cream' },
  flowers:         { layout: 'boutique',   palette: 'coral-cream' },
  'home-decor':    { layout: 'boutique',   palette: 'warm-earth' },
  electronics:     { layout: 'classic',    palette: 'slate-orange' },
  sports:          { layout: 'classic',    palette: 'dark-lime' },
  books:           { layout: 'classic',    palette: 'bw-classic' },
  pets:            { layout: 'market',     palette: 'sage-green' },
  'general-store': { layout: 'market',     palette: 'sage-green' },
  food:            { layout: 'market',     palette: 'coral-cream' },
  beauty:          { layout: 'beauty-spa', palette: 'rose-soft' },
  barber:          { layout: 'beauty-spa', palette: 'midnight-gold' },
  fitness:         { layout: 'service',    palette: 'dark-lime' },
  renovation:      { layout: 'home-pro',   palette: 'warm-earth' },
  photography:     { layout: 'service',    palette: 'bw-classic' },
  health:          { layout: 'beauty-spa', palette: 'cool-ocean' },
  consulting:      { layout: 'service',    palette: 'cool-ocean' },
  legal:           { layout: 'service',    palette: 'bw-classic' },
  developer:       { layout: 'property',   palette: 'midnight-gold' },
  'car-dealer':    { layout: 'classic',    palette: 'slate-orange' },
  broker:          { layout: 'property',   palette: 'midnight-gold' },
  vacation:        { layout: 'property',   palette: 'cool-ocean' },
  charity:         { layout: 'charity',    palette: 'sage-green' },
  crowdfunding:    { layout: 'charity',    palette: 'bold-violet' },
  community:       { layout: 'charity',    palette: 'warm-earth' },
  education:       { layout: 'charity',    palette: 'cool-ocean' },
  social:          { layout: 'charity',    palette: 'sage-green' },
  animals:         { layout: 'charity',    palette: 'sage-green' },
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

  const businessType = data.businessType ?? '';
  const subTypeDefaults = data.businessSubType ? SUB_TYPE_TO_TEMPLATE[data.businessSubType] : undefined;

  const [selectedLayout, setSelectedLayout] = useState<StoreLayoutId>(() => {
    const t = data.storeTemplate || '';
    const maybeLayout = t.split('-')[0] as StoreLayoutId;
    if (ALL_TEMPLATES.find(tpl => tpl.id === maybeLayout)) return maybeLayout;
    if (subTypeDefaults) return subTypeDefaults.layout;
    return orderedTemplates[0]?.id ?? 'classic';
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

  const handlePaletteSelect = (id: ColorPaletteId) => { setSelectedPalette(id); setShowColorPicker(id === 'custom'); commit(selectedLayout, id, customColor); };

  const businessSlug = data.businessName.toLowerCase().replace(/\s+/g, '-').replace(/[^֐-׿a-z0-9-]/g, '');

  const handlePublish = async () => {
    if (!user) { toast({ title: 'נדרשת התחברות', variant: 'destructive' }); navigate('/login'); return; }
    setIsPublishing(true);
    setPublishProgress(5);
    const iv = setInterval(() => setPublishProgress(p => p < 88 ? p + Math.max(1, Math.round((88 - p) / 10)) : p), 350);

    try {
      const branding = data.extractedBranding;
      const template = buildTemplate(selectedLayout, selectedPalette);
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
        tagline: branding?.suggestedTagline, aboutText: data.aboutText, primaryColor, colorPalette, brandStyle: branding?.brandStyle || 'modern',
        businessCategory: resolvedCategory, customCategoryName: effectiveCustomName,
        isReligiousAudience: data.isReligiousAudience,
        businessType: data.businessType,
        businessSubType: data.businessSubType,
        paymentEnabled: false, paymentProvider: null,
        logo: data.logo, heroImageUrl: branding?.heroImageUrl, templateId: `${selectedLayout}-${selectedPalette}`,
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
    <div className="flex h-[100dvh] overflow-hidden" dir="rtl">

      {/* ── SIDEBAR ── */}
      <div className="w-52 shrink-0 flex flex-col border-l overflow-y-auto" style={{ borderColor: 'var(--pv-border,#333)', background: 'var(--pv-surface2,#111)' }}>

        {/* Logo + back */}
        <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--pv-border,#333)' }}>
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="חזרה">
            <ChevronLeft className="w-4 h-4 pv-muted" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold pv-strong leading-tight truncate">{data.businessName || 'האתר שלכם'}</p>
            <p className="text-[10px] pv-faint leading-tight">בחרו צבע לאתר</p>
          </div>
        </div>

          {/* Color palette */}
        <div className="px-3 pb-3">
          <p className="text-[10px] font-semibold pv-faint uppercase tracking-wider mb-2">צבע האתר</p>
          <div className="grid grid-cols-5 gap-1.5">
            {paletteList.map(p => (
              <button
                key={p.id}
                onClick={() => handlePaletteSelect(p.id)}
                title={p.name}
                className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${p.swatch[0]}, ${p.swatch[1] || p.swatch[0]})`,
                  borderColor: selectedPalette === p.id ? 'hsl(var(--primary))' : 'transparent',
                  boxShadow: selectedPalette === p.id ? '0 0 0 2px hsl(var(--primary)/0.4)' : undefined,
                  opacity: selectedPalette === p.id ? 1 : 0.6,
                  transform: selectedPalette === p.id ? 'scale(1.15)' : undefined,
                }}
              />
            ))}
            <button
              onClick={() => { handlePaletteSelect('custom'); setShowColorPicker(v => !v); }}
              title="צבע חופשי"
              className="w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110"
              style={{
                borderColor: selectedPalette === 'custom' ? 'hsl(var(--primary))' : 'var(--pv-border,#444)',
                background: selectedPalette === 'custom' ? customColor : 'transparent',
                opacity: selectedPalette === 'custom' ? 1 : 0.6,
              }}
            >
              {selectedPalette !== 'custom' && <Pipette className="w-3 h-3 pv-muted" />}
            </button>
          </div>
          {showColorPicker && selectedPalette === 'custom' && (
            <input
              type="color"
              value={customColor}
              onChange={e => { setCustomColor(e.target.value); commit(selectedLayout, 'custom', e.target.value); }}
              className="mt-2 w-full h-8 rounded-lg cursor-pointer border border-border p-0.5"
            />
          )}
        </div>

        {/* CTA */}
        <div className="mt-auto px-3 pb-4 pt-2 border-t space-y-2" style={{ borderColor: 'var(--pv-border,#333)' }}>
          <button
            onClick={() => setShowPublishModal(true)}
            className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-1.5 transition-all hover:opacity-90 active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 4px 16px rgba(34,197,94,0.3)' }}
          >
            <Rocket className="w-4 h-4" />
            פרסמו את האתר ←
          </button>
        </div>
      </div>

      {/* ── PREVIEW ── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Browser chrome */}
        <div className="px-4 py-2.5 flex items-center gap-2 shrink-0" style={{ background: 'var(--pv-surface2,#111)', borderBottom: '1px solid var(--pv-border,#333)' }}>
          <span className="w-3 h-3 rounded-full bg-red-400/80" />
          <span className="w-3 h-3 rounded-full bg-yellow-400/80" />
          <span className="w-3 h-3 rounded-full bg-green-400/80" />
          <div className="flex-1 mx-4">
            <div className="max-w-xs mx-auto text-center text-[11px] pv-faint font-mono px-3 py-1 rounded-md" style={{ background: 'var(--pv-surface,rgba(255,255,255,0.05))' }}>
              siango.app/{businessSlug || 'האתר-שלכם'}
            </div>
          </div>
        </div>
        {/* Live preview — scrollable */}
        <div className="flex-1 overflow-y-auto" style={{ background: '#f0f0f0' }}>
          <SoftErrorBoundary fallback={<div className="w-full h-full bg-gray-100" />}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            }>
              <StorePreviewPanel
                data={data}
                layoutId={selectedLayout}
                paletteId={selectedPalette}
                fullscreen={false}
              />
            </Suspense>
          </SoftErrorBoundary>
        </div>
      </div>

      {/* Publish modal */}
      <AnimatePresence>
        {showPublishModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
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
                    <p className="text-sm text-muted-foreground mt-1">79 ש"ח לחודש · ביטול בכל עת · ללא התחייבות</p>
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
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mx-1">תנאי השימוש</a>
                      ול
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mx-1">מדיניות הפרטיות</a>
                    </span>
                  </label>
                  <button
                    onClick={handlePublish}
                    disabled={!legalAcknowledged}
                    className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-all"
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
