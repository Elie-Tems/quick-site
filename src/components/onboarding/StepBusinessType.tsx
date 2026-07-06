import { motion } from "framer-motion";
import { ShoppingBag, Scissors, Home, Heart } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";

export type BusinessType = "products" | "services" | "realestate" | "nonprofit";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

const TYPES = [
  {
    id: "products" as BusinessType,
    icon: ShoppingBag,
    title: "מכירת מוצרים",
    desc: "חנות אונליין, בוטיק, מאפייה, מוצרים ביתיים ועוד",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    activeBorder: "border-emerald-500",
    activeBg: "bg-emerald-500/5",
  },
  {
    id: "services" as BusinessType,
    icon: Scissors,
    title: "נותן/ת שירות",
    desc: "קוסמטיקאית, מאמן כושר, עורך דין, מספרה ועוד",
    iconBg: "bg-sky-500/10",
    iconColor: "text-sky-400",
    activeBorder: "border-sky-500",
    activeBg: "bg-sky-500/5",
  },
  {
    id: "realestate" as BusinessType,
    icon: Home,
    title: "נדל\"ן",
    desc: "מתווך, סוכנות נכסים, יזם, צימר ואירוח",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-400",
    activeBorder: "border-amber-500",
    activeBg: "bg-amber-500/5",
  },
  {
    id: "nonprofit" as BusinessType,
    icon: Heart,
    title: "עמותה / ארגון",
    desc: "ארגון ללא מטרות רווח, גיוס תרומות, קהילה",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-400",
    activeBorder: "border-rose-500",
    activeBg: "bg-rose-500/5",
  },
];

const StepBusinessType = ({ data, updateData, onNext, onBack }: Props) => {
  const selected = data.businessType ?? null;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold pv-strong mb-1">במה עוסק העסק שלכם?</h2>
        <p className="text-sm pv-muted">נתאים את הכלים ואת החנות בדיוק לצרכים שלכם</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TYPES.map((t, i) => {
          const isSelected = selected === t.id;
          return (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: i * 0.06 }}
              onClick={() => updateData({ businessType: t.id })}
              className={`rounded-2xl border-2 p-5 text-right transition-all ${
                isSelected
                  ? `${t.activeBorder} ${t.activeBg} shadow-md`
                  : "pv-border pv-surface pv-hover"
              }`}
              style={isSelected ? undefined : { borderColor: "var(--pv-border)" }}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${t.iconBg}`}>
                <t.icon className={`w-5 h-5 ${t.iconColor}`} />
              </div>
              <p className="text-sm font-semibold pv-strong mb-1">{t.title}</p>
              <p className="text-xs pv-muted leading-relaxed">{t.desc}</p>
            </motion.button>
          );
        })}
      </div>

      <div className="flex gap-3 pt-2">
        {onBack && (
          <button
            onClick={onBack}
            className="flex-none px-5 h-12 rounded-xl border text-sm pv-muted pv-hover transition-colors"
            style={{ borderColor: "var(--pv-border)" }}
          >
            חזרה
          </button>
        )}
        <button
          onClick={onNext}
          disabled={!selected}
          className="flex-1 h-12 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          המשיכו ←
        </button>
      </div>
    </div>
  );
};

export default StepBusinessType;
