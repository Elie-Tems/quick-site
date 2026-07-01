import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3, Check, Loader2, Lock, Save, Crown, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateBusiness } from "@/hooks/useBusiness";
import { getTagsPaymentUrl, TAGS_ADDON_PRICE_ILS } from "@/lib/publishPaymentConfig";
import { toast } from "sonner";

/**
 * "Marketing tags" add-on (one-time ₪149 + VAT): the merchant pastes their own
 * tracking tags (GTM / GA4 / Meta Pixel / Google Ads / TikTok / custom head) and
 * Siango injects them into their published store. Locked behind tracking_paid.
 */

interface Props {
  businessId: string | undefined;
}

type TrackingRow = {
  tracking_paid: boolean | null;
  tracking_gtm_id: string | null;
  tracking_ga4_id: string | null;
  tracking_meta_pixel: string | null;
  tracking_google_ads: string | null;
  tracking_tiktok_pixel: string | null;
  tracking_custom_head: string | null;
};

const FIELDS: { key: keyof TrackingRow; label: string; placeholder: string; hint: string; dir?: "ltr" }[] = [
  { key: "tracking_gtm_id", label: "Google Tag Manager", placeholder: "GTM-XXXXXXX", hint: "מנהל התגים של גוגל - מומלץ, מנהל את כל שאר התגים במקום אחד.", dir: "ltr" },
  { key: "tracking_ga4_id", label: "Google Analytics 4", placeholder: "G-XXXXXXXXXX", hint: "מזהה מדידה של GA4.", dir: "ltr" },
  { key: "tracking_meta_pixel", label: "Meta / Facebook Pixel", placeholder: "123456789012345", hint: "מזהה הפיקסל של פייסבוק/אינסטגרם (ספרות בלבד).", dir: "ltr" },
  { key: "tracking_google_ads", label: "Google Ads", placeholder: "AW-XXXXXXXXX", hint: "מזהה המרות של Google Ads.", dir: "ltr" },
  { key: "tracking_tiktok_pixel", label: "TikTok Pixel", placeholder: "CXXXXXXXXXXXXXXXXX", hint: "מזהה הפיקסל של טיקטוק.", dir: "ltr" },
];

const DashboardTracking = ({ businessId }: Props) => {
  const updateBusiness = useUpdateBusiness();
  const [form, setForm] = useState<Partial<TrackingRow>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["biz-tracking", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("businesses")
        .select(
          "tracking_paid,tracking_gtm_id,tracking_ga4_id,tracking_meta_pixel,tracking_google_ads,tracking_tiktok_pixel,tracking_custom_head",
        )
        .eq("id", businessId)
        .maybeSingle();
      return data as TrackingRow | null;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const paid = !!data?.tracking_paid;

  const save = async () => {
    if (!businessId) return;
    try {
      await updateBusiness.mutateAsync({
        id: businessId,
        tracking_gtm_id: form.tracking_gtm_id?.trim() || null,
        tracking_ga4_id: form.tracking_ga4_id?.trim() || null,
        tracking_meta_pixel: form.tracking_meta_pixel?.trim() || null,
        tracking_google_ads: form.tracking_google_ads?.trim() || null,
        tracking_tiktok_pixel: form.tracking_tiktok_pixel?.trim() || null,
        tracking_custom_head: form.tracking_custom_head?.trim() || null,
      } as any);
      toast.success("התגים נשמרו! מתעדכן בחנות שלך.");
      refetch();
    } catch {
      toast.error("שגיאה בשמירת התגים");
    }
  };

  const startPayment = () => {
    const url = getTagsPaymentUrl();
    if (!url) {
      toast.info("התשלום ייפתח כאן בקרוב. נציג ייצור איתך קשר להפעלה 🙏");
      return;
    }
    window.location.href = url;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" /> תגי שיווק ומעקב
        </h1>
        <p className="text-muted-foreground mt-1">
          חברו את כלי הפרסום שלכם לחנות - Google Tag Manager, פיקסל של פייסבוק/מטא, Google Ads, טיקטוק ועוד.
          כך תוכלו למדוד קמפיינים, לבנות קהלי ריטרגטינג ולמטב פרסום.
        </p>
      </div>

      {!paid ? (
        /* Paywall */
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-8 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">שדרוג חד-פעמי: חיבור כלי פרסום</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-6">
            הפעלה חד-פעמית שמאפשרת לכם להדביק את כל מזהי המעקב שלכם, ואנחנו מזריקים אותם אוטומטית לחנות -
            בלי מתכנת. כל מי שמפרסם בגוגל/פייסבוק/טיקטוק חייב את זה כדי למדוד ולמטב.
          </p>
          <div className="flex flex-col items-center gap-1 mb-6">
            <div className="text-4xl font-extrabold text-foreground">
              ₪{TAGS_ADDON_PRICE_ILS} <span className="text-base font-medium text-muted-foreground">+ מע"מ</span>
            </div>
            <div className="text-sm text-muted-foreground">תשלום חד-פעמי · גישה לכל החיים</div>
          </div>
          <ul className="text-sm text-foreground/90 max-w-md mx-auto space-y-2 mb-7 text-right">
            {[
              "Google Tag Manager + Google Analytics 4",
              "פיקסל פייסבוק / אינסטגרם (Meta)",
              "Google Ads + טיקטוק פיקסל",
              "שדה קוד מותאם אישית לכל תג אחר",
              "מדידת המרות, ריטרגטינג ומיטוב קמפיינים",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary shrink-0" /> {t}
              </li>
            ))}
          </ul>
          <button
            onClick={startPayment}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground font-bold px-8 h-12 hover:opacity-90 transition-opacity"
          >
            <Crown className="w-5 h-5" /> שדרגו עכשיו · ₪{TAGS_ADDON_PRICE_ILS} + מע"מ
          </button>
        </motion.div>
      ) : (
        /* Active - the form */
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 text-sm text-primary bg-primary/10 rounded-full px-3 py-1">
            <Check className="w-4 h-4" /> השדרוג פעיל - הזינו את המזהים והם יוזרקו לחנות
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="rounded-2xl border border-border bg-card p-4">
                <label className="block text-sm font-semibold text-foreground mb-1">{f.label}</label>
                <input
                  value={(form[f.key] as string) || ""}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  dir={f.dir}
                  className="w-full h-11 px-3 rounded-xl bg-background border border-border text-foreground focus:border-primary focus:outline-none"
                  style={f.dir === "ltr" ? { textAlign: "left" } : undefined}
                />
                <p className="text-xs text-muted-foreground mt-1.5">{f.hint}</p>
              </div>
            ))}
          </div>

          {/* Custom head code (advanced) */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <label className="block text-sm font-semibold text-foreground mb-1">קוד מותאם אישית (מתקדם)</label>
            <textarea
              value={form.tracking_custom_head || ""}
              onChange={(e) => setForm((s) => ({ ...s, tracking_custom_head: e.target.value }))}
              placeholder={'<!-- כל תג/סקריפט אחר שתרצו, יוזרק ל-<head> של החנות -->'}
              rows={4}
              dir="ltr"
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm font-mono focus:border-primary focus:outline-none"
              style={{ textAlign: "left" }}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              לכל תג אחר (לינקדאין, פינטרסט, סנאפצ'אט וכו'). הקוד מוזרק כפי שהוא - הזינו רק קוד ממקור שאתם סומכים עליו.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={updateBusiness.isPending}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground font-bold px-7 h-12 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {updateBusiness.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              שמירת התגים
            </button>
            <a
              href="https://tagmanager.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-4 h-4" /> פתיחת Google Tag Manager
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardTracking;
