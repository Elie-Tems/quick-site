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
  education: 'other', social: 'other', animals: 'pets', 'torah-center': 'other',
};

export type BusinessType = "products" | "services" | "realestate" | "nonprofit" | "synagogue";

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

// Local gradients (no external image dependency) - same approach as the sub-category
// cards below, so these always render even when Unsplash/CDNs are blocked or slow.
const MAIN_CATEGORIES = [
  { id: "products" as BusinessType,  title: "מכירת מוצרים", desc: "חנות, בוטיק, מאפייה, מוצרים" },
  { id: "services" as BusinessType,  title: "נותן/ת שירות",  desc: "קוסמטיקה, כושר, ייעוץ, נדל\"ן, טיפולים" },
  { id: "nonprofit" as BusinessType, title: "עמותה / ארגון", desc: "תרומות, גיוס המונים, קהילה" },
];

const SUB_CATEGORIES: Record<BusinessType, { id: string; title: string }[]> = {
  products: [
    { id: "fashion",       title: "אופנה / בוטיק"         },
    { id: "bakery",        title: "מאפייה / קונדיטוריה"    },
    { id: "general-store", title: "חנות כללית"              },
    { id: "food",          title: "מזון ומשקאות"            },
    { id: "jewelry",       title: "תכשיטים / עבודות יד"    },
    { id: "home-decor",    title: "מוצרי בית / עיצוב"      },
    { id: "electronics",   title: "אלקטרוניקה / גאדג'טים"  },
    { id: "sports",        title: "ספורט וציוד"             },
    { id: "cosmetics",     title: "קוסמטיקה / טיפוח"        },
    { id: "pets",          title: "חיות מחמד"               },
    { id: "books",         title: "ספרים / לוח"             },
    { id: "flowers",       title: "פרחים ומתנות"            },
  ],
  services: [
    { id: "broker",        title: "מתווך / נדל\"ן"           },
    { id: "developer",     title: "יזם / פרויקט נדל\"ן"      },
    { id: "vacation",      title: "צימר / נופש"             },
    { id: "beauty",        title: "קוסמטיקה / יופי"         },
    { id: "renovation",    title: "שיפוצים / בנייה"          },
    { id: "health",        title: "בריאות / קליניקה"         },
    { id: "consulting",    title: "ייעוץ עסקי / קריירה"      },
    { id: "photography",   title: "צילום"                    },
    { id: "legal",         title: "עו\"ד / רו\"ח"             },
    { id: "car-dealer",    title: "רכב / מכירת רכבים"        },
    { id: "barber",        title: "מספרה / ספר"              },
    { id: "fitness",       title: "כושר / פילאטיס"           },
  ],
  realestate: [],
  nonprofit: [
    { id: "charity",       title: "תרומות כלליות"            },
    { id: "crowdfunding",  title: "גיוס המונים"              },
    { id: "synagogue",     title: "בית כנסת"                 },
    { id: "community",     title: "קהילה"                    },
    { id: "education",     title: "חינוך / עמותת ילדים"      },
    { id: "social",        title: "רווחה חברתית"             },
    { id: "animals",       title: "הגנת בעלי חיים"           },
    { id: "torah-center",  title: "מרכז תורני / ישיבה"       },
  ],
  synagogue: [],
};

const SHOW_INITIAL = 6;

// Sub-types that are really a "listings + leads" business (real estate / vehicles),
// even though the UI groups them under "נותן שירות". Picking one saves
// business_type='realestate' so the listings module turns on (see businessModules.ts),
// while the 3-card UI stays exactly as designed.
const LISTINGS_SUBTYPES = new Set(["broker", "developer", "vacation", "commercial", "car-dealer"]);

// A synagogue is a nonprofit that also gets the synagogue module (עליות/נדרים,
// מקומות, זמני תפילה). Picking it saves business_type='synagogue' while it stays a
// card under "עמותה / ארגון" (same trick as LISTINGS_SUBTYPES -> realestate).
const SYNAGOGUE_SUBTYPES = new Set(["synagogue"]);

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
      // A synagogue keeps donations + adds the synagogue tools module.
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
              {MAIN_CATEGORIES.map((cat, i) => (
                <button
                  key={cat.id}
                  onClick={() => handleMainSelect(cat.id)}
                  className="group relative rounded-2xl overflow-hidden focus:outline-none"
                  style={{ height: "300px" }}
                >
                  <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105" style={{ background: gradientFor(i) }} />
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
