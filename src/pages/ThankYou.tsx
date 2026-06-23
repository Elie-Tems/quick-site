import { useNavigate } from "react-router-dom";
import { CheckCircle2, Mail, FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";

const ThankYou = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex items-center justify-center p-4">
      <SEOHead title="תשלום בוצע בהצלחה | סיאנגו" canonical="https://quick-site.app/thank-you" noindex={true} />
      <div className="w-full max-w-2xl space-y-8">
        {/* Success Icon */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">תודה על התשלום!</h1>
            <p className="text-muted-foreground text-lg">
              התשלום התקבל בהצלחה ✓
            </p>
          </div>
        </div>

        {/* Instructions Card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-lg space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">השלבים הבאים</h2>
            </div>
            
            <div className="space-y-4 text-right">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="font-medium text-foreground">
                  1. בדוק את תיבת המייל שלך
                </p>
                <p className="text-sm text-muted-foreground">
                  קיבלת אימייל מiCount עם קבלה על התשלום
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <p className="font-medium text-foreground">
                  2. לחץ על "צפייה בקבלה"
                </p>
                <p className="text-sm text-muted-foreground">
                  באימייל תמצא קישור לצפייה בקבלה המלאה
                </p>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <FileText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">
                      3. העתק את מספר האישור
                    </p>
                    <p className="text-sm text-muted-foreground">
                      מספר האישור נמצא <strong>בחלק התחתון של הקבלה</strong>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      העתק את המספר כדי להזין אותו ולפרסם את האתר
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          
        </div>

        {/* Help Box */}
        <div className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-muted-foreground text-center space-y-2">
          <p className="font-medium text-foreground">
            לא מצאת את האימייל?
          </p>
          <p>
            בדוק בתיקיית הספאם או פנה לתמיכה שלנו
          </p>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;
