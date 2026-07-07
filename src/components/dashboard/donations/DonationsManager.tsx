import { useState } from "react";
import { Plus, Heart, Loader2, FileText, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDonationCampaigns, useUpsertCampaign, useSection46Enabled } from "@/hooks/useDonations";

/**
 * Merchant-side donations management: campaigns + the Section 46 toggle
 * (OFF by default - the org must explicitly enable it; never assumed).
 * Feature-gated on the "donations" module. Needs the donations migration.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

const DonationsManager = ({ businessId }: { businessId: string }) => {
  const { data: campaigns = [], isLoading } = useDonationCampaigns(businessId);
  const { data: s46 } = useSection46Enabled(businessId);
  const upsert = useUpsertCampaign();
  const qc = useQueryClient();
  const [draft, setDraft] = useState({ title: "", goal: "" });
  const [saving46, setSaving46] = useState(false);

  const add = () => {
    if (!draft.title.trim()) return;
    upsert.mutate({ business_id: businessId, title: draft.title.trim(), goal_amount: draft.goal ? Number(draft.goal) : null },
      { onSuccess: () => setDraft({ title: "", goal: "" }) });
  };

  const toggle46 = async () => {
    setSaving46(true);
    const { error } = await sb.from("businesses").update({ section46_enabled: !s46 }).eq("id", businessId);
    setSaving46(false);
    if (error) { toast.error("שמירה נכשלה"); return; }
    qc.invalidateQueries({ queryKey: ["section46", businessId] });
    toast.success(!s46 ? "סעיף 46 הופעל" : "סעיף 46 כובה");
  };

  return (
    <div className="space-y-6">
      {/* Section 46 toggle */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
        <FileText className="w-5 h-5 text-primary shrink-0" />
        <div className="flex-1">
          <div className="font-medium text-foreground">קבלות סעיף 46</div>
          <div className="text-xs text-muted-foreground">הפעילו רק אם לעמותה יש אישור מוכר לצורכי מס. כבוי כברירת מחדל.</div>
        </div>
        <button onClick={toggle46} disabled={saving46}
          className={`w-12 h-6 rounded-full flex items-center px-0.5 transition-colors ${s46 ? "bg-primary justify-end" : "bg-muted justify-start"}`}>
          <span className="w-5 h-5 rounded-full bg-white shadow" />
        </button>
      </div>

      {/* Campaigns */}
      <div>
        <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2"><Heart className="w-5 h-5 text-primary" /> קמפיינים</h3>
        <div className="space-y-2 mb-3">
          {isLoading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
          {campaigns.map((c) => {
            const pct = c.goal_amount ? Math.min(100, Math.round((c.raised_cached / c.goal_amount) * 100)) : 0;
            return (
              <div key={c.id} className="p-3 rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-medium text-foreground">{c.title}</span>
                  <span className="text-xs text-muted-foreground">₪{c.raised_cached.toLocaleString()}{c.goal_amount ? ` / ₪${c.goal_amount.toLocaleString()}` : ""}</span>
                </div>
                {c.goal_amount != null && (
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            );
          })}
          {!isLoading && campaigns.length === 0 && <p className="text-sm text-muted-foreground">עדיין אין קמפיינים.</p>}
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <Input placeholder="שם הקמפיין" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="max-w-[200px]" />
          <div className="relative"><Target className="w-4 h-4 text-muted-foreground absolute right-2 top-3" /><Input placeholder="יעד ₪" value={draft.goal} onChange={(e) => setDraft({ ...draft, goal: e.target.value })} className="max-w-[120px] pr-8" /></div>
          <Button onClick={add} disabled={upsert.isPending}><Plus className="w-4 h-4 ml-1" /> קמפיין חדש</Button>
        </div>
      </div>
    </div>
  );
};

export default DonationsManager;
