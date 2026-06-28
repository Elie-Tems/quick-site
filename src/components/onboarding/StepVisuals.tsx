import { useState, useRef } from "react";
import { OnboardingData } from "@/pages/Onboarding";
import { StoreTemplateId } from "@/lib/storeTemplates";
import { Users, Home, Sparkles, Zap, ShoppingBag, Heart, Check, Upload, Loader2, Wand2, X } from "lucide-react";
import { motion } from "framer-motion";
import { StepNavigation } from "./StepNavigation";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// ─── Colour extraction helpers (copied from StepTemplate) ─────────────────────

function samplePaletteFromCanvas(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const { data } = ctx.getImageData(0, 0, w, h);
  const sat = new Map<string, number>();
  const neutral = new Map<string, number>();
  const toHex = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, "0").toUpperCase();
  const q = (n: number) => Math.round(n / 24) * 24;
  const hex = (r: number, g: number, b: number) => `#${toHex(q(r))}${toHex(q(g))}${toHex(q(b))}`;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const key = hex(r, g, b);
    if (mx - mn < 18 || (mx > 240 && mn > 240) || mx < 25) neutral.set(key, (neutral.get(key) || 0) + 1);
    else sat.set(key, (sat.get(key) || 0) + 1);
  }
  const top = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([c]) => c);
  const satTop = top(sat, 4);
  const baseTop = top(neutral, 2);
  if (satTop.length === 0 && baseTop.length === 0) throw new Error("no colors found");
  return satTop[0] || baseTop[0];
}

async function extractColorFromFile(file: File): Promise<string> {
  if (file.type === "application/pdf") {
    const pdfjs = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buffer }).promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(300 / base.width, 300 / base.height, 2);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
    return samplePaletteFromCanvas(ctx, canvas.width, canvas.height);
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("load failed"));
      i.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    const w = (canvas.width = Math.min(img.naturalWidth || 200, 240));
    const h = (canvas.height = Math.min(img.naturalHeight || 200, 240));
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    return samplePaletteFromCanvas(ctx, w, h);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// ─── Mini template previews ───────────────────────────────────────────────────

interface TemplateStyle {
  id: StoreTemplateId;
  name: string;
  description: string;
  icon: React.ReactNode;
  heroImage: string;
  heroLayout: "full-image" | "split" | "centered";
  accentColor: string;
  products: Array<{ img: string; name: string; price: string; sale?: boolean }>;
}

const templateStyles: TemplateStyle[] = [
  {
    id: "luxury-boutique", name: "בוטיק יוקרתי", description: "קלאסי, אלגנטי",
    icon: <Users className="w-4 h-4" />, heroLayout: "full-image", accentColor: "#b8860b",
    heroImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80",
    products: [
      { img: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=300&q=80", name: "שמלה", price: "₪849" },
      { img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80", name: "נעליים", price: "₪649", sale: true },
      { img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&q=80", name: "תיק", price: "₪1,299" },
    ],
  },
  {
    id: "nature-organic", name: "טבעי ואורגני", description: "ירוק, רגוע, אמין",
    icon: <Home className="w-4 h-4" />, heroLayout: "centered", accentColor: "#4a7c59",
    heroImage: "https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=600&q=80",
    products: [
      { img: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&q=80", name: "סבון", price: "₪49" },
      { img: "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=300&q=80", name: "שמן", price: "₪89", sale: true },
      { img: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300&q=80", name: "עציץ", price: "₪65" },
    ],
  },
  {
    id: "tech-minimal", name: "טכנולוגי ומינימלי", description: "כהה, מדויק, מוצר בצד",
    icon: <Zap className="w-4 h-4" />, heroLayout: "split", accentColor: "#3b82f6",
    heroImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
    products: [
      { img: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=300&q=80", name: "אוזניות", price: "₪1,299" },
      { img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80", name: "שעון", price: "₪899" },
      { img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&q=80", name: "TWS", price: "₪649" },
    ],
  },
  {
    id: "royal-purple", name: "סגול מלכותי", description: "דרמטי, יוקרתי",
    icon: <Sparkles className="w-4 h-4" />, heroLayout: "full-image", accentColor: "#a855f7",
    heroImage: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600&q=80",
    products: [
      { img: "https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=300&q=80", name: "צמיד", price: "₪3,499", sale: true },
      { img: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&q=80", name: "שרשרת", price: "₪1,899" },
      { img: "https://images.unsplash.com/photo-1600721391776-b5cd0e0048f9?w=300&q=80", name: "טבעת", price: "₪5,999" },
    ],
  },
];

const PRESET_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#F97316",
  "#EAB308", "#22C55E", "#14B8A6", "#06B6D4", "#000000",
];

const MiniProductGrid = ({ products, primaryColor }: { products: TemplateStyle["products"]; primaryColor: string }) => (
  <div className="p-1.5 grid grid-cols-3 gap-1">
    {products.map((p, i) => (
      <div key={i} className="relative overflow-hidden rounded-sm bg-[#1a1a1a]">
        <div className="aspect-square overflow-hidden">
          <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
          {p.sale && <div className="absolute top-0.5 right-0.5 px-0.5 py-px text-[4.5px] font-bold text-white rounded-sm bg-red-600">מבצע</div>}
        </div>
        <div className="p-1">
          <div className="text-[5.5px] font-medium truncate text-white mb-0.5">{p.name}</div>
          <span className="text-[6.5px] font-bold" style={{ color: primaryColor }}>{p.price}</span>
        </div>
      </div>
    ))}
  </div>
);

const MiniNav = ({ primaryColor }: { primaryColor: string }) => (
  <div className="h-6 flex items-center justify-between px-2.5 border-b border-white/08 bg-[#1a1a1a] shrink-0">
    <div className="flex items-center gap-1.5">
      <div className="w-3.5 h-3.5 rounded flex items-center justify-center" style={{ background: primaryColor }}>
        <ShoppingBag className="w-2 h-2 text-white" />
      </div>
      <span className="text-[8px] font-bold text-white">החנות שלי</span>
    </div>
    <Heart className="w-2 h-2 opacity-40 text-white" />
  </div>
);

const TemplatePreview = ({ template, primaryColor, userProducts }: {
  template: TemplateStyle; primaryColor: string; userProducts: TemplateStyle["products"];
}) => {
  const display = userProducts.length > 0 ? userProducts : template.products;
  const bg = "#0f0f0f";

  if (template.heroLayout === "split") return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: bg }}>
      <MiniNav primaryColor={primaryColor} />
      <div className="flex flex-row flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        <div className="w-[45%] flex flex-col justify-center px-2 py-2 shrink-0" style={{ background: primaryColor }}>
          <span className="text-[5.5px] uppercase tracking-widest text-white/70 mb-1">חדש</span>
          <span className="text-[9px] font-black text-white leading-tight mb-1.5">הקולקציה החדשה</span>
          <div className="px-1.5 py-0.5 text-[5.5px] font-bold text-white w-fit bg-black/25 rounded-sm">קנו עכשיו</div>
        </div>
        <div className="flex-1 relative overflow-hidden">
          <img src={template.heroImage} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
      <MiniProductGrid products={display} primaryColor={primaryColor} />
    </div>
  );

  if (template.heroLayout === "centered") return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: bg }}>
      <MiniNav primaryColor={primaryColor} />
      <div className="relative h-[60px] overflow-hidden shrink-0">
        <img src={template.heroImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
          <span className="text-[5.5px] uppercase tracking-widest mb-0.5 opacity-75" style={{ color: primaryColor }}>ברוכים הבאים</span>
          <span className="text-[10px] font-black text-white leading-tight mb-1.5">הקולקציה החדשה</span>
          <div className="px-2 py-0.5 text-[5.5px] font-bold text-white rounded-full" style={{ background: primaryColor }}>גלו עכשיו</div>
        </div>
      </div>
      <MiniProductGrid products={display} primaryColor={primaryColor} />
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: bg }}>
      <MiniNav primaryColor={primaryColor} />
      <div className="relative h-[65px] overflow-hidden shrink-0">
        <img src={template.heroImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(0,0,0,.75) 0%,rgba(0,0,0,.2) 60%,transparent 100%)" }} />
        <div className="absolute bottom-1.5 right-2 text-right">
          <span className="text-[5.5px] uppercase tracking-widest block mb-0.5 opacity-75" style={{ color: primaryColor }}>חדש</span>
          <span className="text-[9px] font-black text-white leading-tight block mb-1">הקולקציה<br />החדשה</span>
        </div>
      </div>
      <MiniProductGrid products={display} primaryColor={primaryColor} />
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const StepVisuals = ({ data, updateData, onNext, onBack }: Props) => {
  const primaryColor = data.extractedBranding?.primaryColor || "#7C3AED";
  const [hexInput, setHexInput] = useState(primaryColor);
  const [scanning, setScanning] = useState(false);
  const [generatingBanner, setGeneratingBanner] = useState(false);
  const [bannerPreview, setBannerPreview] = useState<string | null>(data.extractedBranding?.heroImageUrl || null);
  const colorFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  const userProducts = data.products.filter(p => p.imageUrl).slice(0, 3).map(p => ({
    img: p.imageUrl!, name: p.name || "מוצר", price: `₪${p.price}`,
  }));

  const setColor = (color: string) => {
    setHexInput(color);
    updateData({
      extractedBranding: {
        ...(data.extractedBranding || { brandStyle: "modern", suggestedTagline: "", businessDescription: "", colorPalette: [] }),
        primaryColor: color,
      },
    });
  };

  const handleColorFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const color = await extractColorFromFile(file);
      setColor(color);
      toast.success("זיהינו את הצבע הראשי מהקובץ");
    } catch {
      toast.error("לא הצלחנו לזהות צבע — נסו קובץ אחר");
    } finally {
      setScanning(false);
      if (colorFileRef.current) colorFileRef.current.value = "";
    }
  };

  const handleBannerFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setBannerPreview(url);
    updateData({
      extractedBranding: {
        ...(data.extractedBranding || { brandStyle: "modern", suggestedTagline: "", businessDescription: "", colorPalette: [], primaryColor }),
        heroImageUrl: url,
      },
    });
  };

  const generateBanner = async () => {
    if (!data.businessCategory) return;
    setGeneratingBanner(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("generate-hero-image", {
        body: {
          category: data.businessCategory === "other" ? data.customCategoryName : data.businessCategory,
          businessName: data.businessName || "העסק שלי",
          bannerStyle: "atmosphere",
        },
      });
      if (error || !res?.imageUrl) throw new Error("failed");
      setBannerPreview(res.imageUrl);
      updateData({
        extractedBranding: {
          ...(data.extractedBranding || { brandStyle: "modern", suggestedTagline: "", businessDescription: "", colorPalette: [], primaryColor }),
          heroImageUrl: res.imageUrl,
        },
      });
      toast.success("הבאנר נוצר!");
    } catch {
      toast.error("לא הצלחנו ליצור באנר — נסו שוב");
    } finally {
      setGeneratingBanner(false);
    }
  };

  const clearBanner = () => {
    setBannerPreview(null);
    updateData({
      extractedBranding: data.extractedBranding
        ? { ...data.extractedBranding, heroImageUrl: undefined }
        : undefined,
    });
  };

  return (
    <div className="space-y-8" dir="rtl">
      <div className="text-center">
        <h1 className="text-2xl font-medium text-foreground mb-1">מראה האתר</h1>
        <p className="text-sm text-muted-foreground">תבנית, צבע ותמונת גיבור — הכל ניתן לשינוי מאוחר יותר</p>
      </div>

      {/* ── Template grid ──────────────────────────────── */}
      <div>
        <p className="text-sm font-medium text-foreground mb-3">בחרו תבנית</p>
        <div className="grid grid-cols-2 gap-3">
          {templateStyles.map((template, i) => {
            const isSelected = data.storeTemplate === template.id;
            return (
              <motion.button
                key={template.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => updateData({ storeTemplate: template.id })}
                className={`group relative rounded-xl overflow-hidden transition-all duration-200 text-right ${
                  isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]" : "hover:ring-1 hover:ring-muted-foreground/30"
                }`}
                style={{ background: "#0f0f0f", border: isSelected ? "none" : "1px solid rgba(255,255,255,0.1)" }}
              >
                <div className="aspect-[4/3.5] relative overflow-hidden">
                  <TemplatePreview template={template} primaryColor={primaryColor} userProducts={userProducts} />
                  {isSelected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <Check className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                </div>
                <div className="p-2.5 border-t border-white/10">
                  <p className="text-xs font-semibold text-white">{template.name}</p>
                  <p className="text-[10px] text-neutral-400">{template.description}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Colour picker ──────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">צבע ראשי</p>
          <div className="w-6 h-6 rounded-full border-2 border-border" style={{ background: primaryColor }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
              style={{ background: c, borderColor: primaryColor === c ? "white" : "transparent", outline: primaryColor === c ? `2px solid ${c}` : "none", outlineOffset: "2px" }} />
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="color" value={primaryColor} onChange={e => setColor(e.target.value)}
            className="w-9 h-9 rounded-lg cursor-pointer border border-border p-0.5 bg-transparent" />
          <input type="text" value={hexInput} onChange={e => { setHexInput(e.target.value); if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) setColor(e.target.value); }}
            placeholder="#000000" dir="ltr"
            className="w-24 h-9 rounded-lg border border-border bg-background px-3 text-sm font-mono" />
          <input ref={colorFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleColorFile} />
          <button onClick={() => colorFileRef.current?.click()} disabled={scanning}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm hover:bg-muted transition-colors disabled:opacity-50">
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {scanning ? "סורק..." : "חלץ מקובץ"}
          </button>
        </div>
      </div>

      {/* ── Banner ─────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">תמונת גיבור (באנר)</p>
            <p className="text-xs text-muted-foreground">התמונה הגדולה בראש האתר — אופציונלי</p>
          </div>
          {bannerPreview && (
            <button onClick={clearBanner} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {bannerPreview ? (
          <img src={bannerPreview} alt="banner preview" className="w-full h-28 object-cover rounded-lg" />
        ) : (
          <div className="flex gap-2">
            <input ref={bannerFileRef} type="file" accept="image/*" className="hidden" onChange={handleBannerFile} />
            <button onClick={() => bannerFileRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border border-dashed border-border hover:border-primary/50 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Upload className="w-4 h-4" />
              העלו תמונה
            </button>
            <button onClick={generateBanner} disabled={generatingBanner}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border border-dashed border-primary/40 text-sm text-primary hover:bg-primary/5 transition-colors disabled:opacity-50">
              {generatingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {generatingBanner ? "יוצר..." : "צרו עם AI"}
            </button>
          </div>
        )}
      </div>

      <StepNavigation
        onNext={onNext}
        onSaveAndContinue={onNext}
        onBack={onBack}
        nextLabel="הבא"
        saveLabel="שמור והמשך"
        nextDisabled={!data.storeTemplate}
        saveDisabled={!data.storeTemplate}
        showPreview={false}
        showSave={false}
      />
    </div>
  );
};

export default StepVisuals;
