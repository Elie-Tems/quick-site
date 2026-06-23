import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Accessibility, CheckCircle, Phone, Mail } from 'lucide-react';

const AccessibilityPage = () => {
  const currentDate = new Date().toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const accessibilityFeatures = [
    'תפריט נגישות נגיש מכל עמוד באתר',
    'אפשרות להגדלת והקטנת גודל הטקסט',
    'מצב ניגודיות גבוהה',
    'הדגשת קישורים',
    'עצירת אנימציות ותנועות',
    'ניווט מלא באמצעות מקלדת (TAB)',
    'קישור "דלג לתוכן הראשי"',
    'תגיות ARIA להקראה ע"י קורא מסך',
    'היררכיית כותרות תקינה (H1, H2, H3)',
    'תיאור טקסטואלי (alt) לכל התמונות',
    'ניגודיות צבעים מספקת בכל הממשק',
    'הודעות שגיאה ברורות בטפסים',
    'תמיכה בהגדרת "הפחתת תנועה" של המערכת',
  ];

  return (
    <>
      <Helmet>
        <title>הצהרת נגישות | סיאנגו</title>
        <meta name="description" content="הצהרת נגישות של אתר סיאנגו בהתאם לתקן הישראלי 5568 ותקן WCAG 2.1 AA" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="container py-4">
            <Link to="/" className="inline-flex items-center gap-2 text-primary hover:underline">
              <ArrowRight className="w-4 h-4" />
              חזרה לדף הבית
            </Link>
          </div>
        </header>

        {/* Main content */}
        <main id="main-content" className="container py-12 max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Accessibility className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">הצהרת נגישות</h1>
          </div>

          <div className="prose prose-lg max-w-none space-y-8">
            {/* Introduction */}
            <section>
              <p className="text-muted-foreground leading-relaxed">
                אתר סיאנגו מחויב להנגשת השירותים לאנשים עם מוגבלויות ופועל בהתאם 
                לתקן הישראלי 5568 ולתקן הבינלאומי WCAG 2.1 ברמת AA.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                אנו משקיעים מאמצים רבים על מנת להבטיח שהאתר יהיה נגיש לכלל המשתמשים, 
                כולל אנשים עם מוגבלויות ראייה, שמיעה, מוטוריקה וקוגניציה.
              </p>
            </section>

            {/* Accessibility features */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">התאמות הנגישות באתר</h2>
              <ul className="space-y-2">
                {accessibilityFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Browser compatibility */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">תאימות דפדפנים</h2>
              <p className="text-muted-foreground leading-relaxed">
                האתר נבדק ותואם לדפדפנים הנפוצים כגון Chrome, Firefox, Safari ו-Edge 
                בגרסאותיהם העדכניות. האתר תומך בטכנולוגיות מסייעות כגון קוראי מסך (NVDA, JAWS, VoiceOver).
              </p>
            </section>

            {/* Contact */}
            <section className="bg-muted/50 rounded-xl p-6">
              <h2 className="text-2xl font-semibold text-foreground mb-4">יצירת קשר בנושא נגישות</h2>
              <p className="text-muted-foreground mb-4">
                נתקלתם בבעיית נגישות? נשמח לשמוע ולסייע. ניתן לפנות אלינו בכל אחת מהדרכים הבאות:
              </p>
              <div className="space-y-3">
                
                <a 
                  href="mailto:info@quick-site.app" 
                  className="flex items-center gap-3 text-foreground hover:text-primary transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  <span dir="ltr">info@quick-site.app</span>
                </a>
              </div>
            </section>

            {/* Update date */}
            <section className="border-t border-border pt-6">
              <p className="text-sm text-muted-foreground">
                <strong>תאריך עדכון אחרון:</strong> {currentDate}
              </p>
            </section>
          </div>

          {/* Back button */}
          <div className="mt-8">
            <Button asChild variant="outline">
              <Link to="/">
                <ArrowRight className="w-4 h-4" />
                חזרה לדף הבית
              </Link>
            </Button>
          </div>
        </main>
      </div>
    </>
  );
};

export default AccessibilityPage;
