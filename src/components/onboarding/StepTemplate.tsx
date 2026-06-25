import { useState, useRef } from "react";
import { OnboardingData } from "@/pages/Onboarding";
import { StoreTemplateId } from "@/lib/storeTemplates";
import { Users, Home, Sparkles, Zap, ShoppingBag, Heart, Check, Upload, Loader2 } from "lucide-react";
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
  products: Array<{ img: string; name: string; price: string; sale?: boolean; originalPrice?: string }>;
}

const templateStyles: TemplateStyle[] = [
  {
    id: "urban-chic",
    name: "אורבני עם דמויות",
    description: "אנרגטי, סגנון חיים, דינמי",
    icon: <Users className="w-4 h-4" />,
    heroImage: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&q=80",
    products: [
      { img: "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=300&q=80", name: "נעלי סניקרס", price: "₪699" },
      { img: "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=300&q=80", name: "הודי אורבני", price: "₪349", sale: true, originalPrice: "₪449" },
      { img: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=300&q=80", name: "תיק גב", price: "₪289" },
    ],
  },
  {
    id: "warm-sunset",
    name: "אווירה חמה וביתית",
    description: "כפרי, נעים, מזמין",
    icon: <Home className="w-4 h-4" />,
    heroImage: "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=600&q=80",
    products: [
      { img: "https://images.unsplash.com/photo-1602028915047-37269d1a73f7?w=300&q=80", name: "כרית דקורטיבית", price: "₪179" },
      { img: "https://images.unsplash.com/photo-1603006905003-be475563bc59?w=300&q=80", name: "נר ריחני", price: "₪89", sale: true, originalPrice: "₪129" },
      { img: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=300&q=80", name: "ספל קרמיקה", price: "₪65" },
    ],
  },
  {
    id: "minimal",
    name: "מינימליסטי נקי",
    description: "יוקרתי, מדויק, סטודיו",
    icon: <Sparkles className="w-4 h-4" />,
    heroImage: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80",
    products: [
      { img: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=300&q=80", name: "אוזניות אלחוטיות", price: "₪1,299" },
      { img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80", name: "שעון חכם", price: "₪899" },
      { img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&q=80", name: "אוזניות פרימיום", price: "₪649" },
    ],
  },
  {
    id: "bold-modern",
    name: "מודרני נועז",
    description: "קונטרסט חד, גרפי, אימפקט",
    icon: <Zap className="w-4 h-4" />,
    heroImage: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80",
    products: [
      { img: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=300&q=80", name: "כיסא מעצבים", price: "₪2,499" },
      { img: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300&q=80", name: "מנורת שולחן", price: "₪449", sale: true, originalPrice: "₪599" },
      { img: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&q=80", name: "אגרטל גיאומטרי", price: "₪189" },
    ],
  },
  {
    id: "elegant-dark",
    name: "יוקרה ואלגנטיות",
    description: "פרימיום, מוזהב, תכשיטים",
    icon: <Sparkles className="w-4 h-4" />,
    heroImage: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=600&q=80",
    products: [
      { img: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&q=80", name: "שרשרת זהב", price: "₪1,899" },
      { img: "https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=300&q=80", name: "צמיד יהלומים", price: "₪3,499", sale: true, originalPrice: "₪4,299" },
      { img: "https://images.unsplash.com/photo-1600721391776-b5cd0e0048f9?w=300&q=80", name: "טבעת אירוסין", price: "₪5,999" },
    ],
  },
  {
    id: "natural",
    name: "טבעי ואורגני",
    description: "אקולוגי, ירוק, בריאות",
    icon: <Home className="w-4 h-4" />,
    heroImage: "https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=600&q=80",
    products: [
      { img: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=300&q=80", name: "סבון טבעי", price: "₪49" },
      { img: "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=300&q=80", name: "שמן ארומתי", price: "₪89", sale: true, originalPrice: "₪129" },
      { img: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300&q=80", name: "עציץ סוקולנט", price: "₪65" },
    ],
  },
];

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

const TemplatePreview = ({ template, primaryColor }: { template: TemplateStyle; primaryColor: string }) => {
  const bg = "#0f0f0f";
  const card = "#1a1a1a";
  const text = "#ffffff";
  const muted = "#6b6b6b";
  return (
    <div className="w-full h-full overflow-hidden" style={{ background: bg }}>
      <div className="h-7 flex items-center justify-between px-2.5 border-b" style={{ background: card, borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-md flex items-center justify-center" style={{ background: primaryColor }}>
            <ShoppingBag className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="text-[9px] font-bold" style={{ color: text }}>החנות שלי</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Heart className="w-2.5 h-2.5" style={{ color: muted }} />
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px]" style={{ background: primaryColor }}>
            <ShoppingBag className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
      </div>
      <div className="relative h-[65px] overflow-hidden">
        <img src={template.heroImage} alt={template.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${bg}ee, ${bg}40)` }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
          <span className="text-[7px] uppercase tracking-wider mb-0.5 opacity-80" style={{ color: primaryColor }}>קולקציה חדשה</span>
          <span className="text-[11px] font-bold" style={{ color: text }}>הנחות עד 50%</span>
          <div className="mt-1 px-2 py-0.5 text-[6px] font-medium rounded-sm text-white" style={{ background: primaryColor }}>קנו עכשיו</div>
        </div>
      </div>
      <div className="p-1.5 grid grid-cols-3 gap-1">
        {template.products.map((product, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.08 }}
            className="relative overflow-hidden rounded-sm" style={{ background: card, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="aspect-square overflow-hidden relative">
              <img src={product.img} alt={product.name} className="w-full h-full object-cover" />
              {product.sale && (
                <div className="absolute top-0.5 right-0.5 px-1 py-0.5 text-[5px] font-bold text-white rounded-sm" style={{ background: "#dc2626" }}>מבצע</div>
              )}
            </div>
            <div className="p-1">
              <div className="text-[6px] font-medium truncate mb-0.5" style={{ color: text }}>{product.name}</div>
              <div className="flex items-center gap-0.5">
                <span className="text-[7px] font-bold" style={{ color: primaryColor }}>{product.price}</span>
                {product.originalPrice && <span className="text-[5px] line-through" style={{ color: muted }}>{product.originalPrice}</span>}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const StepTemplate = ({ data, updateData, onNext, onBack }: StepTemplateProps) => {
  const selectedTemplate = data.storeTemplate;
  const primaryColor = data.extractedBranding?.primaryColor || "#7C3AED";
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
                <TemplatePreview template={template} primaryColor={primaryColor} />
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
      />
    </div>
  );
};

export default StepTemplate;
