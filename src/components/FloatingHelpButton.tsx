import { Link, useLocation } from "react-router-dom";
import { MessageCircleQuestion } from "lucide-react";

/**
 * Floating help/support entry point. Clearly visible (brand color, solid, soft
 * shadow) so people find it, but not intrusive: no pulsing/animation. On hover
 * it gently expands to reveal a "צריכים עזרה?" label.
 */
const FloatingHelpButton = () => {
  const { pathname } = useLocation();
  // Hide on the storefront, the help page itself, previews, and onboarding
  // (the onboarding sidebar has its own publish CTA at the same viewport position).
  if (
    pathname.startsWith("/store") ||
    pathname.startsWith("/help") ||
    pathname.startsWith("/preview") ||
    pathname.startsWith("/onboarding")
  ) {
    return null;
  }

  return (
    <Link
      to="/help"
      title="עזרה ותמיכה"
      aria-label="עזרה ותמיכה"
      className="group fixed bottom-5 right-5 z-40 flex items-center gap-2 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-black/5 pl-3.5 pr-3.5 hover:pr-4 transition-all duration-200 hover:scale-105"
    >
      <MessageCircleQuestion className="w-6 h-6 shrink-0" />
      {/* Label reveals on hover - keeps the resting state a clean circle. */}
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 transition-all duration-200">
        צריכים עזרה?
      </span>
    </Link>
  );
};

export default FloatingHelpButton;
