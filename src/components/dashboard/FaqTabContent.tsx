import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, GripVertical, Wand2, Mic, MicOff, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BusinessType } from "@/lib/businessModules";

interface FaqItem {
  question: string;
  answer: string;
}

interface Props {
  businessId?: string;
  businessType?: BusinessType;
  businessName?: string;
  aboutText?: string;
}

type RecordState = "idle" | "recording" | "processing";

const FaqTabContent = ({ businessId, businessType, businessName, aboutText }: Props) => {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [recordState, setRecordState] = useState<RecordState>("idle");
  const [loaded, setLoaded] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!businessId) return;
    supabase
      .from("businesses")
      .select("faq_items")
      .eq("id", businessId)
      .single()
      .then(({ data }) => {
        if (data?.faq_items && Array.isArray(data.faq_items)) {
          setItems(data.faq_items as FaqItem[]);
        }
        setLoaded(true);
      });
  }, [businessId]);

  const update = (i: number, field: keyof FaqItem, value: string) => {
    const next = [...items];
    next[i] = { ...next[i], [field]: value };
    setItems(next);
  };

  const remove = (i: number) => setItems(items.filter((_, j) => j !== i));
  const add = () => setItems([...items, { question: "", answer: "" }]);

  const save = async () => {
    if (!businessId) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("businesses")
      .update({ faq_items: items } as any)
      .eq("id", businessId);
    setIsSaving(false);
    if (error) toast.error("שגיאה בשמירה");
    else toast.success("שאלות נפוצות נשמרו");
  };

  const generateWithAI = async () => {
    if (!businessId) return;
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-faq`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ businessName, businessType, aboutText }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (Array.isArray(data.items) && data.items.length > 0) {
        setItems(prev => [...prev, ...data.items]);
        toast.success(`נוצרו ${data.items.length} שאלות — ערכו לפי הצורך`);
      }
    } catch (e: any) {
      toast.error("שגיאה ביצירת שאלות");
    } finally {
      setIsGenerating(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach(t => t.stop()); processRecording(); };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecordState("recording");
    } catch {
      toast.error("לא ניתן לגשת למיקרופון");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecordState("processing");
  };

  const processRecording = async () => {
    try {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      bytes.forEach(b => { binary += String.fromCharCode(b); });
      const base64 = btoa(binary);

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-faq`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ audio: base64, mimeType: "audio/webm" }),
        }
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (Array.isArray(data.items) && data.items.length > 0) {
        setItems(prev => [...prev, ...data.items]);
        toast.success(`חולצו ${data.items.length} שאלות מההקלטה`);
      } else {
        toast.error("לא זוהו שאלות בהקלטה — נסו שוב");
      }
    } catch (e: any) {
      toast.error("שגיאה בעיבוד ההקלטה");
    } finally {
      setRecordState("idle");
    }
  };

  if (!loaded) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">שאלות נפוצות</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              הוסיפו שאלות ותשובות שמופיעות בעמוד החנות
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {/* AI generate */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateWithAI}
              disabled={isGenerating || recordState !== "idle"}
              className="gap-1.5"
            >
              {isGenerating
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Wand2 className="h-3.5 w-3.5" />}
              {isGenerating ? "יוצר..." : "AI"}
            </Button>

            {/* Voice record */}
            <Button
              type="button"
              variant={recordState === "recording" ? "destructive" : "outline"}
              size="sm"
              onClick={recordState === "recording" ? stopRecording : startRecording}
              disabled={isGenerating || recordState === "processing"}
              className="gap-1.5"
            >
              {recordState === "processing"
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : recordState === "recording"
                  ? <MicOff className="h-3.5 w-3.5" />
                  : <Mic className="h-3.5 w-3.5" />}
              {recordState === "processing"
                ? "מעבד..."
                : recordState === "recording"
                  ? "עצור"
                  : "הקלטה"}
            </Button>
          </div>
        </div>

        {/* Recording indicator */}
        {recordState === "recording" && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-2.5 text-sm text-destructive">
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            מקליט... דברו על השאלות הנפוצות של הלקוחות שלכם. לחצו "עצור" כשסיימתם.
          </div>
        )}

        {/* Q&A list */}
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  value={item.question}
                  onChange={e => update(i, "question", e.target.value)}
                  placeholder="מה השאלה?"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(i)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              <Textarea
                value={item.answer}
                onChange={e => update(i, "answer", e.target.value)}
                placeholder="מה התשובה?"
                rows={2}
              />
            </div>
          ))}

          {items.length === 0 && recordState === "idle" && !isGenerating && (
            <div className="rounded-xl border-2 border-dashed border-border p-6 space-y-2 text-center">
              <p className="text-sm font-medium text-foreground">שלוש דרכים להוסיף שאלות:</p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>✦ לחצו <strong>AI</strong> — המערכת מציעה שאלות נפוצות לסוג העסק</p>
                <p>✦ לחצו <strong>הקלטה</strong> — ספרו מה שואלים אתכם, ה-AI יחלץ שאלות</p>
                <p>✦ לחצו <strong>הוסיפו שאלה</strong> — כתיבה ידנית</p>
              </div>
            </div>
          )}

          {items.length > 0 && items.length < 20 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={add}
            >
              <Plus className="h-3.5 w-3.5" /> הוסיפו שאלה
            </Button>
          )}

          {items.length === 0 && (
            <button
              type="button"
              onClick={add}
              className="w-full py-3 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary/40 transition-colors"
            >
              + הוסיפו שאלה ידנית
            </button>
          )}
        </div>
      </div>

      <Button onClick={save} disabled={isSaving || items.length === 0} className="w-full">
        {isSaving
          ? <Loader2 className="h-4 w-4 animate-spin ml-2" />
          : <Check className="h-4 w-4 ml-2" />}
        שמירה ({items.length} שאלות)
      </Button>
    </div>
  );
};

export default FaqTabContent;
