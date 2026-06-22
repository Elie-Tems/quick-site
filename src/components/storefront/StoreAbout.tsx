import { motion } from "framer-motion";

interface StoreAboutProps {
  aboutText: string;
  businessName: string;
}

const StoreAbout = ({ aboutText, businessName }: StoreAboutProps) => {
  if (!aboutText) return null;

  return (
    <section dir="rtl" className="py-16 md:py-24 border-t border-foreground/10">
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
            <div className="h-px flex-1 bg-foreground/10" />
            <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-muted-foreground">
              אודות {businessName}
            </span>
            <div className="h-px flex-1 bg-foreground/10" />
          </div>

          {/* Body */}
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed text-center">
            {aboutText}
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default StoreAbout;