import { Link, useLocation } from "react-router-dom";
import { HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

const FloatingHelpButton = () => {
  const { pathname } = useLocation();
  // Show only on management app – hide on storefront (built store for customers)
  if (pathname.startsWith("/store")) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1, duration: 0.3 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <Link
        to="/help"
        className="flex items-center gap-2 h-14 px-5 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform duration-200"
        title="מרכז ידע"
      >
        <HelpCircle className="w-6 h-6 flex-shrink-0" />
        <span className="font-medium whitespace-nowrap">מרכז ידע</span>
      </Link>
    </motion.div>
  );
};

export default FloatingHelpButton;
