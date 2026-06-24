import { Link, useLocation } from "react-router-dom";
import { HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

const FloatingHelpButton = () => {
  const { pathname } = useLocation();
  // Hide on the storefront (customer-facing store) and on the help page itself
  // (no point offering "open the bot" when you're already in the bot).
  if (pathname.startsWith("/store") || pathname.startsWith("/help") || pathname.startsWith("/preview")) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1, duration: 0.3 }}
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50"
    >
      <Link
        to="/help"
        className="flex items-center justify-center gap-2 h-11 w-11 md:h-14 md:w-auto md:px-5 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform duration-200"
        title="בוט שירות ותמיכה"
      >
        <HelpCircle className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0" />
        {/* Mobile: compact icon-only so it doesn't get in the way; desktop: full label */}
        <span className="hidden md:inline font-medium whitespace-nowrap">בוט שירות ותמיכה</span>
      </Link>
    </motion.div>
  );
};

export default FloatingHelpButton;
