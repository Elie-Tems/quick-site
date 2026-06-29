import { useState, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { OnboardingData, ProductCategory } from "@/pages/Onboarding";
import {
  Plus, Trash2, Package, FileSpreadsheet, Upload, X, Download,
  AlertCircle, Sparkles, Loader2, LayoutGrid, List, FolderOpen,
  Mic, MicOff, Pencil, ImagePlus, Wand2,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import ProductCategoryManager from "./ProductCategoryManager";
import { StepNavigation } from "./StepNavigation";

interface StepProductsProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface ExcelProduct {
  name: string;
  description?: string;
  price: number;
  sku?: string;
  imageUrl?: string;
  categoryName?: string;
}

interface ParsedProduct {
  name: string;
  price: number;
  description?: string;
  image?: string; // absolute URL scraped from the catalog page, when available
}

type Method = "quick" | "catalog" | "voice";

const StepProducts = ({ data, updateData, onNext, onBack }: StepProductsProps) => {
  const [activeMethod, setActiveMethod] = useState<Method>("quick");

  // Quick add
  const [quickName, setQuickName] = useState("");
  const [quickPrice, setQuickPrice] = useState("");
  const [quickDesc, setQuickDesc] = useState("");
  const [quickImageUrl, setQuickImageUrl] = useState<string | null>(null);
  const [generatingQuickImage, setGeneratingQuickImage] = useState(false);
  const quickImageRef = useRef<HTMLInputElement>(null);

  // Excel
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedProducts, setParsedProducts] = useState<ExcelProduct[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [defaultCategoryForExcel, setDefaultCategoryForExcel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [micHelp, setMicHelp] = useState<null | "blocked" | "denied" | "unsupported">(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceParsed, setVoiceParsed] = useState<ParsedProduct[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // AI images
  const [generatingProductId, setGeneratingProductId] = useState<string | null>(null);
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState({ current: 0, total: 0 });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");

  // Image lightbox
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Categories
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const productsCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    data.products.forEach(p => {
      const catId = p.categoryId || "uncategorized";
      counts[catId] = (counts[catId] || 0) + 1;
    });
    return counts;
  }, [data.products]);

  const filteredProducts = useMemo(() => {
    if (data.productOrganization === "free" || !selectedCategoryId) return data.products;
    return data.products.filter(p => p.categoryId === selectedCategoryId);
  }, [data.products, selectedCategoryId, data.productOrganization]);

  // ── Quick add ──────────────────────────────────────────────────────────────

  const handleQuickAdd = () => {
    if (!quickName.trim() || !quickPrice.trim()) return;
    const categoryId = data.productOrganization === "categories" ? selectedCategoryId || undefined : undefined;
    updateData({
      products: [...data.products, {
        id: Date.now().toString(),
        name: quickName.trim(),
        description: quickDesc.trim(),
        price: parseFloat(quickPrice),
        imageUrl: quickImageUrl || undefined,
        categoryId,
      }],
    });
    setQuickName("");
    setQuickPrice("");
    setQuickDesc("");
    setQuickImageUrl(null);
  };

  const compressImage = (file: File, maxBytes = 4 * 1024 * 1024): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = ev => {
        img.onload = () => {
          // Cap long edge at 1800px to avoid huge canvases while keeping quality
          const MAX_PX = 1800;
          let { width, height } = img;
          if (width > MAX_PX || height > MAX_PX) {
            const ratio = Math.min(MAX_PX / width, MAX_PX / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
          // Try quality 0.92 first, then step down until under maxBytes
          let quality = 0.92;
          let dataUrl = canvas.toDataURL("image/jpeg", quality);
          while (dataUrl.length * 0.75 > maxBytes && quality > 0.5) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          }
          resolve(dataUrl);
        };
        img.onerror = reject;
        img.src = ev.target!.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleQuickImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (quickImageRef.current) quickImageRef.current.value = "";
    if (file.size > 5 * 1024 * 1024) {
      toast.info("מכווץ תמונה...");
      try {
        const compressed = await compressImage(file);
        setQuickImageUrl(compressed);
      } catch {
        toast.error("שגיאה בכיווץ התמונה");
      }
    } else {
      setQuickImageUrl(URL.createObjectURL(file));
    }
  };

  const handleGenerateQuickImage = async () => {
    if (!quickName.trim()) return;
    setGeneratingQuickImage(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-product-image", {
        body: { productName: quickName.trim(), productDescription: quickDesc.trim(), businessCategory: data.businessCategory },
      });
      if (!error && result?.imageUrl) setQuickImageUrl(result.imageUrl);
      else toast.error("שגיאה ביצירת תמונה");
    } catch { toast.error("שגיאה ביצירת תמונה"); }
    finally { setGeneratingQuickImage(false); }
  };

  const handleQuickKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleQuickAdd();
  };

  // ── Excel ──────────────────────────────────────────────────────────────────

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFile(file);
    setParseError(null);
    parseExcelFile(file);
  };

  const parseExcelFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array", codepage: 65001 });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) { setParseError("הקובץ ריק או לא מכיל נתונים"); return; }

      const headers = jsonData[0].map((h: any) => String(h || "").toLowerCase().trim());
      const idx = (terms: string[]) => headers.findIndex((h: string) => terms.some(t => h.includes(t)));

      const nameIdx = idx(["שם", "name", "מוצר", "product"]);
      const priceIdx = idx(["מחיר", "price", "עלות", "cost"]);
      const descIdx = idx(["תיאור", "description", "desc"]);
      const skuIdx = idx(['מק"ט', "מקט", "sku", "קוד"]);
      const imageIdx = idx(["תמונה", "image", "url", "קישור"]);
      const catIdx = idx(["קטגוריה", "category"]);

      if (nameIdx === -1 || priceIdx === -1) {
        setParseError("הקובץ חייב להכיל עמודות: שם מוצר ומחיר");
        return;
      }

      const products: ExcelProduct[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        const name = row[nameIdx];
        const price = row[priceIdx];
        if (!name || price == null) continue;
        const parsedPrice = typeof price === "number" ? price : parseFloat(String(price).replace(/[^\d.]/g, ""));
        if (isNaN(parsedPrice)) continue;
        products.push({
          name: String(name).trim(),
          description: descIdx !== -1 ? String(row[descIdx] || "").trim() : "",
          price: parsedPrice,
          sku: skuIdx !== -1 ? String(row[skuIdx] || "").trim() : undefined,
          imageUrl: imageIdx !== -1 ? String(row[imageIdx] || "").trim() : undefined,
          categoryName: catIdx !== -1 ? String(row[catIdx] || "").trim() : undefined,
        });
      }

      if (products.length === 0) { setParseError("לא נמצאו מוצרים תקינים בקובץ"); return; }
      setParsedProducts(products);
      toast.success(`נמצאו ${products.length} מוצרים בקובץ`);
    } catch {
      setParseError("שגיאה בקריאת הקובץ. אנא ודא שזהו קובץ אקסל תקין");
    }
  };

  const findCategoryByName = (name: string) => {
    if (!name || data.productOrganization !== "categories") return undefined;
    const n = name.toLowerCase().trim();
    return (
      data.productCategories.find(c => c.name.toLowerCase().trim() === n)?.id ||
      data.productCategories.find(c => c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase()))?.id
    );
  };

  const handleImportExcel = () => {
    if (!parsedProducts.length) return;
    const newProducts = parsedProducts.map((p, i) => {
      let categoryId: string | undefined;
      if (data.productOrganization === "categories") {
        categoryId = (p.categoryName ? findCategoryByName(p.categoryName) : undefined)
          || defaultCategoryForExcel || selectedCategoryId || undefined;
      }
      return { id: `${Date.now()}-${i}`, name: p.name, description: p.description || "", price: p.price, sku: p.sku, imageUrl: p.imageUrl, categoryId };
    });
    updateData({ products: [...data.products, ...newProducts] });
    toast.success(`יובאו ${newProducts.length} מוצרים בהצלחה`);
    setExcelFile(null); setParsedProducts([]); setDefaultCategoryForExcel(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['שם מוצר', 'תיאור מוצר', 'מחיר'],
      ['זר פרחים קיץ', 'זר צבעוני עם חמניות ולבנדר', '150'],
      ['עציץ בונסאי', 'עציץ בונסאי קטן מתאים לשולחן', '220'],
    ]);
    ws["!cols"] = [{ wch: 30 }, { wch: 40 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "מוצרים");
    XLSX.writeFile(wb, 'תבנית_מוצרים.xlsx');
    toast.success("התבנית הורדה בהצלחה");
  };

  // ── Voice ──────────────────────────────────────────────────────────────────

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicHelp("unsupported");
      return;
    }
    // Check existing permission state before requesting — avoids the loop where
    // a previously-denied permission makes getUserMedia fail silently.
    try {
      const perm = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (perm.state === "denied") {
        setMicHelp("denied");
        return;
      }
    } catch { /* browser may not support permissions API — proceed normally */ }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicHelp(null);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        await transcribeAudio(new Blob(audioChunksRef.current, { type: "audio/webm" }));
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      const name = (err as Error)?.name;
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        toast.error("לא נמצא מיקרופון במכשיר.");
      } else if (name === "NotAllowedError") {
        setMicHelp("denied");
      } else {
        setMicHelp("blocked");
      }
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setIsTranscribing(true);
  };

  const transcribeAudio = async (blob: Blob) => {
    try {
      const ab = await blob.arrayBuffer();
      const bytes = new Uint8Array(ab);
      let binary = "";
      bytes.forEach(b => { binary += String.fromCharCode(b); });
      const base64 = btoa(binary);

      const { data: result, error } = await supabase.functions.invoke("transcribe-products", {
        body: { audio: base64, mimeType: blob.type },
      });
      if (error) throw error;
      if (result?.transcript) setVoiceTranscript(result.transcript);
      if (result?.products?.length) setVoiceParsed(result.products);
      else toast.error("לא זוהו מוצרים בהקלטה — נסו שוב");
    } catch {
      toast.error("שגיאה בתמלול — נסו שוב");
    } finally {
      setIsTranscribing(false);
    }
  };

  // ── Import parsed (shared for pdf/url/voice) ───────────────────────────────

  const importParsed = (products: ParsedProduct[]) => {
    const newProducts = products.map((p, i) => ({
      id: `${Date.now()}-${i}`,
      name: p.name,
      description: p.description || "",
      price: p.price,
      imageUrl: p.image || undefined,
      categoryId: data.productOrganization === "categories" ? selectedCategoryId || undefined : undefined,
    }));
    updateData({ products: [...data.products, ...newProducts] });
    toast.success(`יובאו ${newProducts.length} מוצרים`);
    setVoiceTranscript(""); setVoiceParsed([]);
  };

  // ── AI images ──────────────────────────────────────────────────────────────

  const handleGenerateImageForProduct = async (productId: string) => {
    const product = data.products.find(p => p.id === productId);
    if (!product) return;
    setGeneratingProductId(productId);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-product-image", {
        body: { productName: product.name, productDescription: product.description, businessCategory: data.businessCategory },
      });
      if (error) throw error;
      if (result?.imageUrl) {
        updateData({ products: data.products.map(p => p.id === productId ? { ...p, imageUrl: result.imageUrl } : p) });
        toast.success(`תמונה נוצרה עבור "${product.name}"`);
      }
    } catch { toast.error("שגיאה ביצירת התמונה"); }
    finally { setGeneratingProductId(null); }
  };

  const handleGenerateAllImages = async () => {
    const withoutImages = data.products.filter(p => !p.imageUrl);
    if (!withoutImages.length) { toast.info("לכל המוצרים כבר יש תמונות"); return; }
    setIsGeneratingAllImages(true);
    setGeneratingProgress({ current: 0, total: withoutImages.length });
    const updatedProducts = [...data.products];
    let done = 0, successCount = 0;
    // Generate several at once instead of one-by-one (was N x ~slow sequentially).
    const CONCURRENCY = 4;
    const queue = [...withoutImages];
    const worker = async () => {
      while (queue.length) {
        const product = queue.shift()!;
        try {
          const { data: result, error } = await supabase.functions.invoke("generate-product-image", {
            body: { productName: product.name, productDescription: product.description, businessCategory: data.businessCategory },
          });
          if (!error && result?.imageUrl) {
            const idx = updatedProducts.findIndex(p => p.id === product.id);
            if (idx !== -1) updatedProducts[idx] = { ...updatedProducts[idx], imageUrl: result.imageUrl };
            successCount++;
          }
        } catch { /* continue */ }
        done++;
        setGeneratingProgress({ current: done, total: withoutImages.length });
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, withoutImages.length) }, worker));
    updateData({ products: updatedProducts });
    setIsGeneratingAllImages(false);
    setGeneratingProductId(null);
    setGeneratingProgress({ current: 0, total: 0 });
    toast.success(`נוצרו ${successCount} תמונות`);
  };

  // Edit an existing AI image in place (img2img): user describes the change.
  const handleEditImage = async (productId: string, instruction: string) => {
    const product = data.products.find(p => p.id === productId);
    if (!product?.imageUrl || !instruction.trim()) return;
    setGeneratingProductId(productId);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-product-image", {
        body: {
          productName: product.name, productDescription: product.description, businessCategory: data.businessCategory,
          baseImageUrl: product.imageUrl, editInstruction: instruction.trim(),
        },
      });
      if (error) throw error;
      if (result?.imageUrl) {
        updateData({ products: data.products.map(p => p.id === productId ? { ...p, imageUrl: result.imageUrl } : p) });
        toast.success("התמונה עודכנה");
        setEditingProductId(null);
        setEditPrompt("");
      } else {
        toast.error("עריכת התמונה נכשלה");
      }
    } catch { toast.error("שגיאה בעריכת התמונה"); }
    finally { setGeneratingProductId(null); }
  };

  // ── Category handlers ──────────────────────────────────────────────────────

  const handleAddCategory = (cat: ProductCategory) => updateData({ productCategories: [...data.productCategories, cat] });
  const handleRemoveCategory = (id: string) => {
    updateData({
      productCategories: data.productCategories.filter(c => c.id !== id),
      products: data.products.map(p => p.categoryId === id ? { ...p, categoryId: undefined } : p),
    });
    if (selectedCategoryId === id) setSelectedCategoryId(null);
  };
  const handleUpdateCategory = (id: string, updates: Partial<ProductCategory>) =>
    updateData({ productCategories: data.productCategories.map(c => c.id === id ? { ...c, ...updates } : c) });

  const handleRemoveProduct = (id: string) => updateData({ products: data.products.filter(p => p.id !== id) });

  // ── Shared preview table ───────────────────────────────────────────────────

  const PreviewTable = ({ products, onImport }: { products: ParsedProduct[]; onImport: () => void }) => (
    <div className="space-y-3">
      <p className="text-sm font-medium">תצוגה מקדימה — {products.length} מוצרים</p>
      <div className="max-h-44 overflow-y-auto rounded-xl border border-border divide-y divide-border">
        {products.slice(0, 15).map((p, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="font-medium truncate flex-1">{p.name}</span>
            <span className="text-muted-foreground shrink-0 mr-3">₪{p.price}</span>
          </div>
        ))}
        {products.length > 15 && (
          <div className="px-3 py-2 text-xs text-muted-foreground text-center">+ {products.length - 15} נוספים</div>
        )}
      </div>
      <button
        onClick={onImport}
        className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-4 h-4" /> ייבא {products.length} מוצרים
      </button>
    </div>
  );

  // ── Product list item ──────────────────────────────────────────────────────

  const ProductItem = ({ product }: { product: (typeof data.products)[0] }) => (
    <div className="rounded-xl bg-card border border-border">
      <div className="flex items-center gap-3 p-3">
        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden relative group">
          {generatingProductId === product.id ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
          ) : product.imageUrl ? (
            <>
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover cursor-zoom-in"
                onClick={() => setLightboxUrl(product.imageUrl!)}
              />
              <button
                onClick={() => { setEditingProductId(editingProductId === product.id ? null : product.id); setEditPrompt(""); }}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
                title="ערוך תמונה"
              >
                <Pencil className="w-4 h-4 text-white" />
              </button>
            </>
          ) : (
            <>
              <Package className="w-5 h-5 text-muted-foreground" />
              <button
                onClick={() => handleGenerateImageForProduct(product.id)}
                className="absolute inset-0 bg-primary/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
                title="צור תמונה עם AI"
              >
                <Sparkles className="w-4 h-4 text-white" />
              </button>
            </>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{product.name}</p>
          {product.description && <p className="text-xs text-muted-foreground truncate">{product.description}</p>}
        </div>
        <span className="text-sm font-semibold shrink-0">₪{product.price}</span>
        <button onClick={() => handleRemoveProduct(product.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors shrink-0">
          <Trash2 className="w-3.5 h-3.5 text-destructive" />
        </button>
      </div>
      {/* Inline image-edit panel */}
      {editingProductId === product.id && product.imageUrl && (
        <div className="px-3 pb-3 flex items-center gap-2">
          <input
            value={editPrompt}
            onChange={e => setEditPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleEditImage(product.id, editPrompt); }}
            placeholder="מה לשנות? לדוגמה: רקע לבן, תאורה חמה יותר"
            className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-xs"
            dir="rtl"
          />
          <button
            onClick={() => handleEditImage(product.id, editPrompt)}
            disabled={!editPrompt.trim() || generatingProductId === product.id}
            className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50 flex items-center gap-1 shrink-0"
          >
            {generatingProductId === product.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            החל
          </button>
        </div>
      )}
    </div>
  );

  const displayProducts = data.productOrganization === "categories" && selectedCategoryId
    ? filteredProducts
    : data.products;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Microphone permission window - opens whenever access is missing/blocked */}
      {micHelp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          dir="rtl"
          onClick={() => setMicHelp(null)}
        >
          <div className="bg-card rounded-2xl border border-border max-w-sm w-full p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold">גישה למיקרופון</h3>
              </div>
              <button onClick={() => setMicHelp(null)} className="p-1 hover:bg-muted rounded-lg" aria-label="סגור">
                <X className="w-4 h-4" />
              </button>
            </div>

            {micHelp === "unsupported" ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                הדפדפן הנוכחי לא מאפשר הקלטה (למשל דפדפן מוטמע בתוך אפליקציה). פתחו את הקישור בכרטיסיית דפדפן רגילה (Chrome / Safari) ונסו שוב.
              </p>
            ) : micHelp === "denied" ? (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  הגישה למיקרופון נחסמה בהגדרות הדפדפן. צריך לאפשר ידנית:
                </p>
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed space-y-1">
                  <p>1. לחצו על סמל 🔒 משמאל לכתובת האתר בדפדפן</p>
                  <p>2. מצאו <span className="font-medium text-foreground">מיקרופון</span> ושנו ל-<span className="font-medium text-foreground">אפשר</span></p>
                  <p>3. רעננו את הדף (F5)</p>
                </div>
                <button
                  onClick={() => setMicHelp(null)}
                  className="w-full h-10 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  סגור
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  כדי להקליט מוצרים בקול צריך לאשר גישה למיקרופון. לחצו "אפשר מיקרופון" ואשרו את הבקשה שתופיע בדפדפן.
                </p>
                <button
                  onClick={() => { setMicHelp(null); startRecording(); }}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                >
                  <Mic className="w-4 h-4" /> אפשר מיקרופון ונסה שוב
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            style={{ maxWidth: "90vw", maxHeight: "85vh" }}
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-medium text-foreground mb-1">המוצרים שלך</h1>
        <p className="text-sm text-muted-foreground">הוסיפו מוצרים — אפשר לשלב כמה שיטות</p>
      </div>

      {/* Organization toggle */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => updateData({ productOrganization: "free" })}
          className={`p-3 rounded-xl border-2 text-right transition-all ${data.productOrganization === "free" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <List className={`w-4 h-4 ${data.productOrganization === "free" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${data.productOrganization === "free" ? "text-primary" : "text-foreground"}`}>רשימה חופשית</span>
          </div>
          <p className="text-xs text-muted-foreground">כל המוצרים במקום אחד</p>
        </button>
        <button
          onClick={() => updateData({ productOrganization: "categories" })}
          className={`p-3 rounded-xl border-2 text-right transition-all ${data.productOrganization === "categories" ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <LayoutGrid className={`w-4 h-4 ${data.productOrganization === "categories" ? "text-primary" : "text-muted-foreground"}`} />
            <span className={`text-sm font-medium ${data.productOrganization === "categories" ? "text-primary" : "text-foreground"}`}>לפי קטגוריות</span>
          </div>
          <p className="text-xs text-muted-foreground">חולצות, מכנסיים, נעליים...</p>
        </button>
      </div>

      {/* Categories sidebar (only when categories mode active) */}
      {data.productOrganization === "categories" && (
        <div className="p-4 rounded-xl border border-border bg-card">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-primary" /> קטגוריות
          </h3>
          <ProductCategoryManager
            categories={data.productCategories}
            selectedCategoryId={selectedCategoryId}
            onAddCategory={handleAddCategory}
            onRemoveCategory={handleRemoveCategory}
            onSelectCategory={setSelectedCategoryId}
            onUpdateCategory={handleUpdateCategory}
            productsCountByCategory={productsCountByCategory}
          />
        </div>
      )}

      {/* Method selector */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { id: "quick" as Method, icon: Plus, title: "הוספה מהירה", desc: "שורה אחת לכל מוצר" },
          { id: "catalog" as Method, icon: FileSpreadsheet, title: "ייבוא קובץ", desc: "אקסל · PDF · קישור" },
          { id: "voice" as Method, icon: Mic, title: "הכתבה קולית", desc: "דברו, אנחנו נרשום" },
        ] as const).map(({ id, icon: Icon, title, desc }) => (
          <button
            key={id}
            onClick={() => setActiveMethod(id)}
            className={`p-3 rounded-xl border-2 text-center transition-all ${
              activeMethod === id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/30"
            }`}
          >
            <Icon className={`w-5 h-5 mx-auto mb-1.5 ${activeMethod === id ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-xs font-medium">{title}</p>
            <p className="text-[10px] text-muted-foreground">{desc}</p>
          </button>
        ))}
      </div>

      {/* ── Quick add pane ── */}
      {activeMethod === "quick" && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex gap-3">
              {/* Image picker */}
              <div className="shrink-0">
                <input ref={quickImageRef} type="file" accept="image/*" className="hidden" onChange={handleQuickImageFile} />
                <div
                  onClick={() => !quickImageUrl && quickImageRef.current?.click()}
                  className="w-[72px] h-[72px] rounded-xl border border-dashed border-border overflow-hidden relative group cursor-pointer hover:border-primary/50 transition-colors bg-muted/30"
                >
                  {quickImageUrl ? (
                    <>
                      <img src={quickImageUrl} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={e => { e.stopPropagation(); setQuickImageUrl(null); }}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
                      <ImagePlus className="w-5 h-5" />
                      <span className="text-[10px]">תמונה</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Name + price + desc */}
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-[1fr_90px] gap-2">
                  <Input
                    placeholder="שם המוצר *"
                    value={quickName}
                    onChange={e => setQuickName(e.target.value)}
                    onKeyDown={handleQuickKeyDown}
                    className="h-10 rounded-xl"
                  />
                  <Input
                    placeholder="₪ מחיר"
                    type="number"
                    value={quickPrice}
                    onChange={e => setQuickPrice(e.target.value)}
                    onKeyDown={handleQuickKeyDown}
                    className="h-10 rounded-xl"
                    dir="ltr"
                  />
                </div>
                <Input
                  placeholder="תיאור קצר — גודל, חומר, צבע..."
                  value={quickDesc}
                  onChange={e => setQuickDesc(e.target.value)}
                  onKeyDown={handleQuickKeyDown}
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            {/* Image actions + add button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => quickImageRef.current?.click()}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                העלה תמונה
              </button>
              <button
                onClick={handleGenerateQuickImage}
                disabled={!quickName.trim() || generatingQuickImage}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-primary/30 text-xs text-primary hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generatingQuickImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                {generatingQuickImage ? "יוצר..." : "צור עם AI"}
              </button>
              <div className="flex-1" />
              <button
                onClick={handleQuickAdd}
                disabled={!quickName.trim() || !quickPrice.trim()}
                className="flex items-center gap-1.5 px-4 h-8 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" /> הוסף מוצר
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Catalog pane (Excel only) ── */}
      {activeMethod === "catalog" && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelFileChange} className="hidden" />

          {!excelFile ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-center"
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">גררו קובץ אקסל לכאן או לחצו לבחירה</p>
              <p className="text-xs text-muted-foreground mt-1">.xlsx · .csv · עד 500 מוצרים</p>
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
              <FileSpreadsheet className="w-7 h-7 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{excelFile.name}</p>
                <p className="text-xs text-muted-foreground">{(excelFile.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={() => { setExcelFile(null); setParsedProducts([]); setParseError(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="p-1.5 hover:bg-muted rounded-lg">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}

          {parseError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{parseError}</p>
            </div>
          )}

          <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 text-xs text-primary hover:underline">
            <Download className="w-3.5 h-3.5" /> הורד תבנית אקסל מוכנה
          </button>

          {parsedProducts.length > 0 && (
            <>
              {data.productOrganization === "categories" && data.productCategories.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">קטגוריה ברירת מחדל (אופציונלי)</p>
                  <select
                    value={defaultCategoryForExcel || ""}
                    onChange={e => setDefaultCategoryForExcel(e.target.value || null)}
                    className="w-full h-9 px-3 rounded-xl border border-border bg-background text-sm text-foreground"
                  >
                    <option value="">ללא קטגוריה</option>
                    {data.productCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <PreviewTable
                products={parsedProducts.map(p => ({ name: p.name, price: p.price, description: p.description }))}
                onImport={handleImportExcel}
              />
            </>
          )}

          <div className="text-xs text-muted-foreground bg-muted/30 rounded-xl p-3 leading-relaxed">
            עמודות: <strong>שם מוצר, תיאור מוצר, מחיר</strong>
          </div>
        </div>
      )}

      {/* ── Voice pane ── */}
      {activeMethod === "voice" && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="text-center space-y-3">
            <div className="relative inline-block">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all mx-auto ${
                  isRecording ? "border-destructive bg-destructive/10" : "border-primary bg-primary/10"
                } disabled:opacity-50`}
              >
                {isTranscribing
                  ? <Loader2 className="w-7 h-7 text-primary animate-spin" />
                  : isRecording
                  ? <MicOff className="w-7 h-7 text-destructive" />
                  : <Mic className="w-7 h-7 text-primary" />
                }
              </button>
              {isRecording && (
                <span className="absolute -inset-2 rounded-full border-2 border-destructive/50 animate-ping" />
              )}
            </div>
            <p className="text-sm font-medium">
              {isTranscribing ? "מתמלל עם AI..." : isRecording ? "מקליט — לחצו לעצירה" : "לחצו להתחיל הקלטה"}
            </p>
            <p className="text-xs text-muted-foreground italic leading-relaxed">
              "חולצה לבנה מאה שקל, מכנסיים שחורים מאתיים וחמישים, כובע בייסבול שישים"
            </p>
          </div>

          {voiceTranscript && (
            <div className="p-3 rounded-xl bg-muted/30 border border-border text-sm leading-relaxed">
              {voiceTranscript}
            </div>
          )}

          {voiceParsed.length > 0 && <PreviewTable products={voiceParsed} onImport={() => importParsed(voiceParsed)} />}
        </div>
      )}

      {/* ── Product list ── */}
      {displayProducts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{displayProducts.length} מוצרים</p>
            {data.products.some(p => !p.imageUrl) && (
              <button
                onClick={handleGenerateAllImages}
                disabled={isGeneratingAllImages || generatingProductId !== null}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
              >
                {isGeneratingAllImages
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> {generatingProgress.current}/{generatingProgress.total}</>
                  : <><Sparkles className="w-3 h-3" /> צור תמונות לכולם</>
                }
              </button>
            )}
          </div>
          <div className="space-y-2">
            {displayProducts.map(product => <ProductItem key={product.id} product={product} />)}
          </div>
        </div>
      )}

      {/* Sticky bottom navigation */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border py-3 flex items-center justify-between gap-3 -mx-4 px-4 mt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 h-11 rounded-xl border border-border text-sm hover:bg-muted transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          חזרה
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          {data.products.length > 0 ? "המשך" : "דלג בינתיים"}
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
      </div>
    </div>
  );
};

export default StepProducts;
