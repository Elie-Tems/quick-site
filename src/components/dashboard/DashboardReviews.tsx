import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Star, Check, Loader2, Lock, Search, RefreshCw, Sparkles, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateBusiness } from "@/hooks/useBusiness";
import { getReviewsPaymentUrl, REVIEWS_ADDON_PRICE_ILS } from "@/lib/publishPaymentConfig";
import { toast } from "sonner";

/**
 * Google Business reviews add-on (₪14/mo). The merchant finds their business by
 * NAME (we resolve the Google place for them - no API key, no Place ID) and
 * their rating + reviews are shown on their storefront. Locked behind reviews_paid.
 */

interface Props {
  businessId: string | undefined;
}

type Row = {
  reviews_paid: boolean | null;
  google_place_id: string | null;
  google_business_name: string | null;
  google_reviews_cache: { rating?: number; total?: number; reviews?: any[] } | null;
  reviews_show_on_store: boolean | null;
};
type Candidate = { placeId: string; name: string; address: string; rating: number | null; total: number };

const Stars = ({ n }: { n: number }) => (
  <span className="inline-flex">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star key={i} className={`w-4 h-4 ${i <= Math.round(n) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
    ))}
  </span>
);

const DashboardReviews = ({ businessId }: Props) => {
  const updateBusiness = useUpdateBusiness();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["biz-reviews", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("businesses")
        .select("reviews_paid,google_place_id,google_business_name,google_reviews_cache,reviews_show_on_store")
        .eq("id", businessId)
        .maybeSingle();
      return data as Row | null;
    },
  });

  const [showOnStore, setShowOnStore] = useState(true);
  useEffect(() => {
    if (data) setShowOnStore(data.reviews_show_on_store ?? true);
  }, [data]);

  const paid = !!data?.reviews_paid;
  const connected = !!data?.google_place_id;
  const cache = data?.google_reviews_cache;

  const startPayment = () => {
    const url = getReviewsPaymentUrl();
    if (!url) {
      toast.info("התשלום ייפתח כאן בקרוב. נציג ייצור איתך קשר להפעלה 🙏");
      return;
    }
    window.location.href = url;
  };

  const doSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    const { data, error } = await supabase.functions.invoke("google-reviews", {
      body: { action: "search", query: query.trim() },
    });
    setSearching(false);
    if (error || !data?.ok) {
      toast.error("החיפוש נכשל. נסו שם מלא יותר (כולל עיר).");
      return;
    }
    setResults(data.results || []);
    if (!data.results?.length) toast.info("לא נמצא עסק תואם. נסו שם + עיר.");
  };

  const pick = async (c: Candidate) => {
    if (!businessId) return;
    setBusy(true);
    try {
      await updateBusiness.mutateAsync({ id: businessId, google_place_id: c.placeId, google_business_name: c.name } as any);
      const { data, error } = await supabase.functions.invoke("google-reviews", {
        body: { action: "refresh", placeId: c.placeId },
      });
      if (error || !data?.ok) throw new Error("refresh failed");
      toast.success("העסק חובר! הביקורות יוצגו בחנות.");
      setResults([]);
      setQuery("");
      refetch();
    } catch {
      toast.error("שגיאה בחיבור העסק");
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("google-reviews", { body: { action: "refresh" } });
    setBusy(false);
    if (error || !data?.ok) toast.error("רענון נכשל");
    else {
      toast.success("הביקורות עודכנו");
      refetch();
    }
  };

  const toggleShow = async (v: boolean) => {
    if (!businessId) return;
    setShowOnStore(v);
    await updateBusiness.mutateAsync({ id: businessId, reviews_show_on_store: v } as any);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-400 fill-amber-400" /> ביקורות Google בחנות
        </h1>
        <p className="text-muted-foreground mt-1">
          חברו את כרטיס Google Business שלכם - הדירוג והביקורות יוצגו יפה בדף הבית של החנות ובונים אמון.
        </p>
      </div>

      {!paid ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-400/5 to-transparent p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">⭐ הציגו את ביקורות Google שלכם בדף הבית</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-2">
            יש לכם כרטיס עסק בגוגל עם ביקורות? חברו אותו והדירוג + הביקורות יופיעו יפה בחנות - בונה אמון ומגדיל מכירות.
          </p>
          <p className="text-sm text-foreground/80 max-w-lg mx-auto mb-6">
            <b>כל מה שצריך:</b> רק שם העסק שלכם. אנחנו נמצא אותו בשבילכם - בלי קוד, בלי הגדרות טכניות.
          </p>
          <div className="text-4xl font-extrabold text-foreground mb-1">
            ₪{REVIEWS_ADDON_PRICE_ILS} <span className="text-base font-medium text-muted-foreground">/ חודש + מע"מ</span>
          </div>
          <p className="text-xs text-muted-foreground mb-6">
            אין לכם עדיין כרטיס עסק בגוגל?{" "}
            <a href="https://www.google.com/business/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              פתחו כרטיס Google Business (חינם, 5 דקות)
            </a>
          </p>
          <button onClick={startPayment}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground font-bold px-8 h-12 hover:opacity-90 transition-opacity">
            <Sparkles className="w-5 h-5" /> שדרגו עכשיו · ₪{REVIEWS_ADDON_PRICE_ILS}/חודש + מע"מ
          </button>
        </motion.div>
      ) : !connected ? (
        /* Paid, not connected yet - find the business by name */
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="inline-flex items-center gap-2 text-sm text-primary bg-primary/10 rounded-full px-3 py-1">
            <Check className="w-4 h-4" /> השדרוג פעיל - חברו את העסק שלכם
          </div>
          <p className="text-sm text-muted-foreground">הקלידו את שם העסק שלכם (מומלץ להוסיף עיר), ונמצא אותו בגוגל:</p>
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="לדוגמה: פלאפל הזהב, רמת גן"
              className="flex-1 h-11 px-4 rounded-xl bg-background border border-border focus:border-primary focus:outline-none"
            />
            <button onClick={doSearch} disabled={searching}
              className="inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} חיפוש
            </button>
          </div>
          {results.map((c) => (
            <div key={c.placeId} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0">
                <div className="font-medium text-foreground truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground truncate">{c.address}</div>
                {c.rating != null && (
                  <div className="flex items-center gap-1 mt-1 text-sm"><Stars n={c.rating} /><span className="text-muted-foreground">{c.rating} ({c.total})</span></div>
                )}
              </div>
              <button onClick={() => pick(c)} disabled={busy}
                className="shrink-0 inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} זה אני
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Connected - show status + preview + controls */
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-muted-foreground">מחובר לעסק</div>
              <div className="font-bold text-foreground">{data?.google_business_name}</div>
              {cache?.rating != null && (
                <div className="flex items-center gap-2 mt-1"><Stars n={cache.rating} /><span className="text-sm text-muted-foreground">{cache.rating} · {cache.total} ביקורות</span></div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={showOnStore} onChange={(e) => toggleShow(e.target.checked)} className="accent-primary" />
                הצג בחנות
              </label>
              <button onClick={refresh} disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} רענון
              </button>
              <button onClick={() => updateBusiness.mutateAsync({ id: businessId!, google_place_id: null } as any).then(() => refetch())}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm hover:bg-muted">
                החלפת עסק
              </button>
            </div>
          </div>

          {/* Preview of the reviews as they'll appear */}
          <div className="grid gap-3 md:grid-cols-2">
            {(cache?.reviews || []).map((r: any, i: number) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{r.author}</span>
                  {r.rating != null && <Stars n={r.rating} />}
                </div>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-4">{r.text}</p>
                {r.when && <p className="text-xs text-muted-foreground/70 mt-2">{r.when}</p>}
              </div>
            ))}
          </div>
          <a href="https://business.google.com/" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ExternalLink className="w-4 h-4" /> ניהול כרטיס Google Business
          </a>
        </div>
      )}
    </div>
  );
};

export default DashboardReviews;
