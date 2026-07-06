import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Pipette } from "lucide-react";
import { AuroraBg, PreviewBanner, PreviewThemeRoot } from "@/components/preview-redesign/kit";
import { paletteList, type ColorPaletteId } from "@/lib/colorPalettes";
import { storeLayouts, type StoreLayoutId } from "@/lib/storeTemplates";

const LAYOUT_ORDER: StoreLayoutId[] = ['classic', 'service', 'property', 'market'];

// SVG wireframe per layout — colors derived from selected palette
const Wireframe = ({ id, pc }: { id: StoreLayoutId; pc: string }) => {
  const a = (o: number) => {
    const r = parseInt(pc.slice(1, 3), 16);
    const g = parseInt(pc.slice(3, 5), 16);
    const b = parseInt(pc.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${o})`;
  };
  if (id === 'classic') return (
    <svg viewBox="0 0 160 112" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="12" fill={pc} opacity=".9" />
      <rect x="4" y="15" width="152" height="32" rx="2" fill={a(.22)} />
      <rect x="4" y="52" width="47" height="27" rx="2" fill={a(.14)} />
      <rect x="57" y="52" width="47" height="27" rx="2" fill={a(.14)} />
      <rect x="110" y="52" width="47" height="27" rx="2" fill={a(.14)} />
      <rect x="4" y="84" width="47" height="27" rx="2" fill={a(.1)} />
      <rect x="57" y="84" width="47" height="27" rx="2" fill={a(.1)} />
      <rect x="110" y="84" width="47" height="27" rx="2" fill={a(.1)} />
    </svg>
  );
  if (id === 'service') return (
    <svg viewBox="0 0 160 112" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="11" fill={pc} opacity=".9" />
      <rect x="4" y="14" width="74" height="42" rx="2" fill={a(.1)} />
      <rect x="8" y="20" width="44" height="5" rx="2" fill={a(.5)} />
      <rect x="8" y="28" width="60" height="3" rx="1.5" fill={a(.25)} />
      <rect x="8" y="33" width="52" height="3" rx="1.5" fill={a(.25)} />
      <rect x="8" y="43" width="36" height="9" rx="4" fill={pc} opacity=".7" />
      <rect x="82" y="14" width="74" height="42" rx="2" fill={a(.2)} />
      <rect x="4" y="60" width="74" height="27" rx="2" fill={a(.12)} />
      <rect x="82" y="60" width="74" height="27" rx="2" fill={a(.12)} />
      <rect x="4" y="91" width="74" height="20" rx="2" fill={a(.08)} />
      <rect x="82" y="91" width="74" height="20" rx="2" fill={a(.08)} />
    </svg>
  );
  if (id === 'property') return (
    <svg viewBox="0 0 160 112" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="11" fill={pc} opacity=".9" />
      <rect x="4" y="14" width="152" height="30" rx="2" fill={a(.22)} />
      <rect x="8" y="20" width="50" height="5" rx="2" fill="white" opacity=".6" />
      <rect x="4" y="48" width="96" height="64" rx="3" fill={a(.16)} />
      <rect x="104" y="48" width="52" height="30" rx="2" fill={a(.13)} />
      <rect x="104" y="82" width="52" height="30" rx="2" fill={a(.13)} />
    </svg>
  );
  return (
    <svg viewBox="0 0 160 112" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="11" fill={pc} opacity=".9" />
      <rect x="4" y="14" width="152" height="17" rx="2" fill={a(.18)} />
      <rect x="8" y="18" width="24" height="6" rx="3" fill={pc} opacity=".8" />
      <rect x="36" y="18" width="24" height="6" rx="3" fill={a(.2)} />
      <rect x="64" y="18" width="24" height="6" rx="3" fill={a(.2)} />
      {[0,1,2,3].map(i=><rect key={i} x={4+i*39} y="35" width="35" height="28" rx="2" fill={a(.12)} />)}
      {[0,1,2,3].map(i=><rect key={i} x={4+i*39} y="67" width="35" height="28" rx="2" fill={a(.1)} />)}
      {[0,1,2,3].map(i=><rect key={i} x={4+i*39} y="99" width="35" height="13" rx="2" fill={a(.07)} />)}
    </svg>
  );
};

// Full storefront mockup — larger, more detailed
const StorefrontMockup = ({ layoutId, pc, bg }: { layoutId: StoreLayoutId; pc: string; bg: string }) => {
  const a = (hex: string, o: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${o})`;
  };
  const cardBg = bg === '#ffffff' || bg === '#fff' ? '#f7f7f9' : a(bg, 0.6);

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ background: bg, direction: 'rtl' }}>
      {/* Nav */}
      <div className="flex items-center justify-between px-5 py-3" style={{ background: pc }}>
        <div className="flex gap-2">
          {['', '', ''].map((_, i) => <div key={i} className="h-2 rounded-full" style={{ width: i === 0 ? 48 : 28, background: 'rgba(255,255,255,0.3)' }} />)}
        </div>
        <div className="h-5 w-20 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
      </div>

      {layoutId === 'classic' && (
        <>
          <div className="px-5 py-6" style={{ background: a(pc, 0.12) }}>
            <div className="h-6 w-48 rounded mb-2" style={{ background: a(pc, 0.35) }} />
            <div className="h-3 w-64 rounded mb-4" style={{ background: a(pc, 0.2) }} />
            <div className="h-9 w-28 rounded-lg" style={{ background: pc }} />
          </div>
          <div className="grid grid-cols-3 gap-3 p-4">
            {[0,1,2,3,4,5].map(i => (
              <div key={i} className="rounded-xl overflow-hidden" style={{ background: cardBg }}>
                <div className="h-16" style={{ background: a(pc, 0.15) }} />
                <div className="p-2">
                  <div className="h-2.5 w-3/4 rounded mb-1" style={{ background: a(pc, 0.2) }} />
                  <div className="h-2 w-1/2 rounded" style={{ background: a(pc, 0.12) }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {layoutId === 'service' && (
        <>
          <div className="grid grid-cols-2 gap-0">
            <div className="p-5" style={{ background: a(pc, 0.08) }}>
              <div className="h-5 w-36 rounded mb-2" style={{ background: a(pc, 0.3) }} />
              <div className="h-2.5 w-full rounded mb-1" style={{ background: a(pc, 0.15) }} />
              <div className="h-2.5 w-4/5 rounded mb-4" style={{ background: a(pc, 0.15) }} />
              <div className="h-8 w-24 rounded-lg" style={{ background: pc }} />
            </div>
            <div className="h-36" style={{ background: a(pc, 0.2) }} />
          </div>
          <div className="grid grid-cols-2 gap-3 p-4">
            {[0,1,2,3].map(i => (
              <div key={i} className="rounded-xl p-3" style={{ background: cardBg }}>
                <div className="h-3 w-10 rounded-full mb-2" style={{ background: a(pc, 0.3) }} />
                <div className="h-2.5 w-full rounded mb-1" style={{ background: a(pc, 0.15) }} />
                <div className="h-2 w-3/4 rounded" style={{ background: a(pc, 0.1) }} />
              </div>
            ))}
          </div>
        </>
      )}

      {layoutId === 'property' && (
        <>
          <div className="relative h-28 flex items-end p-4" style={{ background: a(pc, 0.35) }}>
            <div>
              <div className="h-5 w-40 rounded mb-1" style={{ background: 'rgba(255,255,255,0.8)' }} />
              <div className="h-7 w-24 rounded-lg mt-2" style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.4)' }} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 p-4">
            <div className="col-span-2 rounded-xl overflow-hidden" style={{ background: cardBg }}>
              <div className="h-28" style={{ background: a(pc, 0.18) }} />
              <div className="p-3">
                <div className="h-3 w-3/4 rounded mb-1" style={{ background: a(pc, 0.2) }} />
                <div className="h-4 w-1/2 rounded mt-2" style={{ background: pc, opacity: 0.8 }} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {[0,1].map(i => (
                <div key={i} className="rounded-xl overflow-hidden flex-1" style={{ background: cardBg }}>
                  <div className="h-16" style={{ background: a(pc, 0.15) }} />
                  <div className="p-2"><div className="h-2 w-full rounded" style={{ background: a(pc, 0.15) }} /></div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {layoutId === 'market' && (
        <>
          <div className="flex gap-2 px-4 py-2 border-b" style={{ borderColor: a(pc, 0.15) }}>
            {['הכל','חדש','מבצע','פופולרי'].map((t,i) => (
              <div key={i} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: i===0?pc:a(pc,0.1), color: i===0?'white':pc, fontSize: 10 }}>{t}</div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 p-3">
            {[0,1,2,3,4,5,6,7].map(i => (
              <div key={i} className="rounded-xl overflow-hidden" style={{ background: cardBg }}>
                <div className="h-12" style={{ background: a(pc, 0.14) }} />
                <div className="p-1.5">
                  <div className="h-1.5 w-full rounded" style={{ background: a(pc, 0.2) }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const TemplateShowcase = () => {
  const [selectedLayout, setSelectedLayout] = useState<StoreLayoutId>('classic');
  const [selectedPalette, setSelectedPalette] = useState<ColorPaletteId>('bw-classic');
  const [customColor, setCustomColor] = useState('#22c55e');
  const [showPicker, setShowPicker] = useState(false);

  const currentPalette = paletteList.find(p => p.id === selectedPalette);
  const pc = selectedPalette === 'custom' ? customColor : (currentPalette?.theme.primaryColor ?? '#111');
  const bg = selectedPalette === 'custom' ? '#ffffff' : (currentPalette?.theme.backgroundColor ?? '#fff');

  return (
    <PreviewThemeRoot>
      <AuroraBg />
      <PreviewBanner title="מערכת תבניות" />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-10" dir="rtl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-10">
          <div className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">Template System</div>
          <h1 className="text-3xl md:text-4xl font-display font-bold pv-strong mb-2">4 מבנות + 10 ערכות צבע</h1>
          <p className="pv-muted text-lg">לחצו על מבנה ועל צבע — הסטורפרונט משתנה בזמן אמת</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Controls */}
          <div className="space-y-6">
            {/* Layout picker */}
            <div>
              <div className="text-xs font-semibold pv-muted uppercase tracking-wider mb-3">מבנה האתר</div>
              <div className="grid grid-cols-2 gap-3">
                {LAYOUT_ORDER.map((id, i) => {
                  const layout = storeLayouts[id];
                  const isSelected = selectedLayout === id;
                  return (
                    <motion.button
                      key={id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.06 }}
                      onClick={() => setSelectedLayout(id)}
                      className={`rounded-2xl border-2 p-3 text-right transition-all ${isSelected ? 'border-primary bg-primary/10' : 'pv-card hover:border-primary/30'}`}
                    >
                      <div className="w-full aspect-[160/112] rounded-lg overflow-hidden mb-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Wireframe id={id} pc={pc} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold pv-strong">{layout.name}</div>
                          <div className="text-xs pv-muted mt-0.5">{layout.description.split('.')[0]}</div>
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

            {/* Palette picker */}
            <div>
              <div className="text-xs font-semibold pv-muted uppercase tracking-wider mb-3">ערכת צבעים</div>
              <div className="flex flex-wrap gap-2">
                {paletteList.map(p => {
                  const isSelected = selectedPalette === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPalette(p.id); setShowPicker(false); }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                        isSelected ? 'border-primary bg-primary/15 pv-strong' : 'pv-card pv-muted hover:border-primary/30'
                      }`}
                    >
                      <span className="flex gap-0.5">
                        {p.swatch.slice(0, 2).map((hex, j) => (
                          <span key={j} className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: hex }} />
                        ))}
                      </span>
                      {p.name}
                      {isSelected && <Check className="w-3 h-3 text-primary" />}
                    </button>
                  );
                })}
                <button
                  onClick={() => { setSelectedPalette('custom'); setShowPicker(true); }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                    selectedPalette === 'custom' ? 'border-primary bg-primary/15 pv-strong' : 'pv-card pv-muted hover:border-primary/30 border-dashed'
                  }`}
                >
                  <Pipette className="w-3.5 h-3.5" />
                  צבע חופשי
                  {selectedPalette === 'custom' && <Check className="w-3 h-3 text-primary" />}
                </button>
              </div>

              {showPicker && selectedPalette === 'custom' && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center gap-3">
                  <input
                    type="color"
                    value={customColor}
                    onChange={e => setCustomColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-white/20 cursor-pointer p-0.5 bg-transparent"
                  />
                  <div>
                    <div className="text-xs font-semibold pv-strong">{customColor}</div>
                    <div className="text-xs pv-muted">צבע ראשי חופשי</div>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-white/20" style={{ backgroundColor: customColor }} />
                </motion.div>
              )}
            </div>
          </div>

          {/* Live preview */}
          <div className="lg:sticky lg:top-24">
            <div className="text-xs font-semibold pv-muted uppercase tracking-wider mb-3">תצוגה מקדימה</div>
            <motion.div
              key={`${selectedLayout}-${selectedPalette}-${customColor}`}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
            >
              <StorefrontMockup layoutId={selectedLayout} pc={pc} bg={bg} />
            </motion.div>
            <div className="mt-4 rounded-2xl pv-card p-4">
              <div className="text-xs pv-muted mb-2">הפריסה הנבחרת</div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: pc }} />
                <div>
                  <div className="text-sm font-semibold pv-strong">{storeLayouts[selectedLayout].name}</div>
                  <div className="text-xs pv-muted">{currentPalette?.name ?? 'צבע אישי'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PreviewThemeRoot>
  );
};

export default TemplateShowcase;
