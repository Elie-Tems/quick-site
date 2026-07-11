import { useState, useRef } from "react";
import { Wand2, Upload, X, Download, Loader2, Images, Building2, Sofa } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  businessId?: string;
}

const STYLES = [
  { id: "modern",        label: "מודרני",       emoji: "🏙️" },
  { id: "mediterranean", label: "ים תיכוני",    emoji: "🌿" },
  { id: "classic",       label: "קלאסי",        emoji: "🏛️" },
  { id: "industrial",    label: "תעשייתי",      emoji: "🔩" },
  { id: "luxury",        label: "יוקרתי",       emoji: "✨" },
];

interface GeneratedImage {
  url: string;
  type: "exterior" | "interior";
  style: string;
  brief: string;
}

const DashboardVisualizationStudio = ({ businessId }: Props) => {
  const [type, setType] = useState<"exterior" | "interior">("exterior");
  const [style, setStyle] = useState("modern");
  const [brief, setBrief] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReferenceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceFile(file);
    const reader = new FileReader();
    reader.onload = () => setReferencePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearReference = () => {
    setReferenceFile(null);
    setReferencePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerate = async () => {
    if (!businessId) return;
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("לא מחובר");

      let referenceImageBase64: string | undefined;
      let referenceImageMime: string | undefined;

      if (referenceFile) {
        const buffer = await referenceFile.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        bytes.forEach(b => { binary += String.fromCharCode(b); });
        referenceImageBase64 = btoa(binary);
        referenceImageMime = referenceFile.type || "image/jpeg";
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-visualization`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ businessId, type, style, brief, referenceImageBase64, referenceImageMime }),
        }
      );

      const json = await resp.json();
      if (!json.success) throw new Error(json.error || "שגיאה ביצירת ההדמיה");

      setResults(prev => [{ url: json.imageUrl, type, style, brief }, ...prev]);
      toast.success("ההדמיה נוצרה בהצלחה!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "שגיאה ביצירת ההדמיה");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `visualization-${Date.now()}.png`;
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Images className="h-5 w-5 text-primary" />
          סטודיו הדמיות
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          יצירת הדמיות ריאליסטיות לפרויקטים — ניתן להעלות שרטוט וה-AI יהפוך אותו לתמונה שיווקית
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: form */}
        <div className="space-y-5">

          {/* Type toggle */}
          <div>
            <Label className="!text-foreground mb-2 block">סוג הדמיה</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: "exterior", label: "חוץ", icon: Building2 },
                { id: "interior", label: "פנים", icon: Sofa },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                    type === t.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Style */}
          <div>
            <Label className="!text-foreground mb-2 block">סגנון אדריכלי</Label>
            <div className="flex flex-wrap gap-2">
              {STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    style === s.id
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Brief */}
          <div>
            <Label htmlFor="brief" className="!text-foreground mb-1 block">
              תיאור הפרויקט <span className="text-muted-foreground font-normal text-xs">(אופציונלי)</span>
            </Label>
            <Textarea
              id="brief"
              value={brief}
              onChange={e => setBrief(e.target.value)}
              placeholder="למשל: בניין 8 קומות בצפון תל אביב, חזית זכוכית וקונקרט, גינה ירוקה בכניסה..."
              className="resize-none"
              rows={3}
              dir="rtl"
            />
          </div>

          {/* Reference file */}
          <div>
            <Label className="!text-foreground mb-1 block">
              שרטוט / תוכנית <span className="text-muted-foreground font-normal text-xs">(אופציונלי — ה-AI יתבסס עליו)</span>
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleReferenceSelect}
              className="hidden"
            />
            {referencePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={referencePreview} alt="שרטוט" className="w-full max-h-48 object-contain bg-muted" />
                <button
                  onClick={clearReference}
                  className="absolute top-2 left-2 w-7 h-7 rounded-full bg-background/90 flex items-center justify-center hover:bg-background transition-colors shadow"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors"
              >
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">גרור קובץ או לחץ להעלאה</p>
                <p className="text-xs text-muted-foreground/60 mt-1">תוכנית קומה, חזית, סקיצה</p>
              </button>
            )}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !businessId}
            className="w-full h-12 text-base gap-2"
          >
            {isGenerating
              ? <><Loader2 className="h-5 w-5 animate-spin" />יוצר הדמיה...</>
              : <><Wand2 className="h-5 w-5" />צור הדמיה</>
            }
          </Button>

          {isGenerating && (
            <p className="text-center text-xs text-muted-foreground animate-pulse">
              ה-AI בונה את ההדמיה, זה לוקח כ-15-30 שניות...
            </p>
          )}
        </div>

        {/* Right: results */}
        <div className="space-y-3">
          <Label className="!text-foreground block">הדמיות שנוצרו</Label>
          {results.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-xl p-12 text-center">
              <Images className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">ההדמיות יופיעו כאן</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {results.map((img, i) => (
                <div key={i} className="group relative rounded-xl overflow-hidden border border-border bg-muted">
                  <img
                    src={img.url}
                    alt="הדמיה"
                    className="w-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    style={{ aspectRatio: "3/2" }}
                    onClick={() => setLightbox(img.url)}
                  />
                  <div className="absolute top-2 left-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDownload(img.url)}
                      className="w-8 h-8 rounded-lg bg-background/90 backdrop-blur flex items-center justify-center shadow hover:bg-background transition-colors"
                      title="הורד"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{img.type === "exterior" ? "חוץ" : "פנים"}</span>
                    <span>·</span>
                    <span>{STYLES.find(s => s.id === img.style)?.label}</span>
                    {img.brief && <><span>·</span><span className="truncate">{img.brief}</span></>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <img
            src={lightbox}
            alt="הדמיה"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default DashboardVisualizationStudio;
