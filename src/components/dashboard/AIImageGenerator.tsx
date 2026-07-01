import { useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAICredits } from "@/hooks/useAIImageEngine";

interface AIImageGeneratorProps {
  businessId: string;
  onImageGenerated: (imageUrl: string) => void;
  productName?: string;
  productDescription?: string;
}

export const AIImageGenerator = ({
  businessId,
  onImageGenerated,
  productName = "",
  productDescription = "",
}: AIImageGeneratorProps) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { data: credits } = useAICredits(businessId);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("נא להזין תיאור לתמונה");
      return;
    }

    if (!credits || credits.credits_remaining < 1) {
      toast.error("אין לך מספיק קרדיטים. רכוש קרדיטים נוספים.");
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-product-image", {
        body: {
          productName: productName || "מוצר",
          productDescription: productDescription || "",
          businessId,
          customPrompt: prompt,
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        onImageGenerated(data.imageUrl);
        toast.success("התמונה נוצרה בהצלחה! ✨");
        setPrompt("");
      } else {
        throw new Error("לא התקבלה תמונה מהשרת");
      }
    } catch (err) {
      console.error("Error generating AI image:", err);
      toast.error(err instanceof Error ? err.message : "שגיאה ביצירת התמונה");
    } finally {
      setIsGenerating(false);
    }
  };

  const suggestedPrompts = [
    "רקע לבן נקי, תאורה מקצועית",
    "רקע צבעוני מודרני, סגנון מינימליסטי",
    "רקע טבעי, תאורה רכה",
    "רקע עם צללים עדינים, סגנון אלגנטי",
  ];

  return (
    <div className="space-y-4 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
      <div className="flex items-center gap-2">
        <Wand2 className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">יצירת תמונה באמצעות AI</h3>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ai-prompt" className="!text-foreground">
          תאר את התמונה שאתה רוצה ליצור
        </Label>
        <Textarea
          id="ai-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="לדוגמה: צור תמונת מוצר מקצועית עם רקע לבן נקי ותאורה רכה..."
          rows={3}
          disabled={isGenerating}
        />
      </div>

      {/* <div className="space-y-2">
        <p className="text-xs text-muted-foreground">הצעות מהירות:</p>
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setPrompt(suggestion)}
              disabled={isGenerating}
              className="text-xs px-3 py-1.5 bg-background hover:bg-primary/10 border border-border rounded-full transition-colors disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div> */}

      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-muted-foreground">
          {credits ? (
            <span>
              קרדיטים זמינים: <span className="font-semibold text-primary">{credits.credits_remaining}</span>
            </span>
          ) : (
            <span>טוען קרדיטים...</span>
          )}
        </div>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              מייצר תמונה...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              צור תמונה (1 קרדיט)
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        💡 ככל שהתיאור מפורט יותר, התמונה תהיה מדויקת יותר
      </p>
    </div>
  );
};
