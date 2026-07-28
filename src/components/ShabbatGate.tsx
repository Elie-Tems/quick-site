import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Loader2 } from "lucide-react";
import { useShabbatStatus, type ShabbatStatus } from "@/hooks/useShabbatStatus";

/**
 * Gates NEW-SITE creation (registration + onboarding) during Shabbat / Yom Tov,
 * based on the visitor's own location. While open (the usual case) it just
 * renders its children. Published customer stores and the existing dashboard are
 * never wrapped by this - only the signup flow.
 *
 * The open/closed decision LATCHES on the first successful check and is then
 * ignored for the rest of this mount. useShabbatStatus has refetchOnWindowFocus
 * enabled, and mobile browsers fire focus/visibility changes constantly (screen
 * lock/unlock, app switch, keyboard open) - each refetch briefly flips
 * isLoading back to true with data undefined. Reacting to that here used to
 * unmount {children} and remount it on every such blip, wiping the ENTIRE
 * onboarding wizard's in-progress state (confirmed live: a user's form data was
 * reset mid-flow on every focus change on mobile). One decision per page load
 * is correct anyway - Shabbat status has no reason to change mid-session.
 */
const ShabbatGate = ({ children }: { children: ReactNode }) => {
  const { data, isLoading } = useShabbatStatus();
  const [decided, setDecided] = useState<ShabbatStatus | null>(null);

  useEffect(() => {
    if (decided === null && !isLoading && data) setDecided(data);
  }, [isLoading, data, decided]);

  if (decided === null) {
    return (
      <div className="theme-refined min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!decided.closed) return <>{children}</>;

  const label = decided.label || "שבת";
  let reopenText = "האתר ייפתח מחדש בצאת השבת";
  if (decided.until) {
    const when = new Date(decided.until);
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
          💡 שימו לב: <strong className="text-foreground">החנויות שכבר פורסמו ממשיכות לעבוד כרגיל</strong> -
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
