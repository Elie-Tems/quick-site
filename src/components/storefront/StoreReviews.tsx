import { Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Google reviews section shown on the storefront (paid add-on). Reads the cached
 * reviews from the business row - no API call per visitor. Renders nothing if
 * the store hasn't connected/paid or there are no reviews.
 */

export interface ReviewsCache {
  rating?: number;
  total?: number;
  mapsUri?: string;
  reviews?: { author?: string; rating?: number; text?: string; when?: string }[];
}

const Stars = ({ n, className = "w-4 h-4" }: { n: number; className?: string }) => (
  <span className="inline-flex">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`${className} ${i <= Math.round(n) ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
    ))}
  </span>
);

const StoreReviews = ({
  cache,
  primaryColor,
}: {
  cache: ReviewsCache | null | undefined;
  primaryColor?: string;
}) => {
  const { t, dir, language } = useLanguage();
  const reviews = (cache?.reviews || []).filter((r) => (r.text || "").trim());
  if (!cache || cache.rating == null || !reviews.length) return null;

  const localeMap: Record<string, string> = { he: "he-IL", en: "en-US", ar: "ar", ru: "ru-RU", fr: "fr-FR" };
  const locale = localeMap[language] || "en-US";

  return (
    <section className="py-12 px-4" dir={dir}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <span className="text-4xl font-extrabold" style={{ color: primaryColor || undefined }}>
              {cache.rating.toFixed(1)}
            </span>
            <div className={dir === "rtl" ? "text-right" : "text-left"}>
              <Stars n={cache.rating} className="w-5 h-5" />
              <div className="text-sm text-gray-500">
                {t("store.reviews.count").replace("{count}", (cache.total ?? 0).toLocaleString(locale))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.slice(0, 6).map((r, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">{r.author || t("store.reviews.anonymousCustomer")}</span>
                {r.rating != null && <Stars n={r.rating} />}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-5">{r.text}</p>
              {r.when && <p className="text-xs text-gray-400 mt-3">{r.when}</p>}
            </div>
          ))}
        </div>

        {cache.mapsUri && (
          <div className="text-center mt-6">
            <a
              href={cache.mapsUri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              {t("store.reviews.viewAllOnGoogle")}
            </a>
          </div>
        )}
      </div>
    </section>
  );
};

export default StoreReviews;
