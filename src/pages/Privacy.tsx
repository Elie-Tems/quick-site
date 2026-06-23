import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Database, Eye, UserCog, Mail } from 'lucide-react';

const PrivacyPage = () => {
  const currentDate = new Date().toLocaleDateString('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <Helmet>
        <title>מדיניות פרטיות | סיאנגו</title>
        <meta name="description" content="מדיניות הפרטיות של סיאנגו - איסוף מידע, שימוש במידע וזכויות המשתמש" />
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
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">מדיניות פרטיות</h1>
          </div>

          <div className="prose prose-lg max-w-none space-y-8">
            {/* Introduction */}
            <section>
              <p className="text-muted-foreground leading-relaxed">
                פלטפורמת סיאנגו (Siango) מופעלת על ידי <strong>ארפור טכנולוגיות בע"מ</strong>, ח.פ. 517331708 (להלן: "החברה").
                החברה מחויבת להגנה על פרטיות המשתמשים שלה. מדיניות פרטיות זו מסבירה
                אילו נתונים אנו אוספים, כיצד אנו משתמשים בהם, ומהן זכויותיכם בנוגע למידע שלכם.
                מדיניות זו משלימה את <Link to="/terms" className="text-primary hover:underline">תנאי השימוש</Link> (פרק 2),
                ומיושמת בהתאם לחוק הגנת הפרטיות, התשמ"א-1981 ותיקון 13 לו.
              </p>
            </section>

            {/* Data collection */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-semibold text-foreground">מידע שאנו אוספים</h2>
              </div>
              <p className="text-muted-foreground mb-4">אנו אוספים את סוגי המידע הבאים:</p>
              <ul className="space-y-2 text-muted-foreground">
                <li><strong>פרטים אישיים:</strong> שם מלא, כתובת אימייל, מספר טלפון - כאשר אתם נרשמים לשירות או ממלאים טופס יצירת קשר.</li>
                <li><strong>פרטי עסק:</strong> שם העסק, לוגו, פרטי מוצרים ושירותים - לצורך הקמת האתר העסקי שלכם.</li>
                <li><strong>נתוני שימוש:</strong> מידע על אופן השימוש באתר, עמודים שנצפו, זמני גלישה.</li>
                <li><strong>עוגיות (Cookies):</strong> קבצים קטנים הנשמרים בדפדפן לשיפור חוויית המשתמש.</li>
                <li><strong>נתוני הזמנות:</strong> פרטי לקוחות שביצעו הזמנות דרך האתרים העסקיים.</li>
              </ul>
            </section>

            {/* Purpose of data collection */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-semibold text-foreground">מטרות השימוש במידע</h2>
              </div>
              <p className="text-muted-foreground mb-4">אנו משתמשים במידע שנאסף למטרות הבאות:</p>
              <ul className="space-y-2 text-muted-foreground">
                <li><strong>אספקת השירות:</strong> הקמה, תפעול ותחזוקה של האתרים העסקיים.</li>
                <li><strong>תקשורת:</strong> שליחת עדכונים, התראות על הזמנות, ותמיכה טכנית.</li>
                <li><strong>שיפור השירות:</strong> ניתוח שימוש לצורך שיפור הפלטפורמה.</li>
                <li><strong>שיווק:</strong> שליחת מידע על מבצעים ושירותים חדשים (בהסכמתכם בלבד).</li>
                <li><strong>עמידה בחוק:</strong> ציות לדרישות חוקיות ורגולטוריות.</li>
              </ul>
            </section>

            {/* Third parties */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">שיתוף מידע עם צדדים שלישיים</h2>
              <p className="text-muted-foreground mb-4">
                אנו עשויים לשתף מידע עם הגורמים הבאים, תוך שמירה על פרטיותכם:
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li><strong>Google Analytics:</strong> לניתוח תעבורת האתר ודפוסי שימוש.</li>
                <li><strong>ספקי תשלום:</strong> לעיבוד תשלומים מאובטח (כגון iCredit, Cardcom, PayPal).</li>
                <li><strong>WhatsApp:</strong> אם הופעלה אינטגרציה עם וואטסאפ עסקי.</li>
                <li><strong>ספקי אירוח:</strong> לאחסון ואבטחת הנתונים.</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                אנו לא מוכרים או משכירים את המידע האישי שלכם לצדדים שלישיים.
              </p>
            </section>

            {/* Data storage */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">אחסון ואבטחת מידע</h2>
              <p className="text-muted-foreground leading-relaxed">
                המידע מאוחסן בשרתים מאובטחים. אנו מיישמים אמצעי אבטחה מתקדמים 
                כגון הצפנת SSL, גיבויים קבועים, ובקרות גישה קפדניות. 
                המידע נשמר כל עוד החשבון שלכם פעיל, או לפי דרישות החוק.
              </p>
            </section>

            {/* User rights */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <UserCog className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-semibold text-foreground">זכויותיכם</h2>
              </div>
              <p className="text-muted-foreground mb-4">על פי חוק הגנת הפרטיות, עומדות לכם הזכויות הבאות:</p>
              <ul className="space-y-2 text-muted-foreground">
                <li><strong>זכות עיון:</strong> לבקש לראות את המידע שנאסף עליכם.</li>
                <li><strong>זכות תיקון:</strong> לבקש תיקון מידע שגוי או לא מעודכן.</li>
                <li><strong>זכות מחיקה:</strong> לבקש מחיקת המידע שלכם מהמערכת.</li>
                <li><strong>זכות התנגדות:</strong> להתנגד לעיבוד המידע למטרות שיווק.</li>
              </ul>
            </section>

            {/* Contact */}
            <section className="bg-muted/50 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-semibold text-foreground">יצירת קשר</h2>
              </div>
              <p className="text-muted-foreground mb-4">
                לכל שאלה בנוגע למדיניות הפרטיות או לבקשות הקשורות למידע שלכם, ניתן לפנות אלינו:
              </p>
              <a 
                href="mailto:contact@quick-site.app" 
                className="text-primary hover:underline font-medium"
                dir="ltr"
              >
                contact@quick-site.app
              </a>
              <p className="text-muted-foreground mt-4">
                אנו מתחייבים לטפל בפנייתכם תוך 30 יום.
              </p>
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

export default PrivacyPage;
