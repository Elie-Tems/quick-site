import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Pipette, Loader2, Rocket, ChevronLeft } from "lucide-react";
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

// All available templates with visual descriptions
const ALL_TEMPLATES: { id: StoreLayoutId; name: string; desc: string; gradient: string; forTypes: string[] }[] = [
  { id: 'classic',    name: 'חנות קלאסית',   desc: 'רשת מוצרים, 3 עמודות',        gradient: 'linear-gradient(135deg,#6366f1 0%,#4338ca 100%)', forTypes: ['products','realestate','nonprofit','services',''] },
  { id: 'market',     name: 'שוק / מארקט',   desc: 'עיצוב חי עם תמונות גדולות',   gradient: 'linear-gradient(135deg,#f59e0b 0%,#ea580c 100%)', forTypes: ['products',''] },
  { id: 'boutique',   name: 'בוטיק יוקרה',   desc: 'מינימליסטי ואלגנטי',          gradient: 'linear-gradient(135deg,#ec4899 0%,#be185d 100%)', forTypes: ['products','services',''] },
  { id: 'service',    name: 'כרטיסי שירות',  desc: 'לנותני שירות ויועצים',        gradient: 'linear-gradient(135deg,#14b8a6 0%,#0d9488 100%)', forTypes: ['services','nonprofit',''] },
  { id: 'beauty-spa', name: 'יופי וספא',      desc: 'עדין ורומנטי לטיפוח',        gradient: 'linear-gradient(135deg,#f472b6 0%,#a855f7 100%)', forTypes: ['services',''] },
  { id: 'home-pro',   name: 'בית ושיפוצים',  desc: 'מקצועי לבית ותשתיות',        gradient: 'linear-gradient(135deg,#78716c 0%,#44403c 100%)', forTypes: ['services',''] },
  { id: 'property',   name: 'נדל"ן / נופש',  desc: 'תמונות גדולות לנכסים',        gradient: 'linear-gradient(135deg,#0ea5e9 0%,#1d4ed8 100%)', forTypes: ['realestate','services',''] },
  { id: 'charity',    name: 'עמותה / ארגון', desc: 'גיוס תרומות וקהילה',          gradient: 'linear-gradient(135deg,#22c55e 0%,#15803d 100%)', forTypes: ['nonprofit',''] },
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

// CSS-only mock storefront thumbnail: shows visual layout cues without rendering actual components
const MockPreview = ({ layoutId, gradient }: { layoutId: StoreLayoutId; gradient: string }) => {
  const isService = layoutId === 'service';
  const isProperty = layoutId === 'property';
  const isCharity = layoutId === 'charity';
  const isBoutique = layoutId === 'boutique' || layoutId === 'beauty-spa';

  return (
    <div className="w-full h-full flex flex-col overflow-hidden rounded-t-xl" style={{ background: '#f8f8f8' }}>
      {/* Mock nav */}
      <div className="h-5 flex items-center px-2 gap-1 border-b border-gray-200" style={{ background: '#fff' }}>
        <div className="w-8 h-2 rounded" style={{ background: gradient.slice(0, -1).replace('linear-gradient(135deg,', '').split(' ')[0] }} />
        <div className="flex-1" />
        {[1,2,3].map(i => <div key={i} className="w-5 h-1.5 rounded bg-gray-200 ml-1" />)}
      </div>
      {/* Mock hero */}
      <div className="h-14 flex items-center justify-center relative overflow-hidden" style={{ background: gradient }}>
        <div className="w-16 h-2 rounded-full bg-white/80" />
        <div className="absolute bottom-2 left-0 right-0 flex justify-center">
          <div className="w-10 h-1.5 rounded-full bg-white/50" />
        </div>
      </div>
      {/* Mock content */}
      {isService || isCharity ? (
        <div className="flex-1 p-2 flex flex-col gap-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded bg-white border border-gray-100 p-1.5 flex flex-col gap-0.5">
                <div className="w-6 h-6 rounded-full mx-auto" style={{ background: gradient }} />
                <div className="w-10 h-1.5 rounded bg-gray-200 mx-auto" />
                <div className="w-8 h-1 rounded bg-gray-100 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      ) : isProperty ? (
        <div className="flex-1 p-2 grid grid-cols-2 gap-1.5">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded bg-gray-200 overflow-hidden aspect-[4/3]">
              <div className="w-full h-3/5" style={{ background: `linear-gradient(135deg, #ddd ${i*10}%, #bbb)` }} />
              <div className="p-1 flex flex-col gap-0.5">
                <div className="w-10 h-1.5 rounded bg-gray-300" />
                <div className="w-7 h-1 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      ) : isBoutique ? (
        <div className="flex-1 p-2">
          <div className="grid grid-cols-2 gap-1.5">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded overflow-hidden bg-gray-200">
                <div className="h-12 w-full" style={{ background: `hsl(${i*60+30},20%,${75+i*3}%)` }} />
                <div className="p-1 bg-white">
                  <div className="w-10 h-1.5 rounded bg-gray-200 mb-0.5" />
                  <div className="w-6 h-1 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 p-2">
          <div className="grid grid-cols-3 gap-1">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="rounded bg-white border border-gray-100 overflow-hidden">
                <div className="h-8 w-full bg-gray-100" style={{ opacity: 0.5 + i*0.05 }} />
                <div className="p-1">
                  <div className="w-full h-1 rounded bg-gray-200 mb-0.5" />
                  <div className="w-2/3 h-1 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StepTemplate = ({ data, updateData, onBack }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createBusiness = useCreateBusiness();

  const businessType = data.businessType ?? '';
  const subTypeDefaults = data.businessSubType ? SUB_TYPE_TO_TEMPLATE[data.businessSubType] : undefined;

  // Sort templates: recommended for this business type first
  const orderedTemplates = [
    ...ALL_TEMPLATES.filter(t => t.forTypes.includes(businessType) && t.id !== 'classic'),
    ALL_TEMPLATES.find(t => t.id === 'classic')!,
    ...ALL_TEMPLATES.filter(t => !t.forTypes.includes(businessType) && t.id !== 'classic'),
  ].filter(Boolean);

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
        tagline: branding?.suggestedTagline, primaryColor, colorPalette, brandStyle: branding?.brandStyle || 'modern',
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

  const selectedTpl = ALL_TEMPLATES.find(t => t.id === selectedLayout) ?? ALL_TEMPLATES[0];

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold pv-strong mb-1">בחרו את מראה האתר</h2>
        <p className="text-sm pv-muted">בחרו תבנית וצבעים - אפשר לשנות בכל עת מהדשבורד</p>
      </div>

      {/* Template selector grid */}
      <div className="grid grid-cols-2 gap-3">
        {orderedTemplates.map((tpl, i) => {
          const isActive = selectedLayout === tpl.id;
          const isRecommended = i === 0 && tpl.forTypes.includes(businessType) && tpl.id !== 'classic';
          return (
            <button
              key={tpl.id}
              onClick={() => handleLayoutSelect(tpl.id)}
              className="relative group text-right rounded-2xl overflow-hidden transition-all focus:outline-none"
              style={{
                border: isActive ? '2px solid var(--color-primary, #22c55e)' : '2px solid var(--pv-border, #333)',
                boxShadow: isActive ? '0 0 0 3px rgba(34,197,94,0.15)' : undefined,
              }}
            >
              {/* Visual mock preview */}
              <div className="aspect-[16/9] overflow-hidden relative">
                <MockPreview layoutId={tpl.id} gradient={tpl.gradient} />
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.08)' }}>
                    <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
                {isRecommended && (
                  <div className="absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: tpl.gradient }}>
                    מומלץ
                  </div>
                )}
              </div>
              {/* Label */}
              <div className="px-2.5 py-2" style={{ background: 'var(--pv-surface2, #111)' }}>
                <p className={`text-xs font-semibold ${isActive ? 'text-green-400' : 'pv-strong'}`}>{tpl.name}</p>
                <p className="text-[10px] pv-faint">{tpl.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Live preview of selected template */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--pv-border, #333)' }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--pv-surface2,#111)', borderBottom: '1px solid var(--pv-border,#333)' }}>
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400/70" />
          <span className="mx-auto text-[11px] pv-faint font-mono">תצוגה מקדימה — {selectedTpl.name}</span>
        </div>
        <div style={{ height: 280, background: '#f0f0f0', overflow: 'hidden', position: 'relative' }}>
          <SoftErrorBoundary
            fallback={
              <div className="flex items-center justify-center h-full" style={{ background: '#f0f0f0' }}>
                <MockPreview layoutId={selectedLayout} gradient={selectedTpl.gradient} />
              </div>
            }
          >
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

      {/* Color palette */}
      <div className="rounded-xl p-3" style={{ background: 'var(--pv-surface2,#111)', border: '1px solid var(--pv-border,#333)' }}>
        <p className="text-xs pv-muted mb-2.5 font-medium">צבע האתר</p>
        <div className="flex flex-wrap gap-2">
          {paletteList.map(p => (
            <button
              key={p.id}
              onClick={() => handlePaletteSelect(p.id)}
              title={p.name}
              className={`flex gap-0.5 p-1 rounded-lg transition-all ${selectedPalette === p.id ? 'ring-2 ring-primary ring-offset-1 ring-offset-transparent' : 'opacity-60 hover:opacity-100'}`}
            >
              {p.swatch.slice(0, 2).map((hex, j) => (
                <span key={j} className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: hex }} />
              ))}
            </button>
          ))}
          <button
            onClick={() => { handlePaletteSelect('custom'); setShowColorPicker(v => !v); }}
            title="צבע חופשי"
            className={`p-1 rounded-lg transition-all ${selectedPalette === 'custom' ? 'ring-2 ring-primary ring-offset-1 ring-offset-transparent' : 'opacity-60 hover:opacity-100'}`}
          >
            <Pipette className="w-4 h-4 pv-muted" />
          </button>
          {showColorPicker && selectedPalette === 'custom' && (
            <input
              type="color"
              value={customColor}
              onChange={e => { setCustomColor(e.target.value); commit(selectedLayout, 'custom', e.target.value); }}
              className="w-8 h-8 rounded-lg cursor-pointer p-0.5 border border-border"
            />
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex gap-3 pb-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 h-12 rounded-xl border text-sm transition-colors"
          style={{ borderColor: 'var(--pv-border,#333)', color: 'var(--pv-muted)' }}
        >
          <ChevronLeft className="w-4 h-4" />
          חזרה
        </button>
        <button
          onClick={() => setShowPublishModal(true)}
          className="flex-1 h-12 rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, var(--color-primary,#22c55e) 0%, #16a34a 100%)', boxShadow: '0 4px 20px rgba(34,197,94,0.35)' }}
        >
          <Rocket className="w-5 h-5" />
          סיימתי — פרסמו את האתר
        </button>
      </div>

      {/* Publish modal */}
      <AnimatePresence>
        {showPublishModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
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
