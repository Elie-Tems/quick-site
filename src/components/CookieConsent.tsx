import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'cookie_consent';
export const COOKIE_CONSENT_EVENT = 'cookie-consent-changed';

// Consent helper used by tracking code: only load non-essential pixels
// (analytics / marketing) after the visitor explicitly accepted. Essential
// cookies always allowed. Israeli Privacy Protection Law / GDPR direction:
// explicit opt-in, with a clear reject option.
export const hasMarketingConsent = (): boolean => {
  try { return localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted'; } catch { return false; }
};

interface CookieConsentProps {
  privacyPolicyPath?: string;
}

const CookieConsent = ({ privacyPolicyPath = '/privacy' }: CookieConsentProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem(COOKIE_CONSENT_KEY); } catch { /* ignore */ }
    if (stored !== 'accepted' && stored !== 'rejected') {
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const choose = (choice: 'accepted' | 'rejected') => {
    try { localStorage.setItem(COOKIE_CONSENT_KEY, choice); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: choice }));
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-label="הודעת עוגיות"
      aria-describedby="cookie-consent-description"
      dir="rtl"
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-0 md:bottom-4 md:right-4 md:left-auto md:max-w-md"
    >
      <div className="bg-card border border-border rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <Cookie className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">שימוש בעוגיות</h3>
            <p id="cookie-consent-description" className="text-sm text-muted-foreground mb-3">
              אנו משתמשים בעוגיות חיוניות לתפעול האתר, ובאישורך גם בעוגיות לניתוח ושיווק.
              באפשרותך לאשר הכל או להסתפק בעוגיות החיוניות בלבד.{' '}
              <Link to={privacyPolicyPath} className="text-primary hover:underline">מדיניות פרטיות</Link>
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => choose('accepted')}>אישור הכל</Button>
              <Button size="sm" variant="outline" onClick={() => choose('rejected')}>רק חיוניות</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
