import { useState, useRef } from "react";
import { OnboardingData } from "@/pages/Onboarding";
import { StoreTemplateId, templateList } from "@/lib/storeTemplates";
import { Zap, ShoppingBag, Heart, Check, Upload, Loader2, Leaf, Gem, Waves, Sun, Shirt, Dumbbell, Baby, Cake } from "lucide-react";
import { motion } from "framer-motion";
import { StepNavigation } from "./StepNavigation";
import { toast } from "sonner";

interface StepTemplateProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface TemplateStyle {
  id: StoreTemplateId;
  name: string;
  description: string;
  icon: React.ReactNode;
  heroImage: string;
  heroLayout: 'full-image' | 'split' | 'centered';
  accentColor: string;
  products: Array<{ img: string; name: string; price: string; sale?: boolean; originalPrice?: string }>;
}

// Sample products for the live mini-preview. Each set is internally coherent
// (image matches its label); assigned to templates by visual vibe below. The
// merchant's real product images replace these in the preview the moment they
// add them (see userProducts in StepTemplate).
const SAMPLE: Record<string, TemplateStyle['products']> = {
  jewelry: [
    { img: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&q=80", name: "שרשרת זהב", price: "₪1,899" },
    { img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80", name: "שעון יוקרה", price: "₪3,499" },
    { img: "https://images.unsplash.com/photo-1600721391776-b5cd0e0048f9?w=300&q=80", name: "טבעת", price: "₪5,999" },
  ],
  fashion: [
    { img: "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=300&q=80", name: "סניקרס", price: "₪699" },
    { img: "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=300&q=80", name: "הודי", price: "₪349", sale: true, originalPrice: "₪449" },
    { img: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=300&q=80", name: "תיק גב", price: "₪289" },
  ],
  natural: [
    { img: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&q=80", name: "סבון טבעי", price: "₪49" },
    { img: "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=300&q=80", name: "שמן ארומתי", price: "₪89", sale: true, originalPrice: "₪129" },
    { img: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300&q=80", name: "עציץ", price: "₪65" },
  ],
  tech: [
    { img: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=300&q=80", name: "אוזניות", price: "₪1,299" },
    { img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80", name: "שעון חכם", price: "₪899" },
    { img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&q=80", name: "אוזניות TWS", price: "₪649" },
  ],
  home: [
    { img: "https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=300&q=80", name: "כרית", price: "₪179" },
    { img: "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=300&q=80", name: "נר ריחני", price: "₪89", sale: true, originalPrice: "₪129" },
    { img: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=300&q=80", name: "ספל קרמיקה", price: "₪65" },
  ],
};

// Per-template preview extras (icon + which sample set). Everything else -
// heroLayout, hero image, name, description - comes from the SHARED
// storeTemplates source, so the onboarding always shows EVERY template and
// stays in sync with the dashboard (single source of truth). Adding a template
// to storeTemplates.ts is now enough; it shows up here automatically.
const PREVIEW_EXTRAS: Record<StoreTemplateId, { icon: React.ReactNode; sample: string }> = {
  "luxury-boutique": { icon: <Gem className="w-4 h-4" />, sample: "jewelry" },
  "bold-playful": { icon: <Zap className="w-4 h-4" />, sample: "fashion" },
  "natural-organic": { icon: <Leaf className="w-4 h-4" />, sample: "natural" },
  "tech-minimal": { icon: <Zap className="w-4 h-4" />, sample: "tech" },
  "vintage-warm": { icon: <Heart className="w-4 h-4" />, sample: "home" },
  "ocean-breeze": { icon: <Waves className="w-4 h-4" />, sample: "natural" },
  "warm-sunset": { icon: <Sun className="w-4 h-4" />, sample: "home" },
  "urban-chic": { icon: <Shirt className="w-4 h-4" />, sample: "fashion" },
  "fresh-mint": { icon: <Dumbbell className="w-4 h-4" />, sample: "fashion" },
  "royal-purple": { icon: <Gem className="w-4 h-4" />, sample: "jewelry" },
  "editorial-mono": { icon: <Shirt className="w-4 h-4" />, sample: "fashion" },
  "bakery-warm": { icon: <Cake className="w-4 h-4" />, sample: "home" },
  "kids-pop": { icon: <Baby className="w-4 h-4" />, sample: "fashion" },
  "spa-soft": { icon: <Heart className="w-4 h-4" />, sample: "natural" },
  "fitness-bold": { icon: <Dumbbell className="w-4 h-4" />, sample: "fashion" },
};

const templateStyles: TemplateStyle[] = templateList.map((t) => {
  const extra = PREVIEW_EXTRAS[t.id];
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    icon: extra?.icon ?? <ShoppingBag className="w-4 h-4" />,
    heroLayout: t.heroStyle.layout,
    accentColor: t.theme.primaryColor,
    heroImage: t.previewImage.includes("?") ? t.previewImage : `${t.previewImage}?w=600&q=80`,
    products: SAMPLE[extra?.sample ?? "fashion"],
  };
});

const PRESET_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#EF4444", "#F97316",
  "#EAB308", "#22C55E", "#14B8A6", "#06B6D4", "#6366F1",
  "#0EA5E9", "#84CC16", "#DC2626", "#7C3AED", "#000000",
];

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
    if (mx - mn < 18 || (mx > 240 && mn > 240) || mx < 25) {
      neutral.set(key, (neutral.get(key) || 0) + 1);
    } else {
      sat.set(key, (sat.get(key) || 0) + 1);
    }
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

const MiniNavbar = ({ primaryColor, bg, card, text }: { primaryColor: string; bg: string; card: string; text: string }) => (
  <div className="h-6 flex items-center justify-between px-2.5 border-b shrink-0" style={{ background: card, borderColor: "rgba(255,255,255,0.08)" }}>
    <div className="flex items-center gap-1.5">
      <div className="w-3.5 h-3.5 rounded flex items-center justify-center" style={{ background: primaryColor }}>
        <ShoppingBag className="w-2 h-2 text-white" />
      </div>
      <span className="text-[8px] font-bold" style={{ color: text }}>החנות שלי</span>
    </div>
    <div className="flex items-center gap-1.5">
      <Heart className="w-2 h-2 opacity-40" style={{ color: text }} />
      <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: primaryColor }}>
        <ShoppingBag className="w-2 h-2 text-white" />
      </div>
    </div>
  </div>
);

const MiniProductGrid = ({ products, primaryColor, bg, card, text, muted }: {
  products: TemplateStyle['products']; primaryColor: string; bg: string; card: string; text: string; muted: string;
}) => (
  <div className="p-1.5 grid grid-cols-3 gap-1">
    {products.map((product, i) => (
      <div key={i} className="relative overflow-hidden rounded-sm" style={{ background: card, border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="aspect-square overflow-hidden relative">
          <img src={product.img} alt={product.name} className="w-full h-full object-cover" />
          {product.sale && (
            <div className="absolute top-0.5 right-0.5 px-0.5 py-px text-[4.5px] font-bold text-white rounded-sm" style={{ background: "#dc2626" }}>מבצע</div>
          )}
        </div>
        <div className="p-1">
          <div className="text-[5.5px] font-medium truncate mb-0.5" style={{ color: text }}>{product.name}</div>
          <span className="text-[6.5px] font-bold" style={{ color: primaryColor }}>{product.price}</span>
        </div>
      </div>
    ))}
  </div>
);

const TemplatePreview = ({ template, primaryColor, userProducts }: { template: TemplateStyle; primaryColor: string; userProducts?: TemplateStyle['products'] }) => {
  const accent = primaryColor;
  const displayProducts = (userProducts && userProducts.length > 0) ? userProducts : template.products;
  const bg = "#0f0f0f";
  const card = "#1a1a1a";
  const text = "#ffffff";
  const muted = "#6b6b6b";

  if (template.heroLayout === "split") {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: bg }}>
        <MiniNavbar primaryColor={accent} bg={bg} card={card} text={text} />
        <div className="flex flex-row flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {/* Text panel */}
          <div className="w-[45%] flex flex-col justify-center px-2 py-2 shrink-0" style={{ background: accent }}>
            <span className="text-[5.5px] uppercase tracking-widest text-white/70 mb-1">חדש</span>
            <span className="text-[9px] font-black text-white leading-tight mb-1.5">הקולקציה החדשה כאן</span>
            <div className="px-1.5 py-0.5 text-[5.5px] font-bold text-white w-fit" style={{ background: "rgba(0,0,0,0.25)", borderRadius: 2 }}>קנו עכשיו</div>
          </div>
          {/* Image panel */}
          <div className="flex-1 relative overflow-hidden">
            <img src={template.heroImage} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
        <MiniProductGrid products={displayProducts} primaryColor={accent} bg={bg} card={card} text={text} muted={muted} />
      </div>
    );
  }

  if (template.heroLayout === "centered") {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: bg }}>
        <MiniNavbar primaryColor={accent} bg={bg} card={card} text={text} />
        <div className="relative h-[60px] overflow-hidden shrink-0">
          <img src={template.heroImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
            <span className="text-[5.5px] uppercase tracking-widest mb-0.5 opacity-75" style={{ color: accent }}>ברוכים הבאים</span>
            <span className="text-[10px] font-black text-white leading-tight mb-1.5">הקולקציה החדשה</span>
            <div className="px-2 py-0.5 text-[5.5px] font-bold text-white rounded-full" style={{ background: accent }}>גלו עכשיו</div>
          </div>
        </div>
        <MiniProductGrid products={displayProducts} primaryColor={accent} bg={bg} card={card} text={text} muted={muted} />
      </div>
    );
  }

  // full-image — editorial, text at bottom-left
  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: bg }}>
      <MiniNavbar primaryColor={accent} bg={bg} card={card} text={text} />
      <div className="relative h-[65px] overflow-hidden shrink-0">
        <img src={template.heroImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)" }} />
        <div className="absolute bottom-1.5 right-2 text-right">
          <span className="text-[5.5px] uppercase tracking-widest block mb-0.5 opacity-75" style={{ color: accent }}>חדש</span>
          <span className="text-[9px] font-black text-white leading-tight block mb-1">הקולקציה<br />החדשה</span>
          <div className="px-1.5 py-0.5 text-[5px] font-bold text-white border border-white/50 w-fit">גלו עכשיו</div>
        </div>
      </div>
      <MiniProductGrid products={displayProducts} primaryColor={accent} bg={bg} card={card} text={text} muted={muted} />
    </div>
  );
};

const StepTemplate = ({ data, updateData, onNext, onBack }: StepTemplateProps) => {
  const selectedTemplate = data.storeTemplate;
  const primaryColor = data.extractedBranding?.primaryColor || "#7C3AED";

  const userProducts: TemplateStyle['products'] = data.products
    .filter(p => p.imageUrl)
    .slice(0, 3)
    .map(p => ({
      img: p.imageUrl!,
      name: p.name || "מוצר",
      price: `₪${p.price}`,
    }));
  const [hexInput, setHexInput] = useState(primaryColor);
  const [scanning, setScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setColor = (color: string) => {
    setHexInput(color);
    updateData({
      extractedBranding: {
        ...(data.extractedBranding || { brandStyle: "modern", suggestedTagline: "", businessDescription: "", colorPalette: [] }),
        primaryColor: color,
      },
    });
  };

  const handleHexInput = (val: string) => {
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) setColor(val);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <span className="inline-block text-sm font-semibold text-primary mb-3 px-3 py-1 rounded-full bg-primary/10">שלב 2</span>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">סגנון וצבע החנות</h1>
        <p className="text-muted-foreground">בחרו תבנית ושחקו עם הצבעים — הכל מתעדכן בזמן אמת</p>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {templateStyles.map((template, index) => {
          const isSelected = selectedTemplate === template.id;
          return (
            <motion.button
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => updateData({ storeTemplate: template.id })}
              className={`group relative rounded-xl overflow-hidden transition-all duration-300 text-right ${
                isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]" : "hover:ring-1 hover:ring-muted-foreground/30"
              }`}
              style={{ background: "#0f0f0f", border: isSelected ? "none" : "1px solid rgba(255,255,255,0.1)" }}
            >
              <div className="aspect-[4/3.5] relative overflow-hidden">
                <TemplatePreview template={template} primaryColor={primaryColor} userProducts={userProducts} />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                {isSelected && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Check className="w-4 h-4 text-white" />
                  </motion.div>
                )}
              </div>
              <div className="p-3 border-t border-white/10">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-white/70">{template.icon}</div>
                  <h3 className="font-bold text-sm text-white">{template.name}</h3>
                </div>
                <p className="text-xs text-neutral-400">{template.description}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Color section — always visible */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">צבע ראשי של החנות</p>
          <div className="w-7 h-7 rounded-full border-2 border-border shadow-sm" style={{ background: primaryColor }} />
        </div>

        {/* Preset swatches */}
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setColor(color)}
              className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                background: color,
                borderColor: primaryColor === color ? "white" : "transparent",
                outline: primaryColor === color ? `2px solid ${color}` : "none",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>

        {/* Custom input row */}
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer border border-border p-0.5 bg-transparent"
          />
          <input
            type="text"
            value={hexInput}
            onChange={(e) => handleHexInput(e.target.value)}
            placeholder="#000000"
            dir="ltr"
            className="w-28 h-10 rounded-lg border border-border bg-background px-3 text-sm font-mono"
          />
          <span className="text-sm text-muted-foreground">או</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={scanning}
            className="flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {scanning ? "סורק..." : "העלה לוגו / חומר פרסומי"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">תומך בתמונות ו-PDF — נסרוק ונציע את הצבע הראשי שלך</p>
      </div>

      <StepNavigation
        onNext={onNext}
        onSaveAndContinue={onNext}
        onBack={onBack}
        nextLabel="הבא"
        saveLabel="שמור והמשך"
        nextDisabled={false}
        saveDisabled={!selectedTemplate}
        showPreview={true}
        showSave={true}
        reassurance="לא מתחייבים - את התבנית, הצבעים והעיצוב אפשר להחליף ולכוונן בכל רגע מלוח הניהול."
      />
    </div>
  );
};

export default StepTemplate;
