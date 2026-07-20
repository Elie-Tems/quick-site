import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3, Check, Loader2, Lock, Save, Crown, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUpdateBusiness } from "@/hooks/useBusiness";
import { TAGS_ADDON_PRICE_ILS } from "@/lib/publishPaymentConfig";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

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

const FIELDS: { key: keyof TrackingRow; label: string; placeholder: string; hintKey: string; dir?: "ltr" }[] = [
  { key: "tracking_gtm_id", label: "Google Tag Manager", placeholder: "GTM-XXXXXXX", hintKey: "dash.tracking.hint_gtm", dir: "ltr" },
  { key: "tracking_ga4_id", label: "Google Analytics 4", placeholder: "G-XXXXXXXXXX", hintKey: "dash.tracking.hint_ga4", dir: "ltr" },
  { key: "tracking_meta_pixel", label: "Meta / Facebook Pixel", placeholder: "123456789012345", hintKey: "dash.tracking.hint_meta", dir: "ltr" },
  { key: "tracking_google_ads", label: "Google Ads", placeholder: "AW-XXXXXXXXX", hintKey: "dash.tracking.hint_google_ads", dir: "ltr" },
  { key: "tracking_tiktok_pixel", label: "TikTok Pixel", placeholder: "CXXXXXXXXXXXXXXXXX", hintKey: "dash.tracking.hint_tiktok", dir: "ltr" },
];

const DashboardTracking = ({ businessId }: Props) => {
  const { t } = useLanguage();
  const updateBusiness = useUpdateBusiness();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<TrackingRow>>({});
  const [paying, setPaying] = useState(false);

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
      toast.success(t("dash.tracking.toast_saved"));
      refetch();
    } catch {
      toast.error(t("dash.tracking.toast_save_error"));
    }
  };

  const startPayment = async () => {
    if (!businessId || paying) return;
    setPaying(true);
    try {
      // Charge the merchant's saved Cardcom token via the server-side charge-addon
      // engine (one-time, idempotent per requestId). tracking_paid flips only
      // after a confirmed charge - see supabase/functions/charge-addon.
      const requestId =
        (typeof crypto !== "undefined" && "randomUUID" in crypto)
          ? crypto.randomUUID()
          : `${businessId}-marketing_tags-${Date.now()}`;
      const { data, error } = await supabase.functions.invoke("charge-addon", {
        body: { product: "marketing_tags", businessId, requestId },
      });
      if (error) throw error;
      if (data?.ok) {
        toast.success(t("dash.tracking.toast_paid"));
        refetch();
        queryClient.invalidateQueries({ queryKey: ["biz-tracking", businessId] });
      } else if (data?.needsCard) {
        toast.error(data.message || t("dash.tracking.toast_no_card"));
      } else if (data?.declined) {
        toast.error(data.error || t("dash.tracking.toast_declined"));
      } else {
        toast.error(data?.error || t("dash.tracking.toast_generic_error"));
      }
    } catch {
      toast.error(t("dash.tracking.toast_comm_error"));
    } finally {
      setPaying(false);
    }
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
          <BarChart3 className="w-6 h-6 text-primary" /> {t("dash.tracking.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("dash.tracking.subtitle")}
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
          <h2 className="text-xl font-bold text-foreground mb-2">{t("dash.tracking.paywall_title")}</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-6">
            {t("dash.tracking.paywall_desc")}
          </p>
          <div className="flex flex-col items-center gap-1 mb-6">
            <div className="text-4xl font-extrabold text-foreground">
              ₪{TAGS_ADDON_PRICE_ILS} <span className="text-base font-medium text-muted-foreground">+ {t("dash.tracking.vat_short")}</span>
            </div>
            <div className="text-sm text-muted-foreground">{t("dash.tracking.one_time_lifetime")}</div>
          </div>
          <ul className="text-sm text-foreground/90 max-w-md mx-auto space-y-2 mb-7 text-right">
            {[
              t("dash.tracking.benefit_google"),
              t("dash.tracking.benefit_meta"),
              t("dash.tracking.benefit_other"),
              t("dash.tracking.benefit_onestop"),
              t("dash.tracking.benefit_conversion"),
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary shrink-0" /> {item}
              </li>
            ))}
          </ul>
          <button
            onClick={startPayment}
            disabled={paying}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground font-bold px-8 h-12 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crown className="w-5 h-5" />}
            {paying ? t("dash.tracking.charging") : `${t("dash.tracking.upgrade_now")} · ₪${TAGS_ADDON_PRICE_ILS} + ${t("dash.tracking.vat_short")}`}
          </button>
        </motion.div>
      ) : (
        /* Active - the form */
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 text-sm text-primary bg-primary/10 rounded-full px-3 py-1">
            <Check className="w-4 h-4" /> {t("dash.tracking.active_badge")}
          </div>

          <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-semibold mb-1">{t("dash.tracking.howto_title")}</p>
            <p className="leading-relaxed">
              {t("dash.tracking.howto_desc")}
            </p>
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
                <p className="text-xs text-muted-foreground mt-1.5">{t(f.hintKey)}</p>
              </div>
            ))}
          </div>

          {/* Custom head code (advanced) */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <label className="block text-sm font-semibold text-foreground mb-1">{t("dash.tracking.custom_head_label")}</label>
            <textarea
              value={form.tracking_custom_head || ""}
              onChange={(e) => setForm((s) => ({ ...s, tracking_custom_head: e.target.value }))}
              placeholder={`<!-- ${t("dash.tracking.custom_head_placeholder")} -->`}
              rows={4}
              dir="ltr"
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm font-mono focus:border-primary focus:outline-none"
              style={{ textAlign: "left" }}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              {t("dash.tracking.custom_head_hint")}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={updateBusiness.isPending}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary text-primary-foreground font-bold px-7 h-12 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {updateBusiness.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t("dash.tracking.save_button")}
            </button>
            <a
              href="https://tagmanager.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-4 h-4" /> {t("dash.tracking.open_gtm")}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardTracking;
