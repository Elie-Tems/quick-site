import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

// Speech Recognition Types
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

interface SpeechToTextProps {
  onTranscriptChange?: (text: string) => void;
  initialText?: string;
  language?: string;
  placeholder?: string;
  readOnly?: boolean;
  showTimer?: boolean;
  className?: string;
}

const SpeechToText = ({
  onTranscriptChange,
  initialText = "",
  language = "he-IL",
  placeholder = "דבר והמילים יופיעו כאן...",
  readOnly = false,
  showTimer = true,
  className = "",
}: SpeechToTextProps) => {
  const [text, setText] = useState(initialText);
  const [isRecording, setIsRecording] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [recordingDuration, setRecordingDuration] = useState(0);
  
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

  // Update parent component when text changes
  useEffect(() => {
    if (onTranscriptChange) {
      onTranscriptChange(text);
    }
  }, [text, onTranscriptChange]);

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
      recognition.lang = language;

      recognition.onstart = () => {
        setIsRecording(true);
        setRecordingDuration(0);
        
        // Start duration timer
        recordingTimerRef.current = window.setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);

        toast({
          title: "מקשיב... 🎙️",
          description: "דבר - הטקסט יופיע בזמן אמת",
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
          setText(prev => (prev + finalTranscript).trimStart());
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
            description: "נסה שוב",
            variant: "destructive",
          });
        }
        
        stopRecording();
      };

      recognition.onend = () => {
        setIsRecording(false);
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
        description: "נסה שוב",
        variant: "destructive",
      });
    }
  }, [getSpeechRecognition, language]);

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
    setInterimTranscript("");

    if (text.trim()) {
      toast({
        title: "תמלול הושלם! ✨",
        description: "הטקסט נשמר",
      });
    }
  }, [text]);

  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Clear text
  const clearText = () => {
    setText("");
    setInterimTranscript("");
    if (onTranscriptChange) {
      onTranscriptChange("");
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Recording controls */}
      <div className="flex items-center justify-between">
        <Label>תמלול קולי</Label>
        {isSpeechRecognitionSupported && !readOnly && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              className="gap-2"
            >
              {isRecording ? (
                <>
                  <MicOff className="h-4 w-4" />
                  עצור {showTimer && `(${formatDuration(recordingDuration)})`}
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  התחל הקלטה
                </>
              )}
            </Button>
            
            {text.trim() && !isRecording && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearText}
              >
                נקה
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
            </span>
            מקליט ומתמלל בזמן אמת...
          </div>
          {showTimer && <Progress value={(recordingDuration % 60) * 1.67} className="h-1" />}
        </div>
      )}
      
      {/* Text area */}
      <Textarea
        value={text + (interimTranscript ? ` ${interimTranscript}` : "")}
        onChange={(e) => {
          if (!isRecording && !readOnly) {
            const next = e.target.value;
            setText(next);
            if (onTranscriptChange) {
              onTranscriptChange(next);
            }
          }
        }}
        placeholder={placeholder}
        rows={4}
        className={isRecording ? "border-destructive ring-1 ring-destructive/50" : ""}
        readOnly={isRecording || readOnly}
      />
      
      {/* Character count */}
      <div className="text-xs text-muted-foreground text-left">
        {text.trim().length} תווים
      </div>

      {/* Browser support notice */}
      {!isSpeechRecognitionSupported && (
        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
          ⚠️ תמלול קולי נתמך רק בדפדפני Chrome ו-Edge
        </div>
      )}
    </div>
  );
};

export default SpeechToText;
