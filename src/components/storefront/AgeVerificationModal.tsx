import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wine, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgeVerificationModalProps {
  businessName: string;
  onVerified: () => void;
}

const AgeVerificationModal = ({ businessName, onVerified }: AgeVerificationModalProps) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleConfirm = () => {
    // Store verification in sessionStorage so it persists during the session
    sessionStorage.setItem(`age_verified_${businessName}`, "true");
    setIsVisible(false);
    onVerified();
  };

  const handleDeny = () => {
    // Redirect to Google or a safe page
    window.location.href = "https://www.google.com";
  };

  // Check if already verified
  useEffect(() => {
    const isVerified = sessionStorage.getItem(`age_verified_${businessName}`);
    if (isVerified === "true") {
      setIsVisible(false);
      onVerified();
    }
  }, [businessName, onVerified]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-card border border-border rounded-2xl p-6 md:p-8 max-w-md w-full text-center shadow-2xl"
        >
          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Wine className="w-10 h-10 text-primary" />
          </div>

          {/* Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            אימות גיל
          </h2>

          {/* Description */}
          <p className="text-muted-foreground mb-6 leading-relaxed">
            מכירת אלכוהול מותרת מעל גיל 18 בלבד.
            <br />
            האם את/ה מעל גיל 18?
          </p>

          {/* Store name */}
          <p className="text-sm text-muted-foreground/70 mb-8">
            {businessName}
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleConfirm}
              size="lg"
              className="w-full gap-2 text-base"
              variant="default"
            >
              <ShieldCheck className="w-5 h-5" />
              אני מעל גיל 18
            </Button>

            <Button
              onClick={handleDeny}
              size="lg"
              variant="outline"
              className="w-full gap-2 text-base text-muted-foreground hover:text-destructive hover:border-destructive"
            >
              <XCircle className="w-5 h-5" />
              אני מתחת לגיל 18
            </Button>
          </div>

          {/* Legal notice */}
          <p className="text-xs text-muted-foreground/50 mt-6">
            בהמשך הגלישה באתר את/ה מאשר/ת שגילך מעל 18
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AgeVerificationModal;
