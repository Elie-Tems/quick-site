import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Moon, Loader2 } from "lucide-react";
import { useShabbatStatus } from "@/hooks/useShabbatStatus";

/**
 * Gates NEW-SITE creation (registration + onboarding) during Shabbat / Yom Tov,
 * based on the visitor's own location. While open (the usual case) it just
 * renders its children. Published customer stores and the existing dashboard are
 * never wrapped by this — only the signup flow.
 */
const ShabbatGate = ({ children }: { children: ReactNode }) => {
  const { data, isLoading } = useShabbatStatus();

  if (isLoading) {
    return (
      <div className="theme-refined min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data?.closed) return <>{children}</>;

  const label = data.label || "שבת";
  let reopenText = "האתר ייפתח מחדש בצאת השבת";
  if (data.until) {
    const when = new Date(data.until);
    const time = when.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
    const isHoliday = label !== "שבת";
    reopenText = `האתר ייפתח מחדש ב${isHoliday ? "צאת החג" : "צאת השבת"}, בשעה ${time}`;
  }

  return (
    <div className="theme-refined min-h-screen flex items-center justify-center bg-background px-4" dir="rtl">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
          <Moon className="w-10 h-10 text-primary" />
        </div>

        <h1 className="text-3xl font-display font-bold text-foreground mb-3">
          {label === "שבת" ? "שבת שלום 🕯️" : `חג שמח 🕯️`}
        </h1>

        <p className="text-lg text-muted-foreground mb-2">
          אנחנו שומרים {label === "שבת" ? "שבת" : "את החג"}, ולכן הקמת אתר חדש סגורה כרגע.
        </p>
        <p className="text-base text-muted-foreground mb-8">{reopenText}</p>

        <div className="bg-card border border-border rounded-xl p-4 text-sm text-muted-foreground mb-8">
          💡 שימו לב: <strong className="text-foreground">החנויות שכבר פורסמו ממשיכות לעבוד כרגיל</strong> —
          הלקוחות שלכם יכולים להזמין בכל זמן.
        </div>

        <Link
          to="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          חזרה לדף הבית
        </Link>
      </div>
    </div>
  );
};

export default ShabbatGate;
