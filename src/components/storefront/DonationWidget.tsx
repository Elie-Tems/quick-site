import { useState } from "react";
import { Heart, Repeat, ShieldCheck, Loader2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDonationCampaigns, useSection46Enabled } from "@/hooks/useDonations";

/**
 * Storefront donation widget. Amount presets + one-time/recurring toggle;
 * the Section 46 receipt line shows ONLY if the org enabled it. Submits to the
 * donation-create edge function (reuses the store's payment engine; recurring
 * saves a card token for monthly cc/bill). Rendered by StorefrontVertical when
 * the business has the "donations" module.
 */

const AMOUNTS = [50, 100, 250, 500];

const DonationWidget = ({ businessId }: { businessId: string }) => {
  const { data: campaigns = [] } = useDonationCampaigns(businessId);
  const { data: s46 } = useSection46Enabled(businessId);
  const [amount, setAmount] = useState(100);
  const [custom, setCustom] = useState("");
  const [monthly, setMonthly] = useState(false);
  const [donor, setDonor] = useState({ name: "", email: "", phone: "" });
  const [campaignId, setCampaignId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const finalAmount = custom ? Number(custom) : amount;

  const donate = async () => {
    if (!donor.name || (!donor.email && !donor.phone) || finalAmount <= 0) {
      toast.error("מלאו סכום, שם ואימייל/טלפון");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("donation-create", {
      body: { businessId, amount: finalAmount, recurring: monthly, campaignId, donor },
    });
    setLoading(false);
    if (error || (data as { error?: string })?.error) { toast.error("שגיאה בתרומה, נסו שוב"); return; }
    if ((data as { paymentUrl?: string })?.paymentUrl) { window.location.href = (data as { paymentUrl: string }).paymentUrl; return; }
    toast.success("תודה על תרומתך! 💚");
  };

  return (
    <section className="max-w-5xl mx-auto px-4 py-8 grid lg:grid-cols-5 gap-6">
      {/* Donation form */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
          <h2 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2"><Heart className="w-6 h-6 text-primary" /> תרומה</h2>
          {s46 && <p className="text-xs text-muted-foreground mb-4">כולל קבלה מוכרת לצורכי מס (סעיף 46)</p>}

          <div className="flex p-1 rounded-xl bg-muted mb-4">
            {[["month", "הוראת קבע"], ["once", "חד-פעמי"]].map(([k, label]) => (
              <button key={k} onClick={() => setMonthly(k === "month")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5 ${(monthly ? "month" : "once") === k ? "bg-primary text-white" : "text-muted-foreground"}`}>
                {k === "month" && <Repeat className="w-3.5 h-3.5" />} {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2 mb-2">
            {AMOUNTS.map((a) => (
              <button key={a} onClick={() => { setAmount(a); setCustom(""); }}
                className={`py-3 rounded-xl border font-bold ${!custom && amount === a ? "bg-primary text-white border-primary" : "border-border text-foreground"}`}>₪{a}</button>
            ))}
          </div>
          <Input placeholder="סכום אחר" value={custom} onChange={(e) => setCustom(e.target.value)} className="mb-3" />

          <div className="space-y-2 mb-4">
            <Input placeholder="שם מלא" value={donor.name} onChange={(e) => setDonor({ ...donor, name: e.target.value })} />
            <Input placeholder="אימייל" value={donor.email} onChange={(e) => setDonor({ ...donor, email: e.target.value })} />
            <Input placeholder="טלפון" value={donor.phone} onChange={(e) => setDonor({ ...donor, phone: e.target.value })} />
          </div>

          <Button className="w-full" onClick={donate} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Heart className="w-4 h-4 ml-1" /> תרמו ₪{finalAmount || 0}{monthly ? " לחודש" : ""}</>}
          </Button>
          <div className="flex items-center gap-2 justify-center mt-3 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" /> תשלום מאובטח{s46 ? " · קבלה לסעיף 46" : ""}
          </div>
        </div>
      </div>

      {/* Campaigns */}
      <div className="lg:col-span-3">
        <h2 className="text-2xl font-bold text-foreground mb-4">קמפיינים</h2>
        <div className="space-y-3">
          {campaigns.length === 0 && <p className="text-sm text-muted-foreground">תרומה כללית תסייע בכל הפעילות.</p>}
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
