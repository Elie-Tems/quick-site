import { useState, useRef, useEffect } from "react";
import { OnboardingData } from "@/pages/Onboarding";
import { Loader2, Wand2, Globe, FileText, Mic, MicOff, Check } from "lucide-react";
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

const StepContentAI = ({ data, updateData, onNext, onBack }: Props) => {
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
  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
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

      if (error || !result?.heroTitle) {
        throw new Error(error?.message || "תגובה לא תקינה מהשרת");
      }

      const content: GeneratedContent = {
        heroTitle: result.heroTitle,
        tagline: result.tagline,
        aboutText: result.aboutText,
        heroBenefits: result.heroBenefits,
        promoText: result.promoText,
      };

      setGenerated(content);
      updateData(content);
      toast({ title: "התכנים נוצרו בהצלחה ✨" });
    } catch (err) {
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
    reader.onload = () => {
      const text = reader.result as string;
      setTextInput(text.slice(0, 2000));
      setMethod("text");
    };
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
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await transcribeAudio(blob);
      };

      mr.start();
      setIsRecording(true);
      toast({ title: "מקליט... לחצו שוב כדי לסיים" });
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
      const formData = new FormData();
      formData.append("file", blob, "recording.webm");
      const { data: result, error } = await supabase.functions.invoke("transcribe-products", {
        body: formData,
      });
      if (error || !result?.text) throw new Error("תמלול נכשל");
      const text = result.text as string;
      setTranscript(text);
      toast({ title: "ההקלטה תומללה" });
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

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold pv-strong mb-1">
          ספרו לנו על העסק שלכם
        </h2>
        <p className="text-sm pv-muted">נכתוב עבורכם את כל הטקסטים לאתר אוטומטית</p>
      </div>

      {/* Method selector */}
      <div className="grid grid-cols-4 gap-2">
        {([
          { id: "text", icon: Wand2, label: "תיאור חופשי" },
          { id: "url", icon: Globe, label: "אתר קיים" },
          { id: "file", icon: FileText, label: "קובץ / PDF" },
          { id: "voice", icon: Mic, label: "הקלטה קולית" },
        ] as const).map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => { setMethod(id); if (id === "file") fileInputRef.current?.click(); }}
            className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-medium transition-all ${
              method === id
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border pv-surface2 pv-muted hover:border-primary/30"
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </button>
        ))}
      </div>

      <input ref={fileInputRef} type="file" accept=".txt,.pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />

      {/* Input area */}
      <AnimatePresence mode="wait">
        {method === "text" && (
          <motion.div key="text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <textarea
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder={`ספרו מה העסק שלכם עושה, מה מייחד אתכם, למי אתם מיועדים...\n\nלמשל: "מאפיית בוטיק ביתית בתל אביב. אופים לחם שאור מקמח מקומי, עוגות לאירועים ומאפים טריים כל בוקר. הכל ביתי, בלי חומרים משמרים."`}
              rows={5}
              className="w-full rounded-xl border border-border pv-surface2 pv-text placeholder:pv-faint text-sm p-4 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs pv-faint mt-1 text-left">{textInput.length} / 1000</p>
          </motion.div>
        )}

        {method === "url" && (
          <motion.div key="url" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <input
              type="url"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              placeholder="https://my-business.co.il"
              className="w-full h-12 rounded-xl border border-border pv-surface2 pv-text placeholder:pv-faint text-sm px-4 focus:outline-none focus:ring-2 focus:ring-primary/30"
              dir="ltr"
            />
            <p className="text-xs pv-faint mt-2">נשתמש בתוכן האתר לכתיבת הטקסטים</p>
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
                className="w-full py-8 rounded-xl border-2 border-dashed border-border hover:border-primary/40 text-sm pv-muted flex flex-col items-center gap-2 transition-colors"
              >
                <FileText className="w-8 h-8 pv-faint" />
                לחצו לבחירת קובץ טקסט / PDF
              </button>
            )}
          </motion.div>
        )}

        {method === "voice" && (
          <motion.div key="voice" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-4 py-4">
            {transcript ? (
              <div className="w-full rounded-xl border border-border pv-surface2 p-4 text-sm pv-text">{transcript}</div>
            ) : (
              <p className="text-sm pv-muted">לחצו על המיקרופון וספרו על העסק שלכם</p>
            )}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isGenerating}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all border-2 ${
                isRecording
                  ? "bg-red-500 border-red-500 text-white animate-pulse"
                  : "border-primary bg-primary/10 text-primary hover:bg-primary/20"
              }`}
            >
              {isRecording ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </button>
            {isRecording && <p className="text-xs text-red-500">מקליט... לחצו שוב לסיום</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="w-full h-12 rounded-xl bg-primary text-white font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {PROGRESS_STEPS[progressStep]}
          </>
        ) : generated ? (
          <><Wand2 className="w-4 h-4" /> צרו מחדש</>
        ) : (
          <><Wand2 className="w-4 h-4" /> צרו לי את התכנים</>
        )}
      </button>

      {/* Success state — no content preview, surprise reveal in StepTemplate */}
      {generated && !isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/30 bg-primary/5"
        >
          <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-primary">התכנים מוכנים</p>
            <p className="text-xs pv-muted">תראו אותם באתר בשלב הבא</p>
          </div>
        </motion.div>
      )}

      {/* Reassurance */}
      <p className="text-center text-xs pv-faint" style={{ fontFamily: "Georgia, serif", fontStyle: "italic" }}>
        כל הטקסטים ניתנים לעריכה מלאה מאזור הניהול
      </p>

      <StepNavigation
        onNext={onNext}
        onBack={onBack}
        nextLabel={generated ? "הבא ←" : "דלג"}
        showPreview={false}
        showSave={false}
      />
    </div>
  );
};

export default StepContentAI;
