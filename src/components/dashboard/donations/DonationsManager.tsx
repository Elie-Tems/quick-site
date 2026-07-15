import { useState } from "react";
import { Plus, Heart, Loader2, FileText, Target, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useDonationCampaigns, useUpsertCampaign, useSection46Enabled, useDonationReporting, useSaveDonationReporting, type ReceiptProvider } from "@/hooks/useDonations";

// Israeli receipt providers - all implement the same Tax Authority "מודל תרומות" API.
// iCount is fully automated today; the rest run in record mode until we add their adapter.
const PROVIDERS: { id: ReceiptProvider; label: string; auto: boolean }[] = [
  { id: "icount", label: "iCount (אוטומטי מלא)", auto: true },
  { id: "morning", label: "מורנינג / חשבונית ירוקה", auto: false },
  { id: "rivhit", label: "ריווחית", auto: false },
  { id: "sumit", label: "SUMIT (סאמיט)", auto: false },
  { id: "self", label: "אחר / דיווח עצמאי", auto: false },
];

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

  const { data: reporting } = useDonationReporting(businessId);
  const saveReporting = useSaveDonationReporting();
  const [rep, setRep] = useState<{ number46: string; provider?: ReceiptProvider; apiToken: string; companyId: string }>({ number46: "", provider: undefined, apiToken: "", companyId: "" });
  const number46 = rep.number46 || reporting?.number46 || "";
  const provider: ReceiptProvider = rep.provider ?? reporting?.provider ?? "icount";
  const isAuto = provider === "icount"; // only iCount auto-issues today

  const submitReporting = (enabled: boolean) => {
    saveReporting.mutate(
      { businessId, number46, provider, apiToken: rep.apiToken.trim() || undefined, companyId: rep.companyId.trim() || undefined, enabled },
      {
        onSuccess: (r) => {
          setRep((s) => ({ ...s, apiToken: "" }));
          if (r.blocked) toast.error(r.blocked);
          else toast.success(r.enabled ? "דיווח לתרומות ישראל הופעל" : "נשמר");
        },
        onError: () => toast.error("שמירה נכשלה"),
      },
    );
  };

  // Export all paid donations (with donor ID / allocation number) as CSV, so a
  // record-mode org can actually issue the allocation-numbered receipts it was
  // promised it could - and so any org can reconcile. Real data only.
  const [exporting, setExporting] = useState(false);
  const exportDonations = async () => {
    setExporting(true);
    try {
      const { data, error } = await sb.from("transactions")
        .select("amount, created_at, details")
        .eq("business_id", businessId).eq("kind", "donation").eq("status", "paid")
        .order("created_at", { ascending: false }).limit(5000);
      if (error) throw error;
      const rows = (data || []) as { amount: number; created_at: string; details: Record<string, unknown> | null }[];
      if (!rows.length) { toast.info("אין עדיין תרומות לייצוא"); return; }
      const header = ["תאריך", "סכום", "שם התורם", "תעודת זהות", "אימייל", "טלפון", "מספר הקצאה"];
      const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const body = rows.map((r) => {
        const d = r.details || {};
        return [
          new Date(r.created_at).toLocaleDateString("he-IL"),
          Number(r.amount) || 0,
          d.donor_name, d.donor_id_number, d.donor_email, d.donor_phone, d.receipt_allocation_number,
        ].map(esc).join(",");
      });
      const csv = "﻿" + [header.map(esc).join(","), ...body].join("\r\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `donations-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch { toast.error("ייצוא התרומות נכשל"); }
    finally { setExporting(false); }
  };

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

      {/* תרומות ישראל reporting (only relevant once Section 46 is on). From 1.1.2026
          every credit-eligible donation must be reported to the Tax Authority. */}
      {s46 && (
        <div className="p-4 rounded-xl border border-border bg-card space-y-3">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-foreground">דיווח לתרומות ישראל (רשות המסים)</div>
              <div className="text-xs text-muted-foreground">חובה מ-1.1.2026: כל תרומה מזכה מדווחת אוטומטית ומקבלת מספר הקצאה. הזיכוי מופיע לתורם באזור האישי - בלי קבלת PDF.</div>
            </div>
            <span className={`text-[11px] font-medium rounded-full px-2.5 py-1 ${reporting?.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {reporting?.enabled ? "פעיל" : "כבוי"}
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <Input placeholder="מספר מוסד (46)" value={number46} onChange={(e) => setRep({ ...rep, number46: e.target.value })} />
            <select
              value={provider}
              onChange={(e) => setRep({ ...rep, provider: e.target.value as ReceiptProvider })}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
              {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          {/* iCount = full automation: we need its API token to issue + report. */}
          {isAuto && (
            <div className="grid sm:grid-cols-2 gap-2">
              <Input placeholder={reporting?.hasToken ? "טוקן iCount (שמור)" : "טוקן API של iCount"} type="password" value={rep.apiToken} onChange={(e) => setRep({ ...rep, apiToken: e.target.value })} />
              <Input placeholder="מזהה חברה ב-iCount (אופציונלי)" value={rep.companyId} onChange={(e) => setRep({ ...rep, companyId: e.target.value })} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => submitReporting(true)} disabled={saveReporting.isPending}>
              {saveReporting.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "הפעל דיווח"}
            </Button>
            {reporting?.enabled && (
              <Button size="sm" variant="outline" onClick={() => submitReporting(false)} disabled={saveReporting.isPending}>כבה</Button>
            )}
          </div>
          {isAuto ? (
            <p className="text-[11px] text-muted-foreground">הטוקן מ-iCount (הגדרות ← API). iCount מפיק את קבלת התרומה, מדווח לרשות המסים ומחזיר מספר הקצאה - הכל אוטומטית. מומלץ לבצע תרומת בדיקה קטנה לפני הפעלה מלאה.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-muted-foreground">אוטומציה מלאה לספק הזה בקרוב. בינתיים: המערכת שומרת את פרטי התורם (כולל ת״ז), <b>ואתם מפיקים את הקבלה עם מספר ההקצאה דרך {PROVIDERS.find((p) => p.id === provider)?.label} שכבר מחובר לרשות המסים.</b> ייצאו את רשימת התרומות והפיקו את הקבלות אצל הספק.</p>
              <Button size="sm" variant="outline" onClick={exportDonations} disabled={exporting}>
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4 ml-1.5" /> ייצוא תרומות (CSV)</>}
              </Button>
            </div>
          )}
        </div>
      )}

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
