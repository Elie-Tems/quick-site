import { Link, useLocation } from "react-router-dom";
import { HelpCircle } from "lucide-react";

/**
 * Discreet help/support entry point. Intentionally low-key: a small, semi-
 * transparent icon that brightens on hover - present when needed, but never
 * intrusive (no label, no pop-in animation, no pulsing).
 */
const FloatingHelpButton = () => {
  const { pathname } = useLocation();
  // Hide on the storefront, the help page itself, and previews.
  if (pathname.startsWith("/store") || pathname.startsWith("/help") || pathname.startsWith("/preview")) {
    return null;
  }

  return (
    <Link
      to="/help"
      title="עזרה ותמיכה"
      aria-label="עזרה ותמיכה"
      className="fixed bottom-4 right-4 z-40 h-9 w-9 rounded-full bg-card/80 backdrop-blur border border-border text-muted-foreground/70 shadow-sm flex items-center justify-center opacity-50 hover:opacity-100 hover:text-primary transition-opacity duration-200"
    >
      <HelpCircle className="w-4.5 h-4.5" />
    </Link>
  );
};

export default FloatingHelpButton;
