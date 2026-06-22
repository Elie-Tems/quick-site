import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cookie_consent_accepted';

interface CookieConsentProps {
  privacyPolicyPath?: string;
}

const CookieConsent = ({ privacyPolicyPath = '/privacy' }: CookieConsentProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if consent was already given
    const hasConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasConsent) {
      // Delay showing the banner slightly for better UX
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
    setIsVisible(false);
  };

  const handleClose = () => {
    // Just hide without saving - will show again on next visit
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-label="הודעת עוגיות"
      aria-describedby="cookie-consent-description"
      className="fixed bottom-0 left-0 right-0 z-40 p-4 md:p-0 md:bottom-4 md:left-4 md:right-auto md:max-w-md"
    >
      <div className="bg-card border border-border rounded-xl shadow-card p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Cookie className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">שימוש בעוגיות</h3>
            <p id="cookie-consent-description" className="text-sm text-muted-foreground mb-3">
              אנו משתמשים בעוגיות כדי לשפר את חוויית הגלישה שלך. 
              המשך גלישה באתר מהווה הסכמה לשימוש בעוגיות.{' '}
              <Link 
                to={privacyPolicyPath} 
                className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring rounded"
              >
                מדיניות פרטיות
              </Link>
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleAccept}>
                אישור
              </Button>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="סגור הודעת עוגיות"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
