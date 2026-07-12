import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Star, Check, Loader2, Lock, Search, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateBusiness } from "@/hooks/useBusiness";
import { REVIEWS_ADDON_PRICE_ILS } from "@/lib/publishPaymentConfig";
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

  // Is the Google reviews integration actually configured (Siango's Google key
  // present)? If not, the add-on can't fetch any reviews, so we must NOT let a
  // merchant pay for it. Defaults to "configured" until we hear otherwise so a
  // transient error never blocks a working feature.
  const { data: reviewsConfigured = true } = useQuery({
    queryKey: ["reviews-configured"],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("google-reviews", { body: { action: "status" } });
      return data?.configured !== false;
    },
  });

  const paid = !!data?.reviews_paid;
  const connected = !!data?.google_place_id;
  const cache = data?.google_reviews_cache;

  // Enable Google Reviews as a recurring subscription add-on: a prorated first
  // charge on the saved Cardcom card now, then ₪14+VAT/mo consolidated into the
  // subscription invoice. No redirect - charged server-side on the saved token.
  const startPayment = async () => {
    if (!businessId) return;
    if (!reviewsConfigured) {
      toast.error("התכונה בהקמה - חיבור הביקורות לגוגל טרם הופעל. אל דאגה, לא חויבתם.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("addon-subscribe", { body: { addon: "reviews", businessId } });
      if (error) throw error;
      if (data?.needsSubscription) { toast.error(data.message || "צריך מנוי פרסום פעיל כדי להוסיף ביקורות."); return; }
      if (data?.needsCard) { toast.error(data.message || "אין כרטיס שמור. יש לפרסם אתר תחילה."); return; }
      if (data?.declined) { toast.error(data.error || "התשלום נדחה. בדקו את הכרטיס ונסו שוב."); return; }
      if (!data?.ok) throw new Error(data?.error || "failed");
      toast.success(
        data.alreadyActive || data.alreadyCharged
          ? "ביקורות Google פעילות 🎉"
          : `ביקורות Google הופעלו! חויב חלק יחסי (₪${data.proratedIls ?? ""}) ומהחודש הבא ₪14+מע"מ יצטרף לחשבונית המנוי.`,
      );
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "לא הצלחנו להפעיל כרגע. נסו שוב.");
    } finally {
      setBusy(false);
    }
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

          {/* Mock storefront preview */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* browser bar */}
            <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/50 border-b border-border">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
              <div className="flex-1 mx-3 h-5 rounded bg-background text-[10px] text-muted-foreground flex items-center px-2">
                החנות שלך · siango.app
              </div>
              <span className="text-[10px] font-semibold text-muted-foreground bg-background rounded px-2 py-0.5 whitespace-nowrap">
                הדגמה
              </span>
            </div>

            <div className="p-5 space-y-4" dir="rtl">
              {/* section header */}
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">מה אומרים עלינו</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="flex">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
                  </div>
                  <span className="font-bold text-foreground text-lg">4.9</span>
                  <span className="text-sm text-muted-foreground">(127 ביקורות בגוגל)</span>
                </div>
              </div>

              {/* mock review cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { name: "דנה כ.", text: "שירות מדהים, המוצרים הגיעו מהר ובאריזה יפה. ממליצה בחום!", stars: 5 },
                  { name: "יוסי מ.", text: "קניתי כבר פעמיים ובכל פעם חוויה מצוינת. האיכות גבוהה והמחיר הוגן.", stars: 5 },
                  { name: "רונית ש.", text: "המוצר בדיוק כמו בתמונה. שירות לקוחות זמין ונעים, תודה!", stars: 5 },
                ].map((r, i) => (
                  <div key={i} className="rounded-xl border border-border bg-background p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                        {r.name[0]}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">{r.name}</div>
                        <div className="flex">
                          {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                        </div>
                      </div>
                      <div className="mr-auto">
                        <svg className="w-4 h-4 opacity-40" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{r.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* paywall card */}
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="flex-1 text-right space-y-2">
              <h2 className="text-lg font-bold text-foreground">הביקורות שלכם בגוגל - ישר בחנות</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                מחברים את כרטיס Google Business שלכם ואנחנו מציגים את הדירוג + הביקורות בדף הבית של החנות.<br />
                כל מה שצריך: <b>שם העסק</b>. אנחנו מוצאים אתכם ומחברים תוך רגע.
              </p>
              <p className="text-xs text-muted-foreground">
                אין לכם עדיין כרטיס בגוגל?{" "}
                <a href="https://www.google.com/business/" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  פתחו Google Business חינם (5 דקות)
                </a>
              </p>
            </div>
            <div className="text-center shrink-0 space-y-3">
              <div>
                <div className="text-3xl font-extrabold text-foreground">₪{REVIEWS_ADDON_PRICE_ILS}</div>
                <div className="text-xs text-muted-foreground">לחודש + מע"מ</div>
              </div>
              <button onClick={startPayment} disabled={!reviewsConfigured || busy}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 text-white font-bold px-6 h-11 hover:bg-amber-600 transition-colors whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed">
                <Star className="w-4 h-4 fill-white" /> {reviewsConfigured ? "הפעל עכשיו" : "בקרוב"}
              </button>
              {!reviewsConfigured && (
                <p className="text-xs text-muted-foreground max-w-[12rem]">
                  חיבור הביקורות לגוגל בהקמה - יופעל בקרוב.
                </p>
              )}
            </div>
          </div>
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
