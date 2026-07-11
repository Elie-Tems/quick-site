import { useState } from "react";
import { Search, ArrowRight, ChevronDown } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";
import type { BusinessCategory } from "@/lib/categoryConfig";

const SUB_TYPE_TO_CATEGORY: Record<string, BusinessCategory> = {
  fashion: 'clothing', bakery: 'bakery', 'general-store': 'other',
  food: 'restaurant', jewelry: 'jewelry', 'home-decor': 'home',
  electronics: 'electronics', sports: 'other', cosmetics: 'beauty',
  pets: 'pets', books: 'books', flowers: 'flowers',
  beauty: 'beauty', barber: 'beauty', fitness: 'fitness',
  renovation: 'handmade', photography: 'art', vacation: 'other',
  broker: 'other', health: 'other', consulting: 'other',
  legal: 'other', developer: 'other', 'car-dealer': 'automotive',
  charity: 'other', crowdfunding: 'other', community: 'other',
  education: 'other', social: 'other', animals: 'pets',
};

export type BusinessType = "products" | "services" | "realestate" | "nonprofit";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

// Local gradient palette - no external image dependency, so the cards always
// render (offline / blocked CDNs included). Reused for main + sub categories.
const GRADIENTS = [
  "linear-gradient(135deg, #10b981 0%, #059669 60%, #065f46 100%)",   // emerald
  "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 60%, #4c1d95 100%)",   // violet
  "linear-gradient(135deg, #0ea5e9 0%, #2563eb 60%, #1e3a8a 100%)",   // ocean
  "linear-gradient(135deg, #f59e0b 0%, #ea580c 60%, #9a3412 100%)",   // amber
  "linear-gradient(135deg, #ec4899 0%, #be185d 60%, #831843 100%)",   // rose
  "linear-gradient(135deg, #14b8a6 0%, #0d9488 60%, #115e59 100%)",   // teal
  "linear-gradient(135deg, #6366f1 0%, #4338ca 60%, #312e81 100%)",   // indigo
  "linear-gradient(135deg, #84cc16 0%, #4d7c0f 60%, #365314 100%)",   // lime
];
const gradientFor = (i: number) => GRADIENTS[i % GRADIENTS.length];

const MAIN_CATEGORIES = [
  { id: "products" as BusinessType,  title: "מכירת מוצרים", desc: "חנות, בוטיק, מאפייה, מוצרים",           img: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=75" },
  { id: "services" as BusinessType,  title: "נותן/ת שירות",  desc: "קוסמטיקה, כושר, ייעוץ, נדל\"ן, טיפולים", img: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&q=75" },
  { id: "nonprofit" as BusinessType, title: "עמותה / ארגון", desc: "תרומות, גיוס המונים, קהילה",             img: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=600&q=75" },
];

const SUB_CATEGORIES: Record<BusinessType, { id: string; title: string; img: string }[]> = {
  products: [
    { id: "fashion",      title: "אופנה / בוטיק",         img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=75" },
    { id: "bakery",       title: "מאפייה / קונדיטוריה",    img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=75" },
    { id: "general-store",title: "חנות כללית",              img: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&q=75" },
    { id: "food",         title: "מזון ומשקאות",            img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=75" },
    { id: "jewelry",      title: "תכשיטים / עבודות יד",    img: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=75" },
    { id: "home-decor",   title: "מוצרי בית / עיצוב",      img: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=75" },
    { id: "electronics",  title: "אלקטרוניקה / גאדג'טים",  img: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=400&q=75" },
    { id: "sports",       title: "ספורט וציוד",             img: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=75" },
    { id: "cosmetics",    title: "קוסמטיקה / טיפוח",        img: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&q=75" },
    { id: "pets",         title: "חיות מחמד",               img: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=75" },
    { id: "books",        title: "ספרים / לוח",             img: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=400&q=75" },
    { id: "flowers",      title: "פרחים ומתנות",            img: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400&q=75" },
  ],
  services: [
    { id: "broker",       title: "מתווך / נדל\"ן",           img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&q=75" },
    { id: "developer",    title: "יזם / פרויקט נדל\"ן",      img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&q=75" },
    { id: "vacation",     title: "צימר / נופש",             img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=75" },
    { id: "beauty",       title: "קוסמטיקה / יופי",        img: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&q=75" },
    { id: "renovation",   title: "שיפוצים / בנייה",         img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=75" },
    { id: "health",       title: "בריאות / קליניקה",        img: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&q=75" },
    { id: "consulting",   title: "ייעוץ עסקי / קריירה",     img: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&q=75" },
    { id: "photography",  title: "צילום",                   img: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=400&q=75" },
    { id: "legal",        title: "עו\"ד / רו\"ח",             img: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&q=75" },
    { id: "car-dealer",   title: "רכב / מכירת רכבים",       img: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&q=75" },
    { id: "barber",       title: "מספרה / ספר",             img: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&q=75" },
    { id: "fitness",      title: "כושר / פילאטיס",          img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=75" },
  ],
  realestate: [],
  nonprofit: [
    { id: "charity",      title: "תרומות כלליות",           img: "https://images.unsplash.com/photo-1593113630400-ea4288922497?w=400&q=75" },
    { id: "crowdfunding", title: "גיוס המונים",             img: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&q=75" },
    { id: "community",    title: "קהילה",                   img: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=75" },
    { id: "education",    title: "חינוך / עמותת ילדים",     img: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&q=75" },
    { id: "social",       title: "רווחה חברתית",            img: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&q=75" },
    { id: "animals",      title: "הגנת בעלי חיים",          img: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=75" },
  ],
};

const SHOW_INITIAL = 6;

// Sub-types that are really a "listings + leads" business (real estate / vehicles),
// even though the UI groups them under "נותן שירות". Picking one saves
// business_type='realestate' so the listings module turns on (see businessModules.ts),
// while the 3-card UI stays exactly as designed.
const LISTINGS_SUBTYPES = new Set(["broker", "developer", "vacation", "commercial", "car-dealer"]);

// Flat list of all sub-categories with their parent type, for global search
const ALL_SUBS_FLAT = (Object.entries(SUB_CATEGORIES) as [BusinessType, typeof SUB_CATEGORIES[BusinessType]][])
  .flatMap(([mainType, subs]) => subs.map(s => ({ ...s, mainType })));

const StepBusinessType = ({ data, updateData, onNext, onBack }: Props) => {
  const [activeMain, setActiveMain] = useState<BusinessType | null>(data.businessType ?? null);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  // Global search across all sub-types (used on the main screen before a category is selected)
  const globalSearchResults = search.trim()
    ? ALL_SUBS_FLAT.filter(s => s.title.includes(search.trim()))
    : [];

  const allSubs = activeMain ? SUB_CATEGORIES[activeMain] : [];
  const filteredSubs = allSubs.filter(s => !search || s.title.includes(search));
  const visibleSubs = search || showAll ? filteredSubs : filteredSubs.slice(0, SHOW_INITIAL);
  const hasMore = !search && !showAll && filteredSubs.length > SHOW_INITIAL;

  const handleMainSelect = (id: BusinessType) => {
    setActiveMain(id);
    setSearch("");
    setShowAll(false);
    updateData({ businessType: id, businessSubType: undefined });
  };

  const handleSubSelect = (subId: string) => {
    const effectiveSubType = subId === 'other' && activeMain ? `other-${activeMain}` : subId;
    updateData({
      businessSubType: effectiveSubType,
      businessCategory: SUB_TYPE_TO_CATEGORY[subId] || 'other',
      // Real-estate / vehicle sub-types unlock the listings module regardless of
      // which main card they sit under.
      ...(LISTINGS_SUBTYPES.has(subId) ? { businessType: 'realestate' as BusinessType } : {}),
    });
    onNext();
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold pv-strong mb-1">
          {activeMain ? "איזה סוג?" : "במה עוסק העסק שלכם?"}
        </h2>
        <p className="text-sm pv-muted">
          {activeMain
            ? "בחרו את הסוג המדויק — נתאים את האתר בהתאם"
            : "נתאים את הכלים ואת האתר בדיוק לצרכים שלכם"}
        </p>
      </div>

      {!activeMain ? (
        <div className="space-y-4">
          {/* Global search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50 pointer-events-none" />
            <input
              type="text"
              placeholder='חפשו סוג עסק - נדל"ן, מאפייה, כושר...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-11 pr-9 pl-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
              style={{ background: "var(--pv-surface2)", border: "1px solid var(--pv-border)", color: "var(--pv-text)" }}
              dir="rtl"
            />
          </div>

          {search.trim() ? (
            /* Search results across all categories */
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {globalSearchResults.length === 0 ? (
                <div className="col-span-3 text-center pv-faint text-sm py-8">לא נמצאו תוצאות</div>
              ) : (
                globalSearchResults.map((sub, i) => (
                  <button
                    key={sub.mainType + sub.id}
                    onClick={() => {
                      updateData({ businessType: sub.mainType });
                      handleSubSelect(sub.id);
                    }}
                    className="group relative rounded-2xl overflow-hidden focus:outline-none"
                    style={{ aspectRatio: "4/3" }}
                  >
                    <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105" style={{ background: gradientFor(i) }} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                    <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary rounded-2xl transition-colors" />
                    <div className="absolute bottom-0 right-0 left-0 p-3 text-right">
                      <p className="font-semibold text-white text-sm leading-tight">{sub.title}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* Main category cards */
            <div className="grid grid-cols-3 gap-3">
              {MAIN_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleMainSelect(cat.id)}
                  className="group relative rounded-2xl overflow-hidden focus:outline-none"
                  style={{ height: "300px" }}
                >
                  <img src={cat.img} alt={cat.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary rounded-2xl transition-colors" />
                  <div className="absolute bottom-0 right-0 left-0 p-4 text-right">
                    <p className="font-bold text-white text-xl leading-tight mb-1">{cat.title}</p>
                    <p className="text-xs text-white/65 leading-snug">{cat.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => { setActiveMain(null); setSearch(""); setShowAll(false); updateData({ businessType: null, businessSubType: undefined }); }}
              className="flex items-center gap-1.5 text-sm pv-muted hover:text-primary transition-colors shrink-0"
            >
              <ArrowRight className="w-4 h-4" />
              חזרה
            </button>
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50 pointer-events-none" />
              <input
                type="text"
                placeholder="חפשו..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pr-9 pl-3 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                style={{ background: "var(--pv-surface2)", border: "1px solid var(--pv-border)", color: "var(--pv-text)" }}
                dir="rtl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {visibleSubs.map((sub, i) => (
              <button
                key={sub.id}
                onClick={() => handleSubSelect(sub.id)}
                className="group relative rounded-2xl overflow-hidden focus:outline-none"
                style={{ aspectRatio: "4/3" }}
              >
                <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105" style={{ background: gradientFor(i) }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary rounded-2xl transition-colors" />
                <div className="absolute bottom-0 right-0 left-0 p-3">
                  <p className="font-semibold text-white text-sm leading-tight">{sub.title}</p>
                </div>
              </button>
            ))}
            {filteredSubs.length === 0 && (
              <div className="col-span-3 text-center pv-faint text-sm py-8">לא נמצאו תוצאות</div>
            )}
          </div>

          {hasMore && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full mt-3 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm pv-muted hover:text-primary transition-colors"
              style={{ border: "1px dashed var(--pv-border)" }}
            >
              <ChevronDown className="w-4 h-4" />
              הצג עוד
            </button>
          )}

          {filteredSubs.length > 0 && (
            <button
              onClick={() => handleSubSelect("other")}
              className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-colors"
              style={{ background: "var(--color-primary, #22c55e)", color: "#fff" }}
            >
              אחר — לא מצאתי את העסק שלי
            </button>
          )}
        </div>
      )}

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
