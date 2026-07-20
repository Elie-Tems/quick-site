import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface StoreAboutProps {
  aboutText: string;
  businessName: string;
}

// When a customer gives only a line or two, pad it into a proper about section
// so the page looks complete. They can always edit it from the dashboard.
function enrichAbout(
  text: string,
  businessName: string,
  t: (key: string) => string
): { headline: string; body: string } {
  const trimmed = text.trim();
  const headline = t("store.about.heading").replace("{business}", businessName);

  if (trimmed.length >= 100) {
    return { headline, body: trimmed };
  }

  // Short text — treat it as a tagline and add a professional paragraph
  const filler = t("store.about.filler_text").replace("{business}", businessName);
  const body = `${trimmed}\n\n${filler}`;

  return { headline, body };
}

const StoreAbout = ({ aboutText, businessName }: StoreAboutProps) => {
  const { t } = useLanguage();
  if (!aboutText) return null;

  const { headline, body } = enrichAbout(aboutText, businessName, t);

  return (
    <section id="about" dir="rtl" className="py-16 md:py-24 border-t border-border bg-background">
      <div className="container px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-2xl mx-auto"
        >
          {/* Label */}
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold tracking-widest text-foreground/60 uppercase whitespace-nowrap">
              {headline}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Body — must always be dark enough to read */}
          {body.split("\n\n").map((para, i) => (
            <p key={i} className={`leading-relaxed text-center mb-4 last:mb-0 ${i === 0 ? "text-base md:text-lg font-medium text-foreground" : "text-base text-foreground/70"}`}>
              {para}
            </p>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default StoreAbout;