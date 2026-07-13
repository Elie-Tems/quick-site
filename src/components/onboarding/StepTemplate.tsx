import { useState, Suspense } from "react";
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


const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const hexToHue = (hex: string): number => {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 0;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / (max - min) + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / (max - min) + 2) / 6;
  else h = ((r - g) / (max - min) + 4) / 6;
  return Math.round(h * 360);
};

const StepTemplate = ({ data, updateData, onBack }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createBusiness = useCreateBusiness();

  const businessType = data.businessType ?? '';
  const subTypeDefaults = data.businessSubType ? SUB_TYPE_TO_TEMPLATE[data.businessSubType] : undefined;

  // Templates relevant to this business type first (then the rest). Referenced by
  // the default-layout picker below; was previously undefined -> the step crashed
  // for any new user without a pre-set storeTemplate.
  const orderedTemplates = [...ALL_TEMPLATES].sort((a, b) => {
    const am = a.forTypes.includes(businessType) ? 0 : 1;
    const bm = b.forTypes.includes(businessType) ? 0 : 1;
    return am - bm;
  });

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
  const [hue, setHue] = useState(() => hexToHue(data.extractedBranding?.primaryColor || '#22c55e'));
  const [hexInput, setHexInput] = useState(data.extractedBranding?.primaryColor || '#22c55e');
  const [isPublishing, setIsPublishing] = useState(false);

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

  const handlePaletteSelect = (id: ColorPaletteId) => { setSelectedPalette(id); commit(selectedLayout, id, customColor); };

  const businessSlug = data.businessName.toLowerCase().replace(/\s+/g, '-').replace(/[^֐-׿a-z0-9-]/g, '');

  const handlePublish = async () => {
    if (!user) { toast({ title: 'נדרשת התחברות', variant: 'destructive' }); navigate('/login'); return; }
    setIsPublishing(true);

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
      toast({ title: 'שגיאה בפרסום', description: err.message || 'משהו השתבש, נסה שוב', variant: 'destructive' });
      setIsPublishing(false);
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
        <div className="px-3 pb-3 space-y-3">
          <p className="text-[10px] font-semibold pv-faint uppercase tracking-wider">צבע האתר</p>

          {/* Preset swatches */}
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
          </div>

          {/* Custom color — always visible */}
          <div className="rounded-xl border p-2.5 space-y-2" style={{ borderColor: 'var(--pv-border,#444)', background: 'var(--pv-surface,rgba(255,255,255,0.04))' }}>
            <p className="text-[9px] font-semibold pv-faint uppercase tracking-wider flex items-center gap-1">
              <Pipette className="w-3 h-3" /> צבע מותאם אישית
            </p>
            {/* Hue slider */}
            <div>
              <p className="text-[9px] pv-faint mb-1">גוון</p>
              <div className="relative h-5 rounded-full overflow-hidden" style={{
                background: 'linear-gradient(to left, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
              }}>
                <input
                  type="range" min="0" max="360" value={hue}
                  onChange={e => {
                    const h = Number(e.target.value);
                    setHue(h);
                    const hex = hslToHex(h, 70, 45);
                    setHexInput(hex);
                    setCustomColor(hex);
                    setSelectedPalette('custom');
                    commit(selectedLayout, 'custom', hex);
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="absolute top-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md pointer-events-none"
                  style={{ left: `${(hue / 360) * 100}%`, transform: 'translate(-50%, -50%)', background: hslToHex(hue, 70, 45) }} />
              </div>
            </div>
            {/* Hex input */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg shrink-0 border-2 border-white/20 shadow-inner" style={{ background: customColor }} />
              <input
                type="text"
                value={hexInput}
                maxLength={7}
                placeholder="#000000"
                dir="ltr"
                onChange={e => {
                  const val = e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value;
                  setHexInput(val);
                  if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                    setCustomColor(val);
                    setHue(hexToHue(val));
                    setSelectedPalette('custom');
                    commit(selectedLayout, 'custom', val);
                  }
                }}
                className="flex-1 text-xs font-mono px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-1 focus:ring-primary"
                style={{ background: 'var(--pv-surface,rgba(255,255,255,0.07))', borderColor: 'var(--pv-border,#444)', color: 'var(--pv-text,#fff)' }}
              />
            </div>
          </div>
        </div>

        {/* CTA — big and prominent */}
        <div className="mt-auto px-3 pb-5 pt-3 border-t" style={{ borderColor: 'var(--pv-border,#333)' }}>
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="w-full py-5 rounded-2xl text-white font-extrabold text-base flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-70"
            style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', boxShadow: '0 6px 24px rgba(34,197,94,0.4)' }}
          >
            {isPublishing ? <><Loader2 className="w-5 h-5 animate-spin" /> בונים את האתר...</> : <><Rocket className="w-5 h-5" /> פרסמו את האתר ←</>}
          </button>
        </div>
      </div>

      {/* ── PREVIEW ── */}
      <div className="flex-1 min-w-0 flex flex-col">
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

    </div>
  );
};

export default StepTemplate;
