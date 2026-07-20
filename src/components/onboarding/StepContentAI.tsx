import { useState, useRef, useEffect, useCallback } from "react";
import { OnboardingData } from "@/pages/Onboarding";
import { Loader2, Wand2, Globe, FileText, Mic, MicOff, Check, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { StepNavigation } from "./StepNavigation";
import { useLanguage } from "@/contexts/LanguageContext";

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

const PROGRESS_KEYS = ["ob.ai.p0", "ob.ai.p1", "ob.ai.p2", "ob.ai.p3"];

const METHODS = [
  { id: "text" as Method,  icon: Wand2,     labelKey: "ob.ai.m_text",  color: "from-violet-500 to-purple-600" },
  { id: "url" as Method,   icon: Globe,     labelKey: "ob.ai.m_url",   color: "from-sky-500 to-blue-600" },
  { id: "file" as Method,  icon: FileText,  labelKey: "ob.ai.m_file",  color: "from-amber-500 to-orange-600" },
  { id: "voice" as Method, icon: Mic,       labelKey: "ob.ai.m_voice", color: "from-rose-500 to-pink-600" },
];

const StepContentAI = ({ data, updateData, onNext, onBack }: Props) => {
  const { t } = useLanguage();
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
      toast({ title: t("ob.ai.err_short"), variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    setProgressStep(0);
    const interval = setInterval(() => {
      setProgressStep(p => Math.min(p + 1, PROGRESS_KEYS.length - 1));
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
      toast({ title: t("ob.ai.err_gen"), description: t("ob.ai.retry"), variant: "destructive" });
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
      toast({ title: t("ob.ai.err_mic"), variant: "destructive" });
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
      toast({ title: t("ob.ai.err_transcribe"), description: t("ob.ai.retry"), variant: "destructive" });
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
        <h2 className="text-2xl font-display font-bold pv-strong">{t("ob.ai.title")}</h2>
        <p className="text-sm pv-muted">{t("ob.ai.subtitle")}</p>
      </div>

      {/* Method selector */}
      <div className="grid grid-cols-4 gap-2">
        {METHODS.map(({ id, icon: Icon, labelKey, color }) => {
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
              <span className="relative z-10">{t(labelKey)}</span>
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
              placeholder={t("ob.ai.text_ph")}
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
            <p className="text-xs pv-faint">{t("ob.ai.url_hint")}</p>
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
                <span>{t("ob.ai.file_pick")}</span>
              </button>
            )}
          </motion.div>
        )}

        {method === "voice" && (
          <motion.div key="voice" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-4">
            {transcript ? (
              <div className="w-full rounded-xl border border-border pv-surface2 p-4 text-sm pv-text">{transcript}</div>
            ) : (
              <p className="text-sm pv-muted">{isRecording ? "" : t("ob.ai.voice_prompt")}</p>
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
            {isRecording && <p className="text-xs text-rose-400 font-medium">{t("ob.ai.recording")}</p>}
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
          <><Loader2 className="w-4 h-4 animate-spin" />{t(PROGRESS_KEYS[progressStep])}</>
        ) : (
          <><Sparkles className="w-4 h-4" />{t("ob.ai.generate")}</>
        )}
      </button>

      {!generated && !isGenerating && (
        <button
          type="button"
          onClick={onNext}
          className="w-full text-center text-xs pv-faint hover:pv-muted underline underline-offset-4 transition-colors"
        >
          {t("ob.ai.skip")}
        </button>
      )}

      <StepNavigation
        onNext={safeOnNext}
        onBack={onBack}
        nextLabel={t("ob.common.next")}
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
              {t("ob.ai.success_title")}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-sm pv-muted"
            >
              {t("ob.ai.success_sub")}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StepContentAI;
