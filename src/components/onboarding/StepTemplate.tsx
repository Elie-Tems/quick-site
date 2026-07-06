import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Pipette } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";
import { storeLayouts, type StoreLayoutId } from "@/lib/storeTemplates";
import { paletteList, type ColorPaletteId } from "@/lib/colorPalettes";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// Layout wireframe previews — tiny SVG showing structural difference between layouts
const LayoutWireframe = ({ id, primaryColor }: { id: StoreLayoutId; primaryColor: string }) => {
  const c = primaryColor || '#22c55e';
  if (id === 'classic') return (
    <svg viewBox="0 0 80 56" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="6" fill={c} opacity=".9" />
      <rect x="2" y="8" width="76" height="16" rx="1" fill={c} opacity=".25" />
      <rect x="2" y="26" width="23" height="14" rx="1" fill={c} opacity=".15" />
      <rect x="29" y="26" width="23" height="14" rx="1" fill={c} opacity=".15" />
      <rect x="56" y="26" width="23" height="14" rx="1" fill={c} opacity=".15" />
      <rect x="16" y="43" width="48" height="3" rx="1.5" fill={c} opacity=".3" />
    </svg>
  );
  if (id === 'service') return (
    <svg viewBox="0 0 80 56" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="5" fill={c} opacity=".9" />
      <rect x="2" y="7" width="36" height="22" rx="1" fill={c} opacity=".1" />
      <rect x="5" y="11" width="20" height="2" rx="1" fill={c} opacity=".6" />
      <rect x="5" y="15" width="28" height="1.5" rx=".75" fill={c} opacity=".3" />
      <rect x="5" y="18" width="24" height="1.5" rx=".75" fill={c} opacity=".3" />
      <rect x="5" y="24" width="16" height="4" rx="2" fill={c} opacity=".7" />
      <rect x="40" y="7" width="38" height="22" rx="1" fill={c} opacity=".2" />
      <rect x="2" y="32" width="36" height="14" rx="1" fill={c} opacity=".12" />
      <rect x="42" y="32" width="36" height="14" rx="1" fill={c} opacity=".12" />
    </svg>
  );
  if (id === 'property') return (
    <svg viewBox="0 0 80 56" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="5" fill={c} opacity=".9" />
      <rect x="2" y="7" width="76" height="14" rx="1" fill={c} opacity=".2" />
      <rect x="4" y="10" width="20" height="2" rx="1" fill="white" opacity=".7" />
      <rect x="2" y="24" width="48" height="22" rx="1" fill={c} opacity=".15" />
      <rect x="52" y="24" width="26" height="10" rx="1" fill={c} opacity=".12" />
      <rect x="52" y="36" width="26" height="10" rx="1" fill={c} opacity=".12" />
    </svg>
  );
  // market
  return (
    <svg viewBox="0 0 80 56" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="5" fill={c} opacity=".9" />
      <rect x="2" y="7" width="76" height="8" rx="1" fill={c} opacity=".2" />
      <rect x="4" y="9.5" width="10" height="2.5" rx="1.25" fill={c} opacity=".8" />
      <rect x="17" y="9.5" width="10" height="2.5" rx="1.25" fill={c} opacity=".2" />
      <rect x="30" y="9.5" width="10" height="2.5" rx="1.25" fill={c} opacity=".2" />
      <rect x="2" y="18" width="17" height="12" rx="1" fill={c} opacity=".13" />
      <rect x="21" y="18" width="17" height="12" rx="1" fill={c} opacity=".13" />
      <rect x="41" y="18" width="17" height="12" rx="1" fill={c} opacity=".13" />
      <rect x="61" y="18" width="17" height="12" rx="1" fill={c} opacity=".13" />
      <rect x="2" y="32" width="17" height="12" rx="1" fill={c} opacity=".1" />
      <rect x="21" y="32" width="17" height="12" rx="1" fill={c} opacity=".1" />
      <rect x="41" y="32" width="17" height="12" rx="1" fill={c} opacity=".1" />
      <rect x="61" y="32" width="17" height="12" rx="1" fill={c} opacity=".1" />
    </svg>
  );
};

const LAYOUT_ORDER: StoreLayoutId[] = ['classic', 'service', 'property', 'market'];

const StepTemplate = ({ data, updateData, onNext, onBack }: Props) => {
  // Parse current selection from storeTemplate string ("layoutId-paletteId")
  const [selectedLayout, setSelectedLayout] = useState<StoreLayoutId>(() => {
    const t = data.storeTemplate || '';
    const maybeLayout = t.split('-')[0] as StoreLayoutId;
    return storeLayouts[maybeLayout] ? maybeLayout : 'classic';
  });

  const [selectedPalette, setSelectedPalette] = useState<ColorPaletteId>(() => {
    const t = data.storeTemplate || '';
    const dashIdx = t.indexOf('-');
    if (dashIdx < 0) return 'bw-classic';
    const maybePalette = t.slice(dashIdx + 1) as ColorPaletteId;
    const known = paletteList.find(p => p.id === maybePalette);
    return known ? known.id : 'bw-classic';
  });

  const [customColor, setCustomColor] = useState<string>(
    data.extractedBranding?.primaryColor || '#22c55e'
  );
  const [showColorPicker, setShowColorPicker] = useState(false);

  const currentPrimaryColor = selectedPalette === 'custom'
    ? customColor
    : (paletteList.find(p => p.id === selectedPalette)?.theme.primaryColor || '#111');

  const commitSelection = (layoutId: StoreLayoutId, paletteId: ColorPaletteId, color: string) => {
    const templateId = `${layoutId}-${paletteId}`;
    const primaryColor = paletteId === 'custom'
      ? color
      : (paletteList.find(p => p.id === paletteId)?.theme.primaryColor || '#111');
    updateData({
      storeTemplate: templateId as any,
      extractedBranding: {
        ...(data.extractedBranding || {
          brandStyle: 'modern' as const,
          suggestedTagline: '',
          businessDescription: '',
          colorPalette: [],
        }),
        primaryColor,
      },
    });
  };

  const handleLayoutSelect = (layoutId: StoreLayoutId) => {
    setSelectedLayout(layoutId);
    commitSelection(layoutId, selectedPalette, customColor);
  };

  const handlePaletteSelect = (paletteId: ColorPaletteId) => {
    setSelectedPalette(paletteId);
    setShowColorPicker(paletteId === 'custom');
    commitSelection(selectedLayout, paletteId, customColor);
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    commitSelection(selectedLayout, 'custom', color);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold pv-strong mb-1">איך נראה האתר שלכם?</h2>
        <p className="text-sm pv-muted">בחרו מבנה + צבעים — הכל ניתן לשינוי אחר כך</p>
      </div>

      {/* Layout selection */}
      <div>
        <p className="text-xs font-medium pv-faint uppercase tracking-wider mb-3">מבנה האתר</p>
        <div className="grid grid-cols-2 gap-3">
          {LAYOUT_ORDER.map((layoutId, i) => {
            const layout = storeLayouts[layoutId];
            const isSelected = selectedLayout === layoutId;
            return (
              <motion.button
                key={layoutId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: i * 0.05 }}
                onClick={() => handleLayoutSelect(layoutId)}
                className={`rounded-2xl border-2 p-3 text-right transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'pv-hover'
                }`}
                style={isSelected ? undefined : { borderColor: "var(--pv-border)", background: "var(--pv-surface2)" }}
              >
                <div className="w-full aspect-[80/56] rounded-lg overflow-hidden mb-3" style={{ background: "var(--pv-surface)" }}>
                  <LayoutWireframe id={layoutId} primaryColor={currentPrimaryColor} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium pv-strong">{layout.name}</p>
                    <p className="text-xs pv-muted mt-0.5">
                      {layout.description.split('.')[0]}
                    </p>
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Color palette selection */}
      <div>
        <p className="text-xs font-medium pv-faint uppercase tracking-wider mb-3">ערכת צבעים</p>
        <div className="flex flex-wrap gap-2">
          {paletteList.map(palette => {
            const isSelected = selectedPalette === palette.id;
            return (
              <button
                key={palette.id}
                onClick={() => handlePaletteSelect(palette.id)}
                title={palette.name}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  isSelected ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'pv-muted'
                }`}
                style={isSelected ? undefined : { borderColor: "var(--pv-border)", background: "var(--pv-surface2)" }}
              >
                <span className="flex gap-0.5 shrink-0">
                  {palette.swatch.slice(0, 2).map((hex, j) => (
                    <span
                      key={j}
                      className="w-3 h-3 rounded-full border border-black/20"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </span>
                {palette.name}
                {isSelected && <Check className="w-3 h-3" />}
              </button>
            );
          })}

          {/* Custom color picker button */}
          <button
            onClick={() => { handlePaletteSelect('custom'); setShowColorPicker(true); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
              selectedPalette === 'custom' ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'pv-muted'
            }`}
            style={selectedPalette === 'custom' ? undefined : { borderStyle: "dashed", borderColor: "var(--pv-border)", background: "var(--pv-surface2)" }}
          >
            <Pipette className="w-3.5 h-3.5" />
            צבע חופשי
            {selectedPalette === 'custom' && <Check className="w-3 h-3" />}
          </button>
        </div>

        {showColorPicker && selectedPalette === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 flex items-center gap-3"
          >
            <input
              type="color"
              value={customColor}
              onChange={e => handleCustomColorChange(e.target.value)}
              className="w-10 h-10 rounded-xl cursor-pointer p-0.5"
              style={{ borderColor: "var(--pv-border)", background: "var(--pv-surface2)" }}
            />
            <div>
              <p className="text-xs font-medium pv-text">{customColor}</p>
              <p className="text-xs pv-faint">לחצו לבחירת צבע ראשי</p>
            </div>
            <div
              className="w-8 h-8 rounded-full shrink-0"
              style={{ backgroundColor: customColor, border: "1px solid var(--pv-border)" }}
            />
          </motion.div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-none px-5 h-12 rounded-xl border text-sm pv-muted pv-hover transition-colors"
          style={{ borderColor: "var(--pv-border)" }}
        >
          חזרה
        </button>
        <button
          onClick={onNext}
          className="flex-1 h-12 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          המשיכו ←
        </button>
      </div>
    </div>
  );
};

export default StepTemplate;
