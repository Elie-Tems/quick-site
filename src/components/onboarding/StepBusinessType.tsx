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
  'torah-center': 'other', synagogue: 'other',
};

export type BusinessType = "products" | "services" | "realestate" | "nonprofit" | "synagogue";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

// Unsplash photo IDs — fixed per category so the same image always loads.
const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=400&h=300&fit=crop&auto=format&q=70`;

const FALLBACK_GRADIENTS = [
  "linear-gradient(135deg,#10b981,#065f46)",
  "linear-gradient(135deg,#8b5cf6,#4c1d95)",
  "linear-gradient(135deg,#0ea5e9,#1e3a8a)",
  "linear-gradient(135deg,#f59e0b,#9a3412)",
  "linear-gradient(135deg,#ec4899,#831843)",
  "linear-gradient(135deg,#14b8a6,#115e59)",
  "linear-gradient(135deg,#6366f1,#312e81)",
  "linear-gradient(135deg,#84cc16,#365314)",
];
const fallback = (i: number) => FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length];

const MAIN_CATEGORIES = [
  { id: "products" as BusinessType,  title: "מכירת מוצרים", desc: "חנות, בוטיק, מאפייה, מוצרים",                      img: U("1556742049-0cfed4f6a45d") },
  { id: "services" as BusinessType,  title: "נותני שירות",   desc: 'קוסמטיקה, כושר, ייעוץ, נדל"ן, טיפולים',           img: U("1521737604893-d14cc237f11d") },
  { id: "nonprofit" as BusinessType, title: "עמותה / ארגון", desc: "תרומות, גיוס המונים, קהילה",                        img: U("1559027615-cd4628902d4a") },
];

const SUB_CATEGORIES: Record<BusinessType, { id: string; title: string; img: string }[]> = {
  products: [
    { id: "fashion",       title: "אופנה / בוטיק",          img: U("1445205170230-053b83016050") },
    { id: "bakery",        title: "מאפייה / קונדיטוריה",    img: U("1509440159596-0249088772ff") },
    { id: "general-store", title: "חנות כללית",              img: U("1604719312566-8912e9227c6a") },
    { id: "food",          title: "מזון ומשקאות",            img: U("1504754524776-8f4f37790ca0") },
    { id: "jewelry",       title: "תכשיטים / עבודות יד",    img: U("1515562141207-7a88fb7ce338") },
    { id: "home-decor",    title: "מוצרי בית / עיצוב",      img: U("1555041469-a586c61ea9bc") },
    { id: "electronics",   title: "אלקטרוניקה / גאדג'טים",  img: U("1518770660439-4636190af475") },
    { id: "sports",        title: "ספורט וציוד",             img: U("1517649763962-0c623066013b") },
    { id: "cosmetics",     title: "קוסמטיקה / טיפוח",        img: U("1522335789203-aabd1fc54bc9") },
    { id: "pets",          title: "חיות מחמד",               img: U("1548199973-03cce0bbc87b") },
    { id: "books",         title: "ספרים / לוח",             img: U("1524995997946-a1c2e315a42f") },
    { id: "flowers",       title: "פרחים ומתנות",            img: U("1487530811015-780f3b5b7e7e") },
  ],
  services: [
    { id: "broker",        title: 'מתווך / נדל"ן',           img: U("1582407947304-fd86f028f716") },
    { id: "developer",     title: 'יזם / פרויקט נדל"ן',      img: U("1486406146926-c627a92ad1ab") },
    { id: "vacation",      title: "צימר / נופש",             img: U("1499793983690-e29da59ef1c2") },
    { id: "beauty",        title: "קוסמטיקה / יופי",         img: U("1560066984-138daaa83f0d") },
    { id: "renovation",    title: "שיפוצים / בנייה",          img: U("1504307651254-35680f356dfd") },
    { id: "health",        title: "בריאות / קליניקה",         img: U("1559839734-2b71ea197ec2") },
    { id: "consulting",    title: "ייעוץ עסקי / קריירה",      img: U("1552664730-d307ca884978") },
    { id: "photography",   title: "צילום",                    img: U("1516035069371-29a1b244cc32") },
    { id: "legal",         title: 'עו"ד / רו"ח',             img: U("1589829085413-56de8ae18c73") },
    { id: "car-dealer",    title: "רכב / מכירת רכבים",        img: U("1549317661-bd32c8ce0729") },
    { id: "barber",        title: "מספרה / ספר",              img: U("1503951914875-452162b0f3f1") },
    { id: "fitness",       title: "כושר / פילאטיס",           img: U("1534438327276-14e5300c3a48") },
  ],
  realestate: [],
  nonprofit: [
    { id: "charity",       title: "תרומות כלליות",            img: U("1532629345422-7515f3d16bb6") },
    { id: "crowdfunding",  title: "גיוס המונים",              img: U("1559526324-593bc073d938") },
    { id: "synagogue",     title: "מרכז תורני / קהילה",       img: U("1545164313-4dc36e85e1a2") },
    { id: "community",     title: "קהילה",                    img: U("1529156069898-49953e39b3ac") },
    { id: "education",     title: "חינוך / עמותת ילדים",      img: U("1580582932707-520aed937b7b") },
    { id: "social",        title: "רווחה חברתית",             img: U("1488521787991-ed7bbaae773c") },
    { id: "animals",       title: "הגנת בעלי חיים",           img: U("1548767797-d8c844163c4a") },
    { id: "torah-center",  title: "מרכז תורני / ישיבה",       img: U("1524055988636-436cfa9e0201") },
  ],
  synagogue: [],
};

const SHOW_INITIAL = 6;

const LISTINGS_SUBTYPES = new Set(["broker", "developer", "vacation", "commercial", "car-dealer"]);

// A synagogue is a nonprofit that also gets the synagogue module.
const SYNAGOGUE_SUBTYPES = new Set(["synagogue"]);

const ALL_SUBS_FLAT = (Object.entries(SUB_CATEGORIES) as [BusinessType, typeof SUB_CATEGORIES[BusinessType]][])
  .flatMap(([mainType, subs]) => subs.map(s => ({ ...s, mainType })));

// Card with real photo + gradient overlay fallback
const PhotoCard = ({
  img,
  title,
  desc,
  fallbackGradient,
  onClick,
  height,
  textSize = "sm",
}: {
  img: string;
  title: string;
  desc?: string;
  fallbackGradient: string;
  onClick: () => void;
  height?: string;
  textSize?: "sm" | "xl";
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative rounded-2xl overflow-hidden focus:outline-none w-full"
      style={{ height, aspectRatio: height ? undefined : "4/3" }}
    >
      {!imgFailed ? (
        <img
          src={img}
          alt={title}
          loading="lazy"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div
          className="absolute inset-0 transition-transform duration-700 group-hover:scale-105"
          style={{ background: fallbackGradient }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary rounded-2xl transition-colors" />
      <div className="absolute bottom-0 right-0 left-0 p-3 text-right">
        {textSize === "xl" ? (
          <>
            <p className="font-bold text-white text-xl leading-tight mb-1">{title}</p>
            {desc && <p className="text-xs text-white/65 leading-snug">{desc}</p>}
          </>
        ) : (
          <p className="font-semibold text-white text-sm leading-tight">{title}</p>
        )}
      </div>
    </button>
  );
};

const normalizeSearch = (s: string) => s.replace(/[״"]/g, '"').toLowerCase();

const StepBusinessType = ({ data, updateData, onNext, onBack }: Props) => {
  const [activeMain, setActiveMain] = useState<BusinessType | null>(data.businessType ?? null);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const searchNorm = normalizeSearch(search.trim());
  const globalSearchResults = searchNorm
    ? ALL_SUBS_FLAT.filter(s => normalizeSearch(s.title).includes(searchNorm))
    : [];

  const allSubs = activeMain ? SUB_CATEGORIES[activeMain] : [];
  const filteredSubs = allSubs.filter(s => !search || normalizeSearch(s.title).includes(searchNorm));
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
      ...(LISTINGS_SUBTYPES.has(subId) ? { businessType: 'realestate' as BusinessType } : {}),
      ...(SYNAGOGUE_SUBTYPES.has(subId) ? { businessType: 'synagogue' as BusinessType } : {}),
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {globalSearchResults.length === 0 ? (
                <div className="col-span-3 text-center pv-faint text-sm py-8">לא נמצאו תוצאות</div>
              ) : (
                globalSearchResults.map((sub, i) => (
                  <PhotoCard
                    key={sub.mainType + sub.id}
                    img={sub.img}
                    title={sub.title}
                    fallbackGradient={fallback(i)}
                    onClick={() => { updateData({ businessType: sub.mainType }); handleSubSelect(sub.id); }}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {MAIN_CATEGORIES.map((cat, i) => (
                <PhotoCard
                  key={cat.id}
                  img={cat.img}
                  title={cat.title}
                  desc={cat.desc}
                  fallbackGradient={fallback(i)}
                  onClick={() => handleMainSelect(cat.id)}
                  height="300px"
                  textSize="xl"
                />
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
              <PhotoCard
                key={sub.id}
                img={sub.img}
                title={sub.title}
                fallbackGradient={fallback(i)}
                onClick={() => handleSubSelect(sub.id)}
              />
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
