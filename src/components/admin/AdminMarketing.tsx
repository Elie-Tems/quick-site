import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Eye, UserPlus, Wallet, Coins, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAdminMarketing } from "@/hooks/useAdminMarketing";

const fmt = (n: number) => n.toLocaleString("he-IL");
const ils = (n: number) => `₪${fmt(Math.round(n))}`;

const RANGES = [
  { label: "7 ימים", days: 7 },
  { label: "30 ימים", days: 30 },
  { label: "90 ימים", days: 90 },
];

/**
 * Siango acquisition marketing (super-admin): budget per channel + the funnel
 * for Siango's own ad campaigns (ad clicks -> signups), per UTM source, with
 * cost per acquired signup. Channels are admin-editable here.
 */
const AdminMarketing = () => {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useAdminMarketing(days);
  const qc = useQueryClient();

  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [period, setPeriod] = useState("monthly");
  const [saving, setSaving] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-siango-marketing"] });

  const addChannel = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("siango_ad_channels").insert({
        name: name.trim(),
        budget_amount: Number(budget) || 0,
        budget_period: period,
      });
      if (error) throw error;
      setName(""); setBudget("");
      toast.success("הערוץ נוסף ✓");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setSaving(false);
    }
  };

  const updateBudget = async (id: string, amount: number) => {
    await (supabase as any).from("siango_ad_channels").update({ budget_amount: amount, updated_at: new Date().toISOString() }).eq("id", id);
    refresh();
  };

  const removeChannel = async (id: string) => {
    await (supabase as any).from("siango_ad_channels").delete().eq("id", id);
    refresh();
  };

  const stats = [
    { label: "תקציב פרסום (סה\"כ)", value: data ? ils(data.totals.budget) : undefined, icon: Wallet },
    { label: "צפיות / קליקים", value: data ? fmt(data.totals.views) : undefined, icon: Eye },
    { label: "הרשמות מפרסום", value: data ? fmt(data.totals.signups) : undefined, icon: UserPlus },
    { label: "עלות להרשמה", value: data ? (data.totals.costPerSignup ? ils(data.totals.costPerSignup) : "-") : undefined, icon: Coins },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Megaphone className="w-7 h-7 text-primary shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-foreground">פרסום ושיווק (סיאנגו)</h2>
            <p className="text-sm text-muted-foreground mt-0.5">הקמפיינים שלנו לגיוס סוחרים: תקציב לכל ערוץ, ומשפך מלא (קליקים → הרשמות) לכל מקור.</p>
          </div>
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {RANGES.map((r) => (
            <button key={r.days} onClick={() => setDays(r.days)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${days === r.days ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold text-foreground truncate">{isLoading || s.value === undefined ? "…" : s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Channels + budgets (editable) */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground mb-3">תקציב פרסום לפי ערוץ</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם ערוץ (פייסבוק, גוגל...)"
            className="flex-1 min-w-[140px] rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={budget} onChange={(e) => setBudget(e.target.value)} type="number" placeholder="תקציב ₪"
            className="w-28 rounded-lg border border-border bg-background px-3 py-2 text-sm" dir="ltr" />
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
            <option value="monthly">חודשי</option>
            <option value="weekly">שבועי</option>
            <option value="custom">חד-פעמי</option>
          </select>
          <button onClick={addChannel} disabled={saving || !name.trim()}
            className="rounded-lg bg-primary text-white px-4 py-2 text-sm font-medium flex items-center gap-1.5 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} הוסף
          </button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">טוען...</p>
        ) : !data?.channels.length ? (
          <p className="text-sm text-muted-foreground">עדיין לא הוגדרו ערוצי פרסום. הוסיפו את הערוץ הראשון למעלה.</p>
        ) : (
          <div className="space-y-2">
            {data.channels.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <span className="flex-1 font-medium text-foreground">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.budget_period === "monthly" ? "חודשי" : c.budget_period === "weekly" ? "שבועי" : "חד-פעמי"}</span>
                <div className="relative">
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₪</span>
                  <input
                    type="number" defaultValue={c.budget_amount} dir="ltr"
                    onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== c.budget_amount) updateBudget(c.id, v); }}
                    className="w-28 rounded-lg border border-border bg-background pr-6 pl-2 py-1.5 text-sm text-left"
                  />
                </div>
                <button onClick={() => removeChannel(c.id)} className="text-muted-foreground hover:text-destructive p-1" title="מחק">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Source funnel */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground mb-3">משפך לפי מקור (כל לינק/קמפיין)</h3>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">טוען...</p>
        ) : !data?.sources.length ? (
          <p className="text-sm text-muted-foreground">אין עדיין נתוני פרסום מתויגי-UTM לתקופה זו. הוסיפו <span dir="ltr">?utm_source=...&utm_campaign=...</span> ללינקים בקמפיינים.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-right font-medium py-2">מקור</th>
                  <th className="text-left font-medium py-2">צפיות/קליקים</th>
                  <th className="text-left font-medium py-2">הרשמות</th>
                  <th className="text-left font-medium py-2">יחס המרה</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map((s) => (
                  <tr key={s.source} className="border-b border-border/50">
                    <td className="py-2.5 text-foreground font-medium" dir="ltr">{s.source}</td>
                    <td className="py-2.5 text-left text-foreground">{fmt(s.views)}</td>
                    <td className="py-2.5 text-left text-primary font-medium">{fmt(s.signups)}</td>
                    <td className="py-2.5 text-left text-muted-foreground">{s.convRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          הרשמות מיוחסות ל-UTM שדרכו הגיע הנרשם (תפיסת first-touch בכניסה לאתר). הצפיות נספרות בכל כניסה מלינק עם <span dir="ltr">utm_source</span>.
        </p>
      </div>
    </div>
  );
};

export default AdminMarketing;
