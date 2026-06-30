import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Save, Eye, Sparkles } from "lucide-react";
import { ReactNode } from "react";

interface StepNavigationProps {
  /** Optional reassuring line shown above the buttons (e.g. "you can change this later"). */
  reassurance?: ReactNode;
  onNext?: () => void;
  onBack?: () => void;
  onSaveAndContinue?: () => void;
  nextLabel?: string;
  backLabel?: string;
  saveLabel?: string;
  saveIcon?: ReactNode;
  nextDisabled?: boolean;
  saveDisabled?: boolean;
  showBack?: boolean;
  showSave?: boolean;
  showPreview?: boolean;
  isLoading?: boolean;
}

export const StepNavigation = ({
  onNext,
  onBack,
  onSaveAndContinue,
  nextLabel = "הבא",
  backLabel = "חזרה",
  saveLabel = "שמור והמשך",
  saveIcon,
  nextDisabled = false,
  saveDisabled = false,
  showBack = true,
  showSave = true,
  showPreview = true,
  isLoading = false,
  reassurance,
}: StepNavigationProps) => {
  return (
    <>
    {reassurance && (
      <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-6 text-center">
        <Sparkles className="w-3.5 h-3.5 text-primary/60 shrink-0" />
        {reassurance}
      </p>
    )}
    <div className={`flex items-center justify-between gap-3 ${reassurance ? "pt-4 mt-3" : "pt-6 mt-6"} border-t border-border`}>
      {/* Back button */}
      {showBack && onBack ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onBack}
          className="gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          {backLabel}
        </Button>
      ) : (
        <div />
      )}
      
      {/* Right side buttons */}
      <div className="flex items-center gap-3">
        {/* Next button (without saving) */}
        {showPreview && onNext && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onNext}
            disabled={nextDisabled || isLoading}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {nextLabel}
          </Button>
        )}
        
        {/* Save and Continue button */}
        {showSave && onSaveAndContinue && (
          <Button
            type="button"
            variant="hero"
            size="lg"
            onClick={onSaveAndContinue}
            disabled={saveDisabled || isLoading}
            className="gap-2"
          >
            {saveIcon || <Save className="w-4 h-4" />}
            {saveLabel}
          </Button>
        )}
      </div>
    </div>
    </>
  );
};
