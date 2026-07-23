import { useState } from "react";
import { Search, ArrowRight, ChevronDown } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";
import type { BusinessCategory } from "@/lib/categoryConfig";
import { useLanguage } from "@/contexts/LanguageContext";

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
  'torah-center': 'other', synagogue: 'other', 'kolel-yeshiva': 'other',
  // vacation is now a top-level BusinessType — no category mapping needed
};

export type BusinessType = "products" | "services" | "realestate" | "nonprofit" | "synagogue" | "vacation";

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

// titleKey / descKey are i18n keys (resolved with t() at render, so the grid +
// search follow the merchant's language). See ob.bt.* in the translation files.
const MAIN_CATEGORIES = [
  { id: "products" as BusinessType,  titleKey: "ob.bt.main.products.title",  descKey: "ob.bt.main.products.desc",  img: U("1556742049-0cfed4f6a45d") },
  { id: "services" as BusinessType,  titleKey: "ob.bt.main.services.title",  descKey: "ob.bt.main.services.desc",  img: U("1521737604893-d14cc237f11d") },
  { id: "vacation" as BusinessType,  titleKey: "ob.bt.main.vacation.title",  descKey: "ob.bt.main.vacation.desc",  img: U("1499793983690-e29da59ef1c2") },
  { id: "nonprofit" as BusinessType, titleKey: "ob.bt.main.nonprofit.title", descKey: "ob.bt.main.nonprofit.desc", img: U("1559027615-cd4628902d4a") },
];

const SUB_CATEGORIES: Record<BusinessType, { id: string; titleKey: string; img: string }[]> = {
  products: [
    { id: "fashion",       titleKey: "ob.bt.sub.fashion",       img: U("1445205170230-053b83016050") },
    { id: "bakery",        titleKey: "ob.bt.sub.bakery",        img: U("1509440159596-0249088772ff") },
    { id: "general-store", titleKey: "ob.bt.sub.general-store", img: U("1604719312566-8912e9227c6a") },
    { id: "food",          titleKey: "ob.bt.sub.food",          img: U("1504754524776-8f4f37790ca0") },
    { id: "jewelry",       titleKey: "ob.bt.sub.jewelry",       img: U("1515562141207-7a88fb7ce338") },
    { id: "home-decor",    titleKey: "ob.bt.sub.home-decor",    img: U("1555041469-a586c61ea9bc") },
    { id: "electronics",   titleKey: "ob.bt.sub.electronics",   img: U("1518770660439-4636190af475") },
    { id: "sports",        titleKey: "ob.bt.sub.sports",        img: U("1517649763962-0c623066013b") },
    { id: "cosmetics",     titleKey: "ob.bt.sub.cosmetics",     img: U("1522335789203-aabd1fc54bc9") },
    { id: "pets",          titleKey: "ob.bt.sub.pets",          img: U("1548199973-03cce0bbc87b") },
    { id: "books",         titleKey: "ob.bt.sub.books",         img: U("1524995997946-a1c2e315a42f") },
    { id: "flowers",       titleKey: "ob.bt.sub.flowers",       img: U("1490750967868-88338961fd3c") },
  ],
  services: [
    { id: "broker",        titleKey: "ob.bt.sub.broker",        img: U("1582407947304-fd86f028f716") },
    { id: "developer",     titleKey: "ob.bt.sub.developer",     img: U("1486406146926-c627a92ad1ab") },
    { id: "beauty",        titleKey: "ob.bt.sub.beauty",        img: U("1487412947147-5cebf100ffc2") },
    { id: "renovation",    titleKey: "ob.bt.sub.renovation",    img: U("1504307651254-35680f356dfd") },
    { id: "health",        titleKey: "ob.bt.sub.health",        img: U("1559839734-2b71ea197ec2") },
    { id: "consulting",    titleKey: "ob.bt.sub.consulting",    img: U("1552664730-d307ca884978") },
    { id: "photography",   titleKey: "ob.bt.sub.photography",   img: U("1516035069371-29a1b244cc32") },
    { id: "legal",         titleKey: "ob.bt.sub.legal",         img: U("1589829085413-56de8ae18c73") },
    { id: "car-dealer",    titleKey: "ob.bt.sub.car-dealer",    img: U("1494976388531-d1058494cdd8") },
    { id: "barber",        titleKey: "ob.bt.sub.barber",        img: U("1503951914875-452162b0f3f1") },
    { id: "fitness",       titleKey: "ob.bt.sub.fitness",       img: U("1534438327276-14e5300c3a48") },
  ],
  vacation: [],
  realestate: [],
  nonprofit: [
    { id: "charity",       titleKey: "ob.bt.sub.charity",       img: U("1532629345422-7515f3d16bb6") },
    { id: "crowdfunding",  titleKey: "ob.bt.sub.crowdfunding",  img: U("1559526324-593bc073d938") },
    { id: "synagogue",     titleKey: "ob.bt.sub.synagogue",     img: U("1507003211169-0a1dd7228f2d") },
    { id: "community",     titleKey: "ob.bt.sub.community",      img: U("1529156069898-49953e39b3ac") },
    { id: "education",     titleKey: "ob.bt.sub.education",      img: U("1580582932707-520aed937b7b") },
    { id: "social",        titleKey: "ob.bt.sub.social",        img: U("1469571486292-0ba58a3f068b") },
    { id: "animals",       titleKey: "ob.bt.sub.animals",       img: U("1548767797-d8c844163c4a") },
    { id: "torah-center",  titleKey: "ob.bt.sub.torah-center",  img: U("1524055988636-436cfa9e0201") },
  ],
  synagogue: [],
};

const SHOW_INITIAL = 6;

const LISTINGS_SUBTYPES = new Set(["broker", "developer", "commercial", "car-dealer"]);
const SYNAGOGUE_SUBTYPES = new Set(["synagogue"]);
const KOLEL_SUBTYPES = new Set(["kolel-yeshiva"]);
// torah-center triggers a sub-sub picker (synagogue vs kolel) instead of advancing.
const TORAH_CENTER_SUBTYPES = new Set(["torah-center"]);

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
  dir = "rtl",
}: {
  img: string;
  title: string;
  desc?: string;
  fallbackGradient: string;
  onClick: () => void;
  height?: string;
  textSize?: "sm" | "xl";
  dir?: "rtl" | "ltr";
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
      <div className={`absolute bottom-0 right-0 left-0 p-3 ${dir === "ltr" ? "text-left" : "text-right"}`}>
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
  const { t, dir } = useLanguage();
  const [activeMain, setActiveMain] = useState<BusinessType | null>(data.businessType ?? null);
  const [torahCenterActive, setTorahCenterActive] = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);

  const searchNorm = normalizeSearch(search.trim());
  const globalSearchResults = searchNorm
    ? ALL_SUBS_FLAT.filter(s => normalizeSearch(t(s.titleKey)).includes(searchNorm))
    : [];

  const allSubs = activeMain ? SUB_CATEGORIES[activeMain] : [];
  const filteredSubs = allSubs.filter(s => !search || normalizeSearch(t(s.titleKey)).includes(searchNorm));
  const visibleSubs = search || showAll ? filteredSubs : filteredSubs.slice(0, SHOW_INITIAL);
  const hasMore = !search && !showAll && filteredSubs.length > SHOW_INITIAL;

  const handleMainSelect = (id: BusinessType) => {
    updateData({ businessType: id, businessSubType: undefined });
    // If this type has no subcategories, advance immediately without showing sub-grid
    if (SUB_CATEGORIES[id].length === 0) {
      onNext();
      return;
    }
    setActiveMain(id);
    setSearch("");
    setShowAll(false);
  };

  const handleSubSelect = (subId: string) => {
    if (TORAH_CENTER_SUBTYPES.has(subId)) {
      updateData({ businessSubType: subId, businessCategory: 'other' });
      setTorahCenterActive(true);
      return;
    }
    const effectiveSubType = subId === 'other' && activeMain ? `other-${activeMain}` : subId;
    updateData({
      businessSubType: effectiveSubType,
      businessCategory: SUB_TYPE_TO_CATEGORY[subId] || 'other',
      ...(LISTINGS_SUBTYPES.has(subId) ? { businessType: 'realestate' as BusinessType } : {}),
      ...(SYNAGOGUE_SUBTYPES.has(subId) ? { businessType: 'synagogue' as BusinessType } : {}),
      ...(KOLEL_SUBTYPES.has(subId) ? { businessType: 'kolel' as BusinessType } : {}),
    });
    onNext();
  };

  // Search icon sits on the start side of the input, which flips with direction.
  const searchIconSide = dir === "ltr" ? "left-3" : "right-3";
  const searchPad = dir === "ltr" ? "pl-9 pr-3" : "pr-9 pl-3";

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold pv-strong mb-1">
          {torahCenterActive ? "איזה סוג מרכז תורני?" : activeMain ? t("ob.bt.q_which_type") : t("ob.bt.q_what_business")}
        </h2>
        <p className="text-sm pv-muted">
          {torahCenterActive ? "בחר את הסוג המתאים לפונקציונליות הנכונה" : activeMain ? t("ob.bt.sub_hint") : t("ob.bt.main_hint")}
        </p>
      </div>

      {torahCenterActive ? (
        <div className="space-y-4">
          <button
            onClick={() => setTorahCenterActive(false)}
            className="flex items-center gap-1.5 text-sm pv-muted hover:text-primary transition-colors"
          >
            <ArrowRight className={`w-4 h-4 ${dir === "ltr" ? "rotate-180" : ""}`} />
            חזרה
          </button>
          <div className="grid grid-cols-2 gap-4">
            <PhotoCard
              img={U("1507003211169-0a1dd7228f2d")}
              title="בית כנסת"
              desc="עליות, נדרים, מקומות, זמני תפילה"
              fallbackGradient={fallback(0)}
              onClick={() => handleSubSelect("synagogue")}
              height="240px"
              textSize="xl"
              dir={dir}
            />
            <PhotoCard
              img={U("1524055988636-436cfa9e0201")}
              title="כולל / ישיבה"
              desc="תדמית, גלריה, תרומות, תוכן תורני"
              fallbackGradient={fallback(2)}
              onClick={() => handleSubSelect("kolel-yeshiva")}
              height="240px"
              textSize="xl"
              dir={dir}
            />
          </div>
        </div>
      ) : !activeMain ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className={`absolute ${searchIconSide} top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50 pointer-events-none`} />
            <input
              type="text"
              placeholder={t("ob.bt.search_placeholder")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`w-full h-11 ${searchPad} rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/40`}
              style={{ background: "var(--pv-surface2)", border: "1px solid var(--pv-border)", color: "var(--pv-text)" }}
              dir={dir}
            />
          </div>

          {search.trim() ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {globalSearchResults.length === 0 ? (
                <div className="col-span-3 text-center pv-faint text-sm py-8">{t("ob.bt.no_results")}</div>
              ) : (
                globalSearchResults.map((sub, i) => (
                  <PhotoCard
                    key={sub.mainType + sub.id}
                    img={sub.img}
                    title={t(sub.titleKey)}
                    fallbackGradient={fallback(i)}
                    onClick={() => { updateData({ businessType: sub.mainType }); handleSubSelect(sub.id); }}
                    dir={dir}
                  />
                ))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {MAIN_CATEGORIES.map((cat, i) => (
                <PhotoCard
                  key={cat.id}
                  img={cat.img}
                  title={t(cat.titleKey)}
                  desc={t(cat.descKey)}
                  fallbackGradient={fallback(i)}
                  onClick={() => handleMainSelect(cat.id)}
                  height="300px"
                  textSize="xl"
                  dir={dir}
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
              <ArrowRight className={`w-4 h-4 ${dir === "ltr" ? "rotate-180" : ""}`} />
              {t("ob.bt.back")}
            </button>
            <div className="flex-1 relative">
              <Search className={`absolute ${searchIconSide} top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50 pointer-events-none`} />
              <input
                type="text"
                placeholder={t("ob.bt.search_short")}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full h-10 ${searchPad} rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/40`}
                style={{ background: "var(--pv-surface2)", border: "1px solid var(--pv-border)", color: "var(--pv-text)" }}
                dir={dir}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {visibleSubs.map((sub, i) => (
              <PhotoCard
                key={sub.id}
                img={sub.img}
                title={t(sub.titleKey)}
                fallbackGradient={fallback(i)}
                onClick={() => handleSubSelect(sub.id)}
                dir={dir}
              />
            ))}
            {filteredSubs.length === 0 && (
              <div className="col-span-3 text-center pv-faint text-sm py-8">{t("ob.bt.no_results")}</div>
            )}
          </div>

          {hasMore && (
            <button
              onClick={() => setShowAll(true)}
              className="w-full mt-3 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm pv-muted hover:text-primary transition-colors"
              style={{ border: "1px dashed var(--pv-border)" }}
            >
              <ChevronDown className="w-4 h-4" />
              {t("ob.bt.show_more")}
            </button>
          )}

          {filteredSubs.length > 0 && (
            <button
              onClick={() => handleSubSelect("other")}
              className="mt-1 w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-colors"
              style={{ background: "var(--color-primary, #22c55e)", color: "#fff" }}
            >
              {t("ob.bt.other")}
            </button>
          )}
        </div>
      )}

      {!activeMain && !torahCenterActive && onBack && (
        <button
          onClick={onBack}
          className="w-full text-center text-sm pv-faint hover:pv-muted transition-colors py-1"
        >
          {t("ob.bt.back")}
        </button>
      )}
    </div>
  );
};

export default StepBusinessType;
