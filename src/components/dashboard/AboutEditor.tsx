import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface AboutEditorProps {
  businessId: string;
  businessName: string;
  businessCategory?: string;
  currentAboutText?: string;
  onSave: (aboutText: string) => void;
  /** אם true, לא מבצעים עדכון ישירות ב-DB אלא רק קוראים ל-onSave */
  disableInternalSave?: boolean;
}

// Extend window for SpeechRecognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

type SpeechRecognitionType = {
  new (): SpeechRecognitionInstance;
};

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

const AboutEditor = ({
  businessId,
  businessName,
  businessCategory,
  currentAboutText,
  onSave,
  disableInternalSave,
}: AboutEditorProps) => {
  const [rawText, setRawText] = useState("");
  const [generatedText, setGeneratedText] = useState(currentAboutText || "");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(!currentAboutText);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [writingStyle, setWritingStyle] = useState<"friendly" | "professional" | "formal">("friendly");

  const writingStyles = {
    friendly: { label: "ידידותי 😊", description: "טון חם ונגיש, כמו שיחה עם חבר" },
    professional: { label: "מקצועי 💼", description: "מאוזן ומכובד, מדגיש מומחיות" },
    formal: { label: "רשמי 🎩", description: "פורמלי ויוקרתי, לעסקים בכירים" },
  };
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  // Check for Speech Recognition support
  const getSpeechRecognition = useCallback((): SpeechRecognitionType | null => {
    const win = window as any;
    return win.SpeechRecognition || win.webkitSpeechRecognition || null;
  }, []);

  const isSpeechRecognitionSupported = getSpeechRecognition() !== null;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Start real-time speech recognition
  const startRecording = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();
    
    if (!SpeechRecognition) {
      toast({
        title: "תמלול קולי לא נתמך",
        description: "הדפדפן שלך לא תומך בתמלול קולי. נסה Chrome או Edge",
        variant: "destructive",
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "he-IL"; // Hebrew

      recognition.onstart = () => {
        setIsRecording(true);
        setIsTranscribing(true);
        setRecordingDuration(0);
        
        // Start duration timer
        recordingTimerRef.current = window.setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);

        toast({
          title: "מקשיב... 🎙️",
          description: "דבר על העסק שלך - הטקסט יופיע בזמן אמת",
        });
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interim = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
          } else {
            interim += transcript;
          }
        }

        if (finalTranscript) {
          setRawText(prev => {
            const next = (prev + finalTranscript).trimStart();
            if (disableInternalSave) {
              onSave(next + (interim ? ` ${interim}` : ""));
            }
            return next;
          });
        } else if (disableInternalSave && interim) {
          // עדכון תצוגה מקדימה גם במהלך תמלול ביניים
          onSave((rawText + ` ${interim}`).trimStart());
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        
        if (event.error === "not-allowed") {
          toast({
            title: "אין גישה למיקרופון",
            description: "אנא אשר גישה למיקרופון בדפדפן",
            variant: "destructive",
          });
        } else if (event.error !== "aborted") {
          toast({
            title: "שגיאה בתמלול",
            description: "נסה שוב או כתוב ידנית",
            variant: "destructive",
          });
        }
        
        stopRecording();
      };

      recognition.onend = () => {
        setIsRecording(false);
        setIsTranscribing(false);
        setInterimTranscript("");
        
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      toast({
        title: "לא ניתן להתחיל הקלטה",
        description: "נסה שוב או כתוב ידנית",
        variant: "destructive",
      });
    }
  }, [getSpeechRecognition]);

  // Stop speech recognition
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    setIsRecording(false);
    setIsTranscribing(false);
    setInterimTranscript("");

    if (rawText.trim()) {
      toast({
        title: "תמלול הושלם! ✨",
        description: "תוכלו לערוך את הטקסט וללחוץ על יצירת טקסט מקצועי",
      });
    }
  }, [rawText]);

  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Improve existing text using AI
  const improveAboutText = async () => {
    const textToImprove = generatedText || rawText;
    
    if (!textToImprove.trim() || textToImprove.trim().length < 10) {
      toast({
        title: "טקסט קצר מדי",
        description: "כתבו לפחות כמה מילים לשיפור",
        variant: "destructive",
      });
      return;
    }

    setIsImproving(true);

    try {
      const { data, error } = await supabase.functions.invoke('improve-about-text', {
        body: {
          currentText: textToImprove.trim(),
          businessName,
          businessCategory,
        },
      });

      if (error) throw error;

      if (data?.improvedText) {
        setGeneratedText(data.improvedText);
        setRawText(data.improvedText);
        if (disableInternalSave) {
          onSave(data.improvedText);
        }
        toast({
          title: "הטקסט שופר בהצלחה! ✨",
          description: "תוכלו לערוך אותו לפני השמירה",
        });
      }
    } catch (error: any) {
      console.error("Failed to improve about text:", error);
      toast({
        title: "שגיאה בשיפור הטקסט",
        description: error.message || "נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    } finally {
      setIsImproving(false);
    }
  };

  // Generate professional about text using AI
  const generateAboutText = async () => {
    if (!rawText.trim() || rawText.trim().length < 10) {
      toast({
        title: "טקסט קצר מדי",
        description: "כתבו לפחות כמה מילים על העסק שלך",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-about-text', {
        body: {
          rawText: rawText.trim(),
          businessName,
          businessCategory,
          writingStyle,
        },
      });

      if (error) throw error;

      if (data?.aboutText) {
        setGeneratedText(data.aboutText);
        if (disableInternalSave) {
          onSave(data.aboutText);
        }
        toast({
          title: "הטקסט נוצר בהצלחה! ✨",
          description: "תוכלו לערוך אותו לפני השמירה",
        });
      }
    } catch (error: any) {
      console.error("Failed to generate about text:", error);
      toast({
        title: "שגיאה ביצירת הטקסט",
        description: error.message || "נסה שוב מאוחר יותר",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Save the about text
  const handleSave = async () => {
    if (!generatedText.trim()) {
      toast({
        title: "אין טקסט לשמירה",
        description: "צרו טקסט אודות קודם",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      if (!disableInternalSave) {
        const { error } = await supabase
          .from('businesses')
          .update({ about_text: generatedText.trim() })
          .eq('id', businessId);

        if (error) throw error;
      }

      onSave(generatedText.trim());
      setIsEditing(false);
      
      toast({
        title: "נשמר בהצלחה! 🎉",
        description: "טקסט האודות עודכן" + (disableInternalSave ? "" : " בחנות"),
      });
    } catch (error: any) {
      console.error("Failed to save about text:", error);
      toast({
        title: "שגיאה בשמירה",
        description: error.message || "נסה שוב",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Step 1: tell us about the business (type or dictate) + style + generate */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>ספר לנו על העסק שלך</Label>
          {isSpeechRecognitionSupported && (
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              className="gap-2"
            >
              {isRecording ? <><MicOff className="h-4 w-4" /> עצור ({formatDuration(recordingDuration)})</> : <><Mic className="h-4 w-4" /> דבר</>}
            </Button>
          )}
        </div>

        {isRecording && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
              </span>
              מקליט ומתמלל בזמן אמת...
            </div>
            <Progress value={(recordingDuration % 60) * 1.67} className="h-1" />
          </div>
        )}

        <Textarea
          value={rawText + (interimTranscript ? ` ${interimTranscript}` : "")}
          onChange={(e) => { if (!isRecording) setRawText(e.target.value); }}
          placeholder="כתבו בקצרה - מה אתם עושים, מה מייחד אתכם, למה לקוחות בוחרים בכם... או לחץ על המיקרופון ודבר 🎙️"
          rows={4}
          className={isRecording ? "border-destructive ring-1 ring-destructive/50" : ""}
          readOnly={isRecording}
        />

        {/* Writing style */}
        <div className="flex flex-wrap gap-2">
          {(Object.entries(writingStyles) as [keyof typeof writingStyles, typeof writingStyles.friendly][]).map(([key, style]) => (
            <button
              key={key}
              type="button"
              onClick={() => setWritingStyle(key)}
              className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
                writingStyle === key ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {style.label}
            </button>
          ))}
        </div>

        <Button type="button" onClick={generateAboutText} disabled={isGenerating || !rawText.trim()} className="w-full gap-2">
          {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> יוצר טקסט...</> : <><Wand2 className="h-4 w-4" /> צור טקסט עם AI</>}
        </Button>
      </div>

      {/* Step 2: the generated text - editable, with "improve again" */}
      {generatedText && (
        <div className="space-y-2 pt-4 border-t border-border">
          <Label>הטקסט שנוצר (אפשר לערוך)</Label>
          <Textarea
            value={generatedText}
            onChange={(e) => {
              const next = e.target.value;
              setGeneratedText(next);
              if (disableInternalSave) onSave(next);
            }}
            rows={5}
          />
          <Button type="button" variant="outline" size="sm" onClick={improveAboutText} disabled={isImproving} className="gap-2">
            {isImproving ? <><Loader2 className="h-4 w-4 animate-spin" /> משפר...</> : <><Wand2 className="h-4 w-4" /> שפר שוב</>}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AboutEditor;
