import { useState, useRef, useEffect, useCallback } from "react";
import { OnboardingData } from "@/pages/Onboarding";
import { Loader2, Wand2, Globe, FileText, Mic, MicOff, Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { StepNavigation } from "./StepNavigation";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

type Method = "text" | "url" | "file" | "voice";

interface GeneratedContent {
  heroTitle: string;
  tagline: string;
  aboutText: string;
  heroBenefits: string;
  promoText: string;
}

const PROGRESS_STEPS = ["מנתח תיאור...", "מייצר כותרות...", "כותב טקסט אודות...", "מסיים פרטים..."];

const METHODS = [
  { id: "text" as Method,  icon: Wand2,     label: "תיאור חופשי",  color: "from-violet-500 to-purple-600" },
  { id: "url" as Method,   icon: Globe,     label: "אתר קיים",     color: "from-sky-500 to-blue-600" },
  { id: "file" as Method,  icon: FileText,  label: "קובץ / PDF",   color: "from-amber-500 to-orange-600" },
  { id: "voice" as Method, icon: Mic,       label: "הקלטה קולית",  color: "from-rose-500 to-pink-600" },
];

const StepContentAI = ({ data, updateData, onNext, onBack }: Props) => {
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cancel the auto-advance timer when the user navigates away manually.
  const safeOnNext = useCallback(() => {
    if (autoAdvanceRef.current) { clearTimeout(autoAdvanceRef.current); autoAdvanceRef.current = null; }
    onNext();
  }, [onNext]);
  useEffect(() => () => { if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current); }, []);

  const [method, setMethod] = useState<Method>("text");
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [generated, setGenerated] = useState<GeneratedContent | null>(
    data.heroTitle ? {
      heroTitle: data.heroTitle || "",
      tagline: data.tagline || "",
      aboutText: data.aboutText || "",
      heroBenefits: data.heroBenefits || "",
      promoText: data.promoText || "",
    } : null
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    };
  }, []);

  const getRawText = (): string => {
    if (method === "text") return textInput;
    if (method === "url") return `אתר קיים: ${urlInput}`;
    if (method === "voice") return transcript;
    return textInput;
  };

  const generate = async (rawText: string) => {
    if (!rawText.trim() || rawText.trim().length < 10) {
      toast({ title: "יש להזין תיאור של לפחות 10 תווים", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setProgressStep(0);
    const interval = setInterval(() => {
      setProgressStep(p => Math.min(p + 1, PROGRESS_STEPS.length - 1));
    }, 900);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-content", {
        body: {
          rawText: rawText.trim(),
          businessName: data.businessName,
          businessCategory: data.businessCategory,
          businessType: data.businessType,
        },
      });
      if (error || !result?.heroTitle) throw new Error(error?.message || "תגובה לא תקינה מהשרת");
      const content: GeneratedContent = {
        heroTitle: result.heroTitle,
        tagline: result.tagline,
        aboutText: result.aboutText,
        heroBenefits: result.heroBenefits,
        promoText: result.promoText,
      };
      setGenerated(content);
      updateData(content);
      setShowSuccess(true);
      autoAdvanceRef.current = setTimeout(() => { autoAdvanceRef.current = null; onNext(); }, 2000);
    } catch {
      toast({ title: "שגיאה ביצירת תכנים", description: "נסו שוב", variant: "destructive" });
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => generate(getRawText());

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setTextInput((reader.result as string).slice(0, 2000)); setMethod("text"); };
    reader.readAsText(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = e => audioChunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        await transcribeAudio(new Blob(audioChunksRef.current, { type: "audio/webm" }));
      };
      mr.start();
      setIsRecording(true);
    } catch {
      toast({ title: "לא ניתן לגשת למיקרופון", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (blob: Blob) => {
    setIsGenerating(true);
    try {
      const ab = await blob.arrayBuffer();
      const bytes = new Uint8Array(ab);
      let binary = "";
      bytes.forEach(b => { binary += String.fromCharCode(b); });
      const base64 = btoa(binary);
      const { data: result, error } = await supabase.functions.invoke("transcribe-products", {
        body: { audio: base64, mimeType: blob.type },
      });
      if (error || !result?.transcript) throw new Error("תמלול נכשל");
      const text = result.transcript as string;
      setTranscript(text);
      await generate(text);
    } catch {
      toast({ title: "שגיאה בתמלול", description: "נסו שוב", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const canGenerate = !isGenerating && (
    (method === "text" && textInput.trim().length >= 10) ||
    (method === "url" && urlInput.trim().length > 5) ||
    (method === "voice" && transcript.length > 10)
  );

  const activeMethod = METHODS.find(m => m.id === method)!;

  return (
    <div className="space-y-5 relative">
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-display font-bold pv-strong">ספרו לנו על העסק שלכם</h2>
        <p className="text-sm pv-muted">נכתוב את כל הטקסטים לאתר - כותרות, אודות, תיאורים</p>
      </div>

      {/* Method selector */}
      <div className="grid grid-cols-4 gap-2">
        {METHODS.map(({ id, icon: Icon, label, color }) => {
          const on = method === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => { setMethod(id); if (id === "file") fileInputRef.current?.click(); }}
              className={`relative flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border text-xs font-medium transition-all overflow-hidden ${
                on ? "border-transparent text-white shadow-lg" : "border-border pv-surface2 pv-muted hover:border-primary/30"
              }`}
            >
              {on && (
                <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-90`} />
              )}
              <Icon className={`w-5 h-5 relative z-10 ${on ? "text-white" : ""}`} />
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </div>

      <input ref={fileInputRef} type="file" accept=".txt,.pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />

      {/* Input area */}
      <AnimatePresence mode="wait">
        {method === "text" && (
          <motion.div key="text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <textarea
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder="ספרו מה מייחד אתכם, למי אתם מיועדים..."
              rows={4}
              maxLength={1000}
              className="w-full rounded-xl border border-border pv-surface2 pv-text placeholder:pv-faint text-sm p-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
            />
            <p className="text-xs pv-faint mt-1 text-left">{textInput.length} / 1000</p>
          </motion.div>
        )}

        {method === "url" && (
          <motion.div key="url" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://my-business.co.il"
              className="w-full h-12 rounded-xl border border-border pv-surface2 pv-text placeholder:pv-faint text-sm px-4 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
              dir="ltr"
            />
            <p className="text-xs pv-faint">נשתמש בתוכן האתר לכתיבת הטקסטים</p>
          </motion.div>
        )}

        {method === "file" && (
          <motion.div key="file" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {textInput ? (
              <div className="rounded-xl border border-border pv-surface2 p-4 text-sm pv-muted line-clamp-4">{textInput}</div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 rounded-xl border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5 text-sm pv-muted flex flex-col items-center gap-2 transition-colors"
              >
                <FileText className="w-8 h-8 text-amber-500/60" />
                <span>לחצו לבחירת קובץ טקסט / PDF</span>
              </button>
            )}
          </motion.div>
        )}

        {method === "voice" && (
          <motion.div key="voice" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-4">
            {transcript ? (
              <div className="w-full rounded-xl border border-border pv-surface2 p-4 text-sm pv-text">{transcript}</div>
            ) : (
              <p className="text-sm pv-muted">{isRecording ? "" : "לחצו על המיקרופון וספרו על העסק שלכם"}</p>
            )}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isGenerating}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all border-2 ${
                isRecording
                  ? "bg-rose-500 border-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/40"
                  : "border-rose-500/50 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
              }`}
            >
              {isRecording ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>
            {isRecording && <p className="text-xs text-rose-400 font-medium">מקליט... לחצו שוב לסיום</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate}
        className={`w-full h-13 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
          canGenerate
            ? `bg-gradient-to-l ${activeMethod.color} text-white shadow-lg hover:opacity-90`
            : "bg-primary/20 text-primary/40 cursor-not-allowed"
        }`}
      >
        {isGenerating ? (
          <><Loader2 className="w-4 h-4 animate-spin" />{PROGRESS_STEPS[progressStep]}</>
        ) : (
          <><Sparkles className="w-4 h-4" />צרו לי את התכנים</>
        )}
      </button>

      {!generated && !isGenerating && (
        <button
          type="button"
          onClick={onNext}
          className="w-full text-center text-xs pv-faint hover:pv-muted underline underline-offset-4 transition-colors"
        >
          דלגו לעכשיו - אפשר למלא ולערוך את כל הטקסטים מאזור הניהול
        </button>
      )}

      <StepNavigation
        onNext={safeOnNext}
        onBack={onBack}
        nextLabel="הבא ←"
        showPreview={false}
        showSave={false}
      />

      {/* Success overlay - shown after generation, auto-advances */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-2xl"
            style={{ background: "var(--pv-surface)" }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-primary flex items-center justify-center shadow-xl shadow-emerald-500/30 mb-5"
            >
              <Check className="w-10 h-10 text-white" />
            </motion.div>
            <motion.h3
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="text-2xl font-display font-bold pv-strong mb-2"
            >
              קיבלנו!
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm pv-muted"
            >
              האתר שלכם מוכן - עוד שניה רואים את זה חי
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StepContentAI;
