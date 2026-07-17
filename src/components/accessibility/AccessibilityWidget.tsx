import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { 
  Accessibility, 
  X, 
  Plus, 
  Minus, 
  Contrast, 
  Link2, 
  PauseCircle,
  RotateCcw,
  Check
} from 'lucide-react';

const DISMISSED_KEY = "accessibility_widget_dismissed";

const AccessibilityWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "1");

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  if (dismissed) return null;
  const { 
    settings, 
    setFontSize, 
    toggleHighContrast, 
    toggleHighlightLinks, 
    toggleStopAnimations,
    resetSettings 
  } = useAccessibility();

  const fontSizeLabels = ['רגיל', 'גדול', 'גדול מאוד'];

  return (
    <>
      {/* Skip to content link - visible on focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        דלג לתוכן הראשי
      </a>

      {/* Accessibility button + dismiss X */}
      <div className="fixed bottom-4 left-4 z-50 group/acc">
        <button
          onClick={() => setIsOpen(true)}
          className="w-12 h-12 rounded-full bg-foreground text-background shadow-lg hover:bg-foreground/85 active:bg-foreground/75 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="פתח תפריט נגישות"
          aria-expanded={isOpen}
          aria-controls="accessibility-menu"
        >
          <Accessibility className="w-6 h-6" />
        </button>
        <button
          onClick={handleDismiss}
          aria-label="הסתר כפתור נגישות"
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-muted text-muted-foreground border border-border flex items-center justify-center opacity-0 group-hover/acc:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Accessibility menu overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-foreground/50 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Accessibility menu panel */}
      <div
        id="accessibility-menu"
        role="dialog"
        aria-modal="true"
        aria-label="תפריט נגישות"
        className={`fixed bottom-0 left-0 right-0 md:left-4 md:bottom-20 md:right-auto md:w-80 z-50 bg-card rounded-t-2xl md:rounded-2xl shadow-card transform transition-transform duration-300 ${
          isOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-[120%]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Accessibility className="w-5 h-5 text-primary" />
            הגדרות נגישות
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-muted rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="סגור תפריט נגישות"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Font size */}
          <div className="space-y-2">
            <label className="text-sm font-medium">גודל טקסט</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setFontSize(settings.fontSize - 1)}
                disabled={settings.fontSize === 0}
                aria-label="הקטן גודל טקסט"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="flex-1 text-center text-sm font-medium">
                {fontSizeLabels[settings.fontSize]}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setFontSize(settings.fontSize + 1)}
                disabled={settings.fontSize === 2}
                aria-label="הגדל גודל טקסט"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* High contrast */}
          <button
            onClick={toggleHighContrast}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            aria-pressed={settings.highContrast}
          >
            <span className="flex items-center gap-3">
              <Contrast className="w-5 h-5 text-primary" />
              <span className="font-medium">ניגודיות גבוהה</span>
            </span>
            {settings.highContrast && <Check className="w-5 h-5 text-primary" />}
          </button>

          {/* Highlight links */}
          <button
            onClick={toggleHighlightLinks}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            aria-pressed={settings.highlightLinks}
          >
            <span className="flex items-center gap-3">
              <Link2 className="w-5 h-5 text-primary" />
              <span className="font-medium">הדגשת קישורים</span>
            </span>
            {settings.highlightLinks && <Check className="w-5 h-5 text-primary" />}
          </button>

          {/* Stop animations */}
          <button
            onClick={toggleStopAnimations}
            className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            aria-pressed={settings.stopAnimations}
          >
            <span className="flex items-center gap-3">
              <PauseCircle className="w-5 h-5 text-primary" />
              <span className="font-medium">עצירת אנימציות</span>
            </span>
            {settings.stopAnimations && <Check className="w-5 h-5 text-primary" />}
          </button>

          {/* Reset */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={resetSettings}
          >
            <RotateCcw className="w-4 h-4" />
            איפוס הגדרות
          </Button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            אתר זה עומד בתקן נגישות ישראלי 5568 (WCAG 2.1 AA)
          </p>
        </div>
      </div>
    </>
  );
};

export default AccessibilityWidget;
