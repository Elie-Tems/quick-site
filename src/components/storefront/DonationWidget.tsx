import { useState } from "react";
import { Heart, ShieldCheck, Loader2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDonationCampaigns, useSection46Enabled } from "@/hooks/useDonations";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Storefront donation widget. One-time gift with amount presets (the merchant's
 * configured amounts, or a sensible default); the Section 46 receipt line shows
 * ONLY if the org enabled it. Submits to the donation-create edge function
 * (reuses the store's payment engine). Rendered by StorefrontVertical when the
 * business has the "donations" module.
 */

const DEFAULT_AMOUNTS = [50, 100, 250, 500];

const DonationWidget = ({ businessId, donationAmounts }: { businessId: string; donationAmounts?: number[] }) => {
  const { t } = useLanguage();
  const { data: campaigns = [] } = useDonationCampaigns(businessId);
  const { data: s46 } = useSection46Enabled(businessId);
  const AMOUNTS = (donationAmounts && donationAmounts.length > 0) ? donationAmounts : DEFAULT_AMOUNTS;
  const [amount, setAmount] = useState(AMOUNTS[1] ?? AMOUNTS[0] ?? 100);
  const [custom, setCustom] = useState("");
  const [donor, setDonor] = useState({ name: "", email: "", phone: "", idNumber: "" });
  const [anonymous, setAnonymous] = useState(false);
  const [campaignId, setCampaignId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const finalAmount = custom ? Number(custom) : amount;

  const donate = async () => {
    if (!donor.name || (!donor.email && !donor.phone) || finalAmount <= 0) {
      toast.error(t("store.donation.toast_fill_required"));
      return;
    }
    // For a Section-46 credit the donation is reported to תרומות ישראל, which
    // requires the donor's ID - unless they chose to give anonymously (no credit).
    if (s46 && !anonymous && donor.idNumber.trim().length < 5) {
      toast.error(t("store.donation.toast_id_required"));
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("donation-create", {
      body: { businessId, amount: finalAmount, campaignId, donor: { ...donor, anonymous } },
    });
    setLoading(false);
    if (error || (data as { error?: string })?.error) { toast.error(t("store.donation.toast_error")); return; }
    if ((data as { paymentUrl?: string })?.paymentUrl) { window.location.href = (data as { paymentUrl: string }).paymentUrl; return; }
    toast.success(t("store.donation.toast_thank_you"));
  };

  return (
    <section className="max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-5 gap-6">
      {/* Donation form */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
          <h2 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2"><Heart className="w-6 h-6 text-primary" /> {t("store.donation.heading")}</h2>
          {s46 && <p className="text-xs text-muted-foreground mb-4">{t("store.donation.receipt_note")}</p>}

          <div className="grid grid-cols-4 gap-2 mb-2">
            {AMOUNTS.map((a) => (
              <button key={a} onClick={() => { setAmount(a); setCustom(""); }}
                className={`py-3 rounded-xl border font-bold ${!custom && amount === a ? "bg-primary text-white border-primary" : "border-border text-foreground"}`}>₪{a}</button>
            ))}
          </div>
          <Input placeholder={t("store.donation.custom_amount_placeholder")} value={custom} onChange={(e) => setCustom(e.target.value)} className="mb-3" />

          <div className="space-y-2 mb-4">
            <Input placeholder={t("store.donation.name_placeholder")} value={donor.name} onChange={(e) => setDonor({ ...donor, name: e.target.value })} />
            <Input placeholder={t("store.donation.email_placeholder")} value={donor.email} onChange={(e) => setDonor({ ...donor, email: e.target.value })} />
            <Input placeholder={t("store.donation.phone_placeholder")} value={donor.phone} onChange={(e) => setDonor({ ...donor, phone: e.target.value })} />

            {/* Section 46 -> reported to תרומות ישראל, which needs the donor's ID. */}
            {s46 && !anonymous && (
              <Input placeholder={t("store.donation.id_number_placeholder")} inputMode="numeric" value={donor.idNumber}
                onChange={(e) => setDonor({ ...donor, idNumber: e.target.value.replace(/\D/g, "").slice(0, 9) })} />
            )}
            {s46 && (
              <>
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pt-0.5">
                  <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="accent-primary" />
                  {t("store.donation.anonymous_label")}
                </label>
                {!anonymous && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t("store.donation.s46_report_note")}
                  </p>
                )}
              </>
            )}
          </div>

          <Button className="w-full" onClick={donate} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Heart className="w-4 h-4 ml-1" /> {t("store.donation.donate_button").replace("{amount}", String(finalAmount || 0))}</>}
          </Button>
          <div className="flex items-center gap-2 justify-center mt-3 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" /> {t("store.donation.secure_payment")}{s46 ? ` · ${t("store.donation.s46_receipt_suffix")}` : ""}
          </div>
        </div>
      </div>

      {/* Campaigns */}
      <div className="lg:col-span-3">
        <h2 className="text-2xl font-bold text-foreground mb-4">{t("store.donation.campaigns_heading")}</h2>
        <div className="space-y-3">
          {campaigns.length === 0 && <p className="text-sm text-muted-foreground">{t("store.donation.general_donation_note")}</p>}
          {campaigns.map((c) => {
            const pct = c.goal_amount ? Math.min(100, Math.round((c.raised_cached / c.goal_amount) * 100)) : 0;
            return (
              <button key={c.id} onClick={() => setCampaignId(campaignId === c.id ? undefined : c.id)}
                className={`w-full text-right rounded-2xl border p-4 transition-colors ${campaignId === c.id ? "border-primary ring-1 ring-primary/30" : "border-border"} bg-card`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-foreground">{c.title}</span>
                  {c.goal_amount != null && <span className="text-xs text-muted-foreground flex items-center gap-1"><Target className="w-3 h-3" /> ₪{c.raised_cached.toLocaleString()} / ₪{c.goal_amount.toLocaleString()}</span>}
                </div>
                {c.goal_amount != null && <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default DonationWidget;
