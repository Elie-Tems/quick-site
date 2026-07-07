import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAccessibility } from '@/contexts/AccessibilityContext';
import { useLanguage } from '@/contexts/LanguageContext';
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

const AccessibilityWidget = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const {
    settings, 
    setFontSize, 
    toggleHighContrast, 
    toggleHighlightLinks, 
    toggleStopAnimations,
    resetSettings 
  } = useAccessibility();

  const fontSizeLabels = [t('a11y.fontNormal'), t('a11y.fontLarge'), t('a11y.fontXLarge')];

  return (
    <>
      {/* Skip to content link - visible on focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        {t('a11y.skipToContent')}
      </a>

      {/* Accessibility button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 w-12 h-12 rounded-full bg-foreground text-background shadow-lg hover:bg-foreground/85 active:bg-foreground/75 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        aria-label={t('a11y.openMenu')}
        aria-expanded={isOpen}
        aria-controls="accessibility-menu"
      >
        <Accessibility className="w-6 h-6" />
      </button>

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
        aria-label={t('a11y.menu')}
        className={`fixed bottom-0 left-0 right-0 md:left-4 md:bottom-20 md:right-auto md:w-80 z-50 bg-card rounded-t-2xl md:rounded-2xl shadow-card transform transition-transform duration-300 ${
          isOpen ? 'translate-y-0' : 'translate-y-full md:translate-y-[120%]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Accessibility className="w-5 h-5 text-primary" />
            {t('a11y.title')}
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-muted rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label={t('a11y.closeMenu')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Font size */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('a11y.fontSize')}</label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setFontSize(settings.fontSize - 1)}
                disabled={settings.fontSize === 0}
                aria-label={t('a11y.decreaseFont')}
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
                aria-label={t('a11y.increaseFont')}
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
              <span className="font-medium">{t('a11y.highContrast')}</span>
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
              <span className="font-medium">{t('a11y.highlightLinks')}</span>
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
              <span className="font-medium">{t('a11y.stopAnimations')}</span>
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
            {t('a11y.reset')}
          </Button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            {t('a11y.compliance')}
          </p>
        </div>
      </div>
    </>
  );
};

export default AccessibilityWidget;
