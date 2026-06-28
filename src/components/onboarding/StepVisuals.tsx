import { useState, useRef } from "react";
import { OnboardingData } from "@/pages/Onboarding";
import { StoreTemplateId } from "@/lib/storeTemplates";
import { ShoppingBag, Heart, Check, Upload, Loader2, Wand2, X, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

// ─── Colour extraction helpers ────────────────────────────────────────────────

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

// ─── Template data ────────────────────────────────────────────────────────────

interface TemplateStyle {
  id: StoreTemplateId;
  name: string;
  description: string;
  heroImage: string;
  heroLayout: "full-image" | "split" | "centered";
  products: Array<{ img: string; name: string; price: string; sale?: boolean }>;
  audience: "general" | "religious-friendly";
}

const templateStyles: TemplateStyle[] = [
  {
    id: "luxury-boutique", name: "בוטיק יוקרתי", description: "קלאסי, אלגנטי",
    audience: "general", heroLayout: "full-image",
    heroImage: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80",
    products: [
      { img: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&q=80", name: "שמלה", price: "₪849" },
      { img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80", name: "נעליים", price: "₪649", sale: true },
      { img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80", name: "תיק", price: "₪1,299" },
    ],
  },
  {
    id: "nature-organic", name: "טבעי ואורגני", description: "ירוק, רגוע, אמין",
    audience: "religious-friendly", heroLayout: "centered",
    heroImage: "https://images.unsplash.com/photo-1466781783364-36c955e42a7f?w=800&q=80",
    products: [
      { img: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80", name: "סבון", price: "₪49" },
      { img: "https://images.unsplash.com/photo-1607006344380-b6775a0824a7?w=400&q=80", name: "שמן", price: "₪89", sale: true },
      { img: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&q=80", name: "עציץ", price: "₪65" },
    ],
  },
  {
    id: "tech-minimal", name: "טכנולוגי ומינימלי", description: "כהה, מדויק, מוצר בצד",
    audience: "religious-friendly", heroLayout: "split",
    heroImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
    products: [
      { img: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&q=80", name: "אוזניות", price: "₪1,299" },
      { img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80", name: "שעון", price: "₪899" },
      { img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&q=80", name: "TWS", price: "₪649" },
    ],
  },
  {
    id: "royal-purple", name: "סגול מלכותי", description: "דרמטי, יוקרתי",
    audience: "general", heroLayout: "full-image",
    heroImage: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&q=80",
    products: [
      { img: "https://images.unsplash.com/photo-1608042314453-ae338d80c427?w=400&q=80", name: "צמיד", price: "₪3,499", sale: true },
      { img: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80", name: "שרשרת", price: "₪1,899" },
      { img: "https://images.unsplash.com/photo-1600721391776-b5cd0e0048f9?w=400&q=80", name: "טבעת", price: "₪5,999" },
    ],
  },
];

const PRESET_COLORS = [
  "#000000", "#06B6D4", "#14B8A6", "#22C55E",
  "#EAB308", "#F97316", "#EF4444", "#EC4899", "#8B5CF6", "#3B82F6",
];

// ─── Mini thumbnail preview (for selector row) ────────────────────────────────

const MiniProductGrid = ({ products, primaryColor }: { products: TemplateStyle["products"]; primaryColor: string }) => (
  <div className="p-1 grid grid-cols-3 gap-0.5">
    {products.map((p, i) => (
      <div key={i} className="relative overflow-hidden rounded-sm bg-[#1a1a1a]">
        <div className="aspect-square overflow-hidden">
          <img src={p.img} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="px-0.5 py-0.5">
          <div className="text-[4.5px] font-medium truncate text-white/80">{p.name}</div>
          <span className="text-[5.5px] font-bold" style={{ color: primaryColor }}>{p.price}</span>
        </div>
      </div>
    ))}
  </div>
);

const MiniTemplatePreview = ({ template, primaryColor, userProducts }: {
  template: TemplateStyle; primaryColor: string; userProducts: TemplateStyle["products"];
}) => {
  const display = userProducts.length > 0 ? userProducts : template.products;
  const bg = "#0f0f0f";

  if (template.heroLayout === "split") return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: bg }}>
      <div className="h-4 flex items-center px-1.5 border-b border-white/10 bg-[#1a1a1a] shrink-0">
        <div className="w-2 h-2 rounded flex items-center justify-center mr-1" style={{ background: primaryColor }}>
          <ShoppingBag className="w-1 h-1 text-white" />
        </div>
        <span className="text-[5px] font-bold text-white">החנות</span>
      </div>
      <div className="flex flex-row overflow-hidden" style={{ height: '45px' }}>
        <div className="w-[45%] flex flex-col justify-center px-1.5 shrink-0" style={{ background: primaryColor }}>
          <span className="text-[5px] font-black text-white leading-tight">הקולקציה<br/>החדשה</span>
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
      <div className="h-4 flex items-center px-1.5 border-b border-white/10 bg-[#1a1a1a] shrink-0">
        <div className="w-2 h-2 rounded flex items-center justify-center mr-1" style={{ background: primaryColor }}>
          <ShoppingBag className="w-1 h-1 text-white" />
        </div>
        <span className="text-[5px] font-bold text-white">החנות</span>
      </div>
      <div className="relative overflow-hidden shrink-0" style={{ height: '40px' }}>
        <img src={template.heroImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
          <span className="text-[6px] font-black text-white">הקולקציה החדשה</span>
        </div>
      </div>
      <MiniProductGrid products={display} primaryColor={primaryColor} />
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: bg }}>
      <div className="h-4 flex items-center px-1.5 border-b border-white/10 bg-[#1a1a1a] shrink-0">
        <div className="w-2 h-2 rounded flex items-center justify-center mr-1" style={{ background: primaryColor }}>
          <ShoppingBag className="w-1 h-1 text-white" />
        </div>
        <span className="text-[5px] font-bold text-white">החנות</span>
      </div>
      <div className="relative overflow-hidden shrink-0" style={{ height: '45px' }}>
        <img src={template.heroImage} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(0,0,0,.8) 0%,transparent 100%)" }} />
        <div className="absolute bottom-1 right-1.5">
          <span className="text-[5px] font-black text-white leading-tight block">הקולקציה החדשה</span>
        </div>
      </div>
      <MiniProductGrid products={display} primaryColor={primaryColor} />
    </div>
  );
};

// ─── Big live preview ─────────────────────────────────────────────────────────

const BigProductGrid = ({ products, primaryColor }: { products: TemplateStyle["products"]; primaryColor: string }) => (
  <div className="p-3 grid grid-cols-3 gap-2">
    {products.map((p, i) => (
      <div key={i} className="relative overflow-hidden rounded-lg bg-[#1a1a1a]">
        <div className="aspect-square overflow-hidden">
          <img src={p.img} alt="" className="w-full h-full object-cover" />
          {p.sale && (
            <div className="absolute top-1 right-1 px-1 py-0.5 text-[9px] font-bold text-white rounded bg-red-600">מבצע</div>
          )}
        </div>
        <div className="p-1.5">
          <div className="text-xs font-medium truncate text-white mb-0.5">{p.name}</div>
          <span className="text-sm font-bold" style={{ color: primaryColor }}>{p.price}</span>
        </div>
      </div>
    ))}
  </div>
);

const BigTemplatePreview = ({ template, primaryColor, userProducts, bannerImage, businessName }: {
  template: TemplateStyle;
  primaryColor: string;
  userProducts: TemplateStyle["products"];
  bannerImage: string | null;
  businessName: string;
}) => {
  const display = userProducts.length > 0 ? userProducts : template.products;
  const hero = bannerImage || template.heroImage;
  const bg = "#0f0f0f";
  const name = businessName || "החנות שלי";

  const Nav = () => (
    <div className="h-11 flex items-center justify-between px-4 border-b border-white/10 bg-[#1a1a1a] shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: primaryColor }}>
          <ShoppingBag className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-bold text-white">{name}</span>
      </div>
      <Heart className="w-4 h-4 opacity-40 text-white" />
    </div>
  );

  if (template.heroLayout === "split") return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: bg }}>
      <Nav />
      <div className="flex flex-row overflow-hidden" style={{ height: '150px' }}>
        <div className="w-[42%] flex flex-col justify-center px-4 py-3 shrink-0" style={{ background: primaryColor }}>
          <span className="text-[10px] uppercase tracking-widest text-white/70 mb-1">חדש</span>
          <span className="text-xl font-black text-white leading-tight mb-2">הקולקציה<br/>החדשה</span>
          <div className="px-2.5 py-1 text-xs font-bold text-white w-fit bg-black/25 rounded">קנו עכשיו</div>
        </div>
        <div className="flex-1 relative overflow-hidden">
          <img src={hero} alt="" className="w-full h-full object-cover" />
        </div>
      </div>
      <BigProductGrid products={display} primaryColor={primaryColor} />
    </div>
  );

  if (template.heroLayout === "centered") return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: bg }}>
      <Nav />
      <div className="relative overflow-hidden shrink-0" style={{ height: '130px' }}>
        <img src={hero} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <span className="text-[11px] uppercase tracking-widest mb-1 opacity-75" style={{ color: primaryColor }}>ברוכים הבאים</span>
          <span className="text-xl font-black text-white leading-tight mb-2">הקולקציה החדשה</span>
          <div className="px-3 py-1 text-xs font-bold text-white rounded-full" style={{ background: primaryColor }}>גלו עכשיו</div>
        </div>
      </div>
      <BigProductGrid products={display} primaryColor={primaryColor} />
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: bg }}>
      <Nav />
      <div className="relative overflow-hidden shrink-0" style={{ height: '140px' }}>
        <img src={hero} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(0,0,0,.8) 0%,rgba(0,0,0,.2) 60%,transparent 100%)" }} />
        <div className="absolute bottom-3 right-4 text-right">
          <span className="text-[11px] uppercase tracking-widest block mb-0.5 opacity-75" style={{ color: primaryColor }}>חדש</span>
          <span className="text-2xl font-black text-white leading-tight block">הקולקציה<br/>החדשה</span>
        </div>
      </div>
      <BigProductGrid products={display} primaryColor={primaryColor} />
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

  const selectedTemplate = templateStyles.find(t => t.id === data.storeTemplate) || templateStyles[0];

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
    <div className="space-y-6 pb-20" dir="rtl">
      <div className="text-center">
        <h1 className="text-2xl font-medium text-foreground mb-1">מראה האתר</h1>
        <p className="text-sm text-muted-foreground">לחצו על תבנית או צבע — הפריוויו מתעדכן מיד</p>
      </div>

      {/* Template selector — small thumbnails row */}
      <div>
        <p className="text-sm font-medium text-foreground mb-2">בחרו תבנית</p>
        <div className="grid grid-cols-4 gap-2">
          {templateStyles.map((template) => {
            const isSelected = data.storeTemplate === template.id;
            return (
              <button
                key={template.id}
                onClick={() => updateData({ storeTemplate: template.id, isReligiousAudience: template.audience === "religious-friendly" })}
                className={`relative rounded-lg overflow-hidden transition-all duration-150 text-right ${
                  isSelected
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : "hover:ring-1 hover:ring-muted-foreground/30"
                }`}
                style={{ background: "#0f0f0f", border: isSelected ? "none" : "1px solid rgba(255,255,255,0.1)" }}
              >
                <div className="aspect-[4/3.5] relative overflow-hidden">
                  <MiniTemplatePreview template={template} primaryColor={primaryColor} userProducts={userProducts} />
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="px-1.5 py-1 border-t border-white/10">
                  <p className="text-[10px] font-medium text-white truncate">{template.name}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Big live preview */}
      <div className="rounded-xl overflow-hidden border border-white/10 shadow-xl" style={{ background: "#0f0f0f" }}>
        {/* Browser chrome bar */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10 bg-[#1a1a1a]">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          <span className="text-[10px] text-white/30 mr-2 font-mono">תצוגה מקדימה — האתר שלך</span>
        </div>
        <div style={{ minHeight: '380px' }}>
          <BigTemplatePreview
            template={selectedTemplate}
            primaryColor={primaryColor}
            userProducts={userProducts}
            bannerImage={bannerPreview}
            businessName={data.businessName}
          />
        </div>
      </div>

      {/* Colour picker */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">צבע ראשי</p>
          <div className="w-6 h-6 rounded-full border-2 border-border transition-colors" style={{ background: primaryColor }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                background: c,
                borderColor: primaryColor === c ? "white" : "transparent",
                outline: primaryColor === c ? `2px solid ${c}` : "none",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="color"
            value={primaryColor}
            onChange={e => setColor(e.target.value)}
            className="w-9 h-9 rounded-lg cursor-pointer border border-border p-0.5 bg-transparent"
          />
          <input
            type="text"
            value={hexInput}
            onChange={e => {
              setHexInput(e.target.value);
              if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) setColor(e.target.value);
            }}
            placeholder="#000000"
            dir="ltr"
            className="w-24 h-9 rounded-lg border border-border bg-background px-3 text-sm font-mono"
          />
          <input ref={colorFileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleColorFile} />
          <button
            onClick={() => colorFileRef.current?.click()}
            disabled={scanning}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm hover:bg-muted transition-colors disabled:opacity-50"
          >
            {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {scanning ? "סורק..." : "חלץ מקובץ"}
          </button>
        </div>
      </div>

      {/* Banner */}
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
            <button
              onClick={() => bannerFileRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border border-dashed border-border hover:border-primary/50 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Upload className="w-4 h-4" />
              העלו תמונה
            </button>
            <button
              onClick={generateBanner}
              disabled={generatingBanner}
              className="flex-1 flex items-center justify-center gap-2 h-11 rounded-lg border border-dashed border-primary/40 text-sm text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              {generatingBanner ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {generatingBanner ? "יוצר..." : "צרו עם AI"}
            </button>
          </div>
        )}
      </div>

      {/* Sticky navigation */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border py-3 flex items-center justify-between gap-3 -mx-4 px-4 mt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 h-11 rounded-xl border border-border text-sm hover:bg-muted transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          חזרה
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          המשך
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default StepVisuals;
