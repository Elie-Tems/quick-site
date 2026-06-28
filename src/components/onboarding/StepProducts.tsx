import { useState, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { OnboardingData, ProductCategory } from "@/pages/Onboarding";
import {
  Plus, Trash2, Package, FileSpreadsheet, Upload, X, Download,
  AlertCircle, Sparkles, Loader2, LayoutGrid, List, FolderOpen,
  Mic, MicOff, Link2, FileText,
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
}

type Method = "quick" | "catalog" | "voice";
type CatalogTab = "xlsx" | "pdf" | "url";

const StepProducts = ({ data, updateData, onNext, onBack }: StepProductsProps) => {
  const [activeMethod, setActiveMethod] = useState<Method>("quick");
  const [catalogTab, setCatalogTab] = useState<CatalogTab>("xlsx");

  // Quick add
  const [quickName, setQuickName] = useState("");
  const [quickPrice, setQuickPrice] = useState("");
  const [quickDesc, setQuickDesc] = useState("");

  // Excel
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [parsedProducts, setParsedProducts] = useState<ExcelProduct[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [defaultCategoryForExcel, setDefaultCategoryForExcel] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfParsed, setPdfParsed] = useState<ParsedProduct[]>([]);
  const [isPdfParsing, setIsPdfParsing] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // URL
  const [catalogUrl, setCatalogUrl] = useState("");
  const [urlParsed, setUrlParsed] = useState<ParsedProduct[]>([]);
  const [isUrlScraping, setIsUrlScraping] = useState(false);

  // Voice
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceParsed, setVoiceParsed] = useState<ParsedProduct[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // AI images
  const [generatingProductId, setGeneratingProductId] = useState<string | null>(null);
  const [isGeneratingAllImages, setIsGeneratingAllImages] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState({ current: 0, total: 0 });

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
        categoryId,
      }],
    });
    setQuickName("");
    setQuickPrice("");
    setQuickDesc("");
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
      ['שם מוצר', 'מק"ט', 'תיאור', 'מחיר', 'קישור לתמונה', 'קטגוריה'],
      ['מוצר לדוגמה 1', 'SKU001', 'תיאור קצר של המוצר', '99', 'https://example.com/img1.jpg', 'קטגוריה 1'],
      ['מוצר לדוגמה 2', 'SKU002', 'תיאור קצר נוסף', '149', 'https://example.com/img2.jpg', 'קטגוריה 2'],
    ]);
    ws["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 10 }, { wch: 40 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "מוצרים");
    XLSX.writeFile(wb, 'תבנית_מוצרים.xlsx');
    toast.success("התבנית הורדה בהצלחה");
  };

  // ── PDF ────────────────────────────────────────────────────────────────────

  const handlePdfUpload = async (file: File) => {
    setPdfFile(file);
    setIsPdfParsing(true);
    setPdfParsed([]);
    try {
      const pdfjsLib = await import("pdfjs-dist");
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";
      for (let i = 1; i <= Math.min(pdf.numPages, 15); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
      }

      const { data: result, error } = await supabase.functions.invoke("parse-catalog-products", {
        body: { text: fullText.slice(0, 6000) },
      });
      if (error) throw error;
      if (result?.products?.length) {
        setPdfParsed(result.products);
        toast.success(`נמצאו ${result.products.length} מוצרים בקטלוג`);
      } else {
        toast.error("לא נמצאו מוצרים בקטלוג זה");
      }
    } catch {
      toast.error("שגיאה בפענוח הקטלוג");
    } finally {
      setIsPdfParsing(false);
    }
  };

  // ── URL ────────────────────────────────────────────────────────────────────

  const handleUrlScrape = async () => {
    if (!catalogUrl.trim()) return;
    setIsUrlScraping(true);
    setUrlParsed([]);
    try {
      const { data: result, error } = await supabase.functions.invoke("parse-catalog-products", {
        body: { url: catalogUrl.trim() },
      });
      if (error) throw error;
      if (result?.products?.length) {
        setUrlParsed(result.products);
        toast.success(`נמצאו ${result.products.length} מוצרים`);
      } else {
        toast.error("לא נמצאו מוצרים בקישור זה");
      }
    } catch {
      toast.error("שגיאה בסריקת הקישור");
    } finally {
      setIsUrlScraping(false);
    }
  };

  // ── Voice ──────────────────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    } catch {
      toast.error("לא ניתן לגשת למיקרופון — בדוק הרשאות");
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

  const importParsed = (products: ParsedProduct[], label: string) => {
    const newProducts = products.map((p, i) => ({
      id: `${Date.now()}-${i}`,
      name: p.name,
      description: p.description || "",
      price: p.price,
      categoryId: data.productOrganization === "categories" ? selectedCategoryId || undefined : undefined,
    }));
    updateData({ products: [...data.products, ...newProducts] });
    toast.success(`יובאו ${newProducts.length} מוצרים`);
    if (label === "pdf") { setPdfFile(null); setPdfParsed([]); }
    if (label === "url") { setCatalogUrl(""); setUrlParsed([]); }
    if (label === "voice") { setVoiceTranscript(""); setVoiceParsed([]); }
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
    let successCount = 0;
    for (let i = 0; i < withoutImages.length; i++) {
      const product = withoutImages[i];
      setGeneratingProgress({ current: i + 1, total: withoutImages.length });
      setGeneratingProductId(product.id);
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
      if (i < withoutImages.length - 1) await new Promise(r => setTimeout(r, 800));
    }
    updateData({ products: updatedProducts });
    setIsGeneratingAllImages(false);
    setGeneratingProductId(null);
    setGeneratingProgress({ current: 0, total: 0 });
    toast.success(`נוצרו ${successCount} תמונות`);
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
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
      <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden relative group">
        {generatingProductId === product.id ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
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
  );

  const displayProducts = data.productOrganization === "categories" && selectedCategoryId
    ? filteredProducts
    : data.products;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-medium text-foreground mb-1">המוצרים שלך</h1>
        <p className="text-sm text-muted-foreground">הוסיפו מוצרים — אפשר לשלב כמה שיטות</p>
      </div>

      {/* Organization toggle (secondary) */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-xs text-muted-foreground">ארגון:</span>
        <button
          onClick={() => updateData({ productOrganization: "free" })}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${data.productOrganization === "free" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
        >
          <List className="w-3 h-3" /> חופשי
        </button>
        <button
          onClick={() => updateData({ productOrganization: "categories" })}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-colors ${data.productOrganization === "categories" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
        >
          <LayoutGrid className="w-3 h-3" /> לפי קטגוריות
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
              placeholder="תיאור קצר — גודל, חומר, צבע... (אופציונלי)"
              value={quickDesc}
              onChange={e => setQuickDesc(e.target.value)}
              onKeyDown={handleQuickKeyDown}
              className="h-10 rounded-xl"
            />
            <div className="flex justify-end">
              <button
                onClick={handleQuickAdd}
                disabled={!quickName.trim() || !quickPrice.trim()}
                className="flex items-center gap-1.5 px-4 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" /> תמונה
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">תמונות ניתן לצור עם AI לאחר הוספת המוצרים</p>
        </div>
      )}

      {/* ── Catalog pane ── */}
      {activeMethod === "catalog" && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          {/* Sub-tabs */}
          <div className="flex gap-2">
            {([
              { id: "xlsx" as CatalogTab, label: "אקסל / CSV" },
              { id: "pdf" as CatalogTab, label: "קטלוג PDF" },
              { id: "url" as CatalogTab, label: "קישור לאתר" },
            ]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setCatalogTab(id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${catalogTab === id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Excel */}
          {catalogTab === "xlsx" && (
            <div className="space-y-3">
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelFileChange} className="hidden" />
              {!excelFile ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-center"
                >
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">גררו קובץ לכאן או לחצו לבחירה</p>
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
                <Download className="w-3.5 h-3.5" /> הורידו תבנית מוכנה
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
                עמודות חובה: <strong>שם, מחיר</strong> — אופציונלי: תיאור, קטגוריה, מק"ט, קישור תמונה
              </div>
            </div>
          )}

          {/* PDF */}
          {catalogTab === "pdf" && (
            <div className="space-y-3">
              <input ref={pdfInputRef} type="file" accept=".pdf" onChange={e => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); }} className="hidden" />
              {!pdfFile ? (
                <button
                  onClick={() => pdfInputRef.current?.click()}
                  className="w-full p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-center"
                >
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">העלו קטלוג PDF</p>
                  <p className="text-xs text-muted-foreground mt-1">נחלץ שמות ומחירים אוטומטית עם AI</p>
                </button>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                  <FileText className="w-7 h-7 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pdfFile.name}</p>
                    {isPdfParsing && <p className="text-xs text-primary flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> מעבד עם AI...</p>}
                  </div>
                  {!isPdfParsing && <button onClick={() => { setPdfFile(null); setPdfParsed([]); if (pdfInputRef.current) pdfInputRef.current.value = ""; }} className="p-1.5 hover:bg-muted rounded-lg"><X className="w-4 h-4 text-muted-foreground" /></button>}
                </div>
              )}
              {pdfParsed.length > 0 && <PreviewTable products={pdfParsed} onImport={() => importParsed(pdfParsed, "pdf")} />}
              <p className="text-xs text-muted-foreground">הדיוק תלוי בפורמט הקטלוג — תוכלו לערוך לאחר הייבוא</p>
            </div>
          )}

          {/* URL */}
          {catalogTab === "url" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">הדביקו קישור לדף מוצרים באתר שלכם</p>
              <div className="flex gap-2">
                <Input
                  placeholder="https://..."
                  value={catalogUrl}
                  onChange={e => setCatalogUrl(e.target.value)}
                  className="h-10 rounded-xl flex-1"
                  dir="ltr"
                  onKeyDown={e => e.key === "Enter" && handleUrlScrape()}
                />
                <button
                  onClick={handleUrlScrape}
                  disabled={isUrlScraping || !catalogUrl.trim()}
                  className="px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                >
                  {isUrlScraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  סרוק
                </button>
              </div>
              {urlParsed.length > 0 && <PreviewTable products={urlParsed} onImport={() => importParsed(urlParsed, "url")} />}
              <p className="text-xs text-muted-foreground">פועל על דפי מוצרים סטנדרטיים</p>
            </div>
          )}
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

          {voiceParsed.length > 0 && <PreviewTable products={voiceParsed} onImport={() => importParsed(voiceParsed, "voice")} />}
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

      {/* Navigation */}
      <StepNavigation
        onNext={onNext}
        onBack={onBack}
        nextLabel={data.products.length > 0 ? "הבא" : "דלג בינתיים"}
        nextDisabled={false}
        showPreview={true}
        showSave={false}
      />
    </div>
  );
};

export default StepProducts;
