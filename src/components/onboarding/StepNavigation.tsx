import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Save, Eye } from "lucide-react";
import { ReactNode } from "react";

interface StepNavigationProps {
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
}: StepNavigationProps) => {
  return (
    <div className="flex items-center justify-between gap-3 pt-6 mt-6 border-t border-border">
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
  );
};
