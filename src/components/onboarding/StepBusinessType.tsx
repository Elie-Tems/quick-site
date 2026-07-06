import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";

export type BusinessType = "products" | "services" | "realestate" | "nonprofit";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

// Main categories — photo cards
const MAIN_CATEGORIES = [
  {
    id: "products" as BusinessType,
    title: "מכירת מוצרים",
    desc: "חנות, בוטיק, מאפייה, מוצרים",
    img: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80",
  },
  {
    id: "services" as BusinessType,
    title: "נותן/ת שירות",
    desc: "קוסמטיקה, כושר, ייעוץ, טיפולים",
    img: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=80",
  },
  {
    id: "realestate" as BusinessType,
    title: "נדל\"ן",
    desc: "מתווך, יזם, צימר, אירוח",
    img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=80",
  },
  {
    id: "nonprofit" as BusinessType,
    title: "עמותה / ארגון",
    desc: "תרומות, גיוס המונים, קהילה",
    img: "https://images.unsplash.com/photo-1593113630400-ea4288922497?w=600&q=80",
  },
];

// Sub-categories per main type
const SUB_CATEGORIES: Record<BusinessType, { id: string; title: string; img: string }[]> = {
  products: [
    { id: "general-store", title: "חנות כללית", img: "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=400&q=75" },
    { id: "bakery", title: "מאפייה / קונדיטוריה", img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=75" },
    { id: "fashion", title: "אופנה / בוטיק", img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=75" },
    { id: "home-decor", title: "מוצרי בית / עיצוב", img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=75" },
    { id: "jewelry", title: "תכשיטים / עבודות יד", img: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=75" },
    { id: "food", title: "מזון ומשקאות", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=75" },
  ],
  services: [
    { id: "beauty", title: "קוסמטיקה / יופי", img: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&q=75" },
    { id: "barber", title: "מספרה / ברבר", img: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&q=75" },
    { id: "fitness", title: "כושר / פילאטיס", img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=75" },
    { id: "consulting", title: "ייעוץ עסקי / קריירה", img: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&q=75" },
    { id: "renovation", title: "שיפוצים / בנייה", img: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=400&q=75" },
    { id: "health", title: "בריאות / קליניקה", img: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&q=75" },
    { id: "photography", title: "צילום", img: "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=75" },
    { id: "legal", title: "עו\"ד / רו\"ח", img: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=75" },
  ],
  realestate: [
    { id: "broker", title: "מתווך / סוכנות", img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=75" },
    { id: "developer", title: "יזם / פרויקט", img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=75" },
    { id: "vacation", title: "צימר / נופש", img: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=400&q=75" },
    { id: "commercial", title: "נדל\"ן מסחרי", img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=75" },
  ],
  nonprofit: [
    { id: "charity", title: "תרומות כלליות", img: "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=400&q=75" },
    { id: "crowdfunding", title: "גיוס המונים", img: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&q=75" },
    { id: "community", title: "קהילה / כנסייה", img: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=75" },
    { id: "education", title: "חינוך / עמותת ילדים", img: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&q=75" },
  ],
};

const StepBusinessType = ({ data, updateData, onNext, onBack }: Props) => {
  const [activeMain, setActiveMain] = useState<BusinessType | null>(data.businessType ?? null);
  const [search, setSearch] = useState("");

  const filteredSubs = activeMain
    ? SUB_CATEGORIES[activeMain].filter(s => s.title.includes(search))
    : [];

  const handleMainSelect = (id: BusinessType) => {
    setActiveMain(id);
    setSearch("");
    updateData({ businessType: id, businessSubType: undefined });
  };

  const handleSubSelect = (subId: string) => {
    updateData({ businessSubType: subId });
    onNext();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold pv-strong mb-1">
          {activeMain ? "איזה סוג?" : "במה עוסק העסק שלכם?"}
        </h2>
        <p className="text-sm pv-muted">
          {activeMain ? "בחרו את הסוג המדויק — נתאים את האתר בהתאם" : "נתאים את הכלים ואת האתר בדיוק לצרכים שלכם"}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!activeMain ? (
          /* ── Level 1: main categories ── */
          <motion.div key="main" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            <div className="grid grid-cols-2 gap-3">
              {MAIN_CATEGORIES.map((cat, i) => (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.06 }}
                  onClick={() => handleMainSelect(cat.id)}
                  className="group relative rounded-2xl overflow-hidden text-right focus:outline-none"
                  style={{ aspectRatio: "4/3" }}
                >
                  <img src={cat.img} alt={cat.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary rounded-2xl transition-colors" />
                  <div className="absolute bottom-0 right-0 left-0 p-4">
                    <p className="font-bold text-white text-base leading-tight">{cat.title}</p>
                    <p className="text-xs text-white/70 mt-0.5">{cat.desc}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          /* ── Level 2: sub-categories ── */
          <motion.div key="sub" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            {/* Back + search */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => { setActiveMain(null); setSearch(""); updateData({ businessType: null, businessSubType: undefined }); }}
                className="flex items-center gap-1.5 text-sm pv-muted hover:text-primary transition-colors shrink-0"
              >
                <ArrowRight className="w-4 h-4" />
                חזרה
              </button>
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50 pointer-events-none" />
                <input
                  type="text"
                  placeholder="חפשו סוג עסק..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-10 pr-9 pl-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                  style={{ background: "var(--pv-surface2)", border: "1px solid var(--pv-border)", color: "var(--pv-text)" }}
                  dir="rtl"
                />
              </div>
            </div>

            {/* Sub-category photo grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[340px] overflow-y-auto pr-1">
              {filteredSubs.map((sub, i) => (
                <motion.button
                  key={sub.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                  onClick={() => handleSubSelect(sub.id)}
                  className="group relative rounded-2xl overflow-hidden focus:outline-none"
                  style={{ aspectRatio: "4/3" }}
                >
                  <img src={sub.img} alt={sub.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary rounded-2xl transition-colors" />
                  <div className="absolute bottom-0 right-0 left-0 p-3">
                    <p className="font-semibold text-white text-sm leading-tight">{sub.title}</p>
                  </div>
                </motion.button>
              ))}
              {filteredSubs.length === 0 && (
                <div className="col-span-3 text-center pv-faint text-sm py-8">לא נמצאו תוצאות</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back to previous page (only on main level) */}
      {!activeMain && onBack && (
        <button
          onClick={onBack}
          className="w-full text-center text-sm pv-faint hover:pv-muted transition-colors py-1"
        >
          חזרה
        </button>
      )}
    </div>
  );
};

export default StepBusinessType;
