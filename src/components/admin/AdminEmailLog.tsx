import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Mail, Search, CheckCircle2, Eye, AlertTriangle, Clock, Ban } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

/**
 * Platform email audit (super-admin): every lifecycle/transactional email Siango
 * sends is logged on send, then flipped to delivered/opened by the Resend webhook.
 * Answers "what was sent, delivered, and opened".
 */
interface EmailRow {
  id: string;
  email_type: string;
  to_email: string;
  subject: string | null;
  status: string;
  provider_id: string | null;
  error: string | null;
  sent_at: string;
  delivered_at: string | null;
  opened_at: string | null;
  bounced_at: string | null;
}

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  opened:     { label: "נפתח",     cls: "bg-green-100 text-green-700",   icon: Eye },
  delivered:  { label: "נמסר",     cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  sent:       { label: "נשלח",     cls: "bg-blue-100 text-blue-700",     icon: Mail },
  failed:     { label: "נכשל",     cls: "bg-red-100 text-red-700",       icon: AlertTriangle },
  bounced:    { label: "הוחזר",    cls: "bg-red-100 text-red-700",       icon: Ban },
  complained: { label: "תלונה",    cls: "bg-orange-100 text-orange-700", icon: AlertTriangle },
  skipped:    { label: "דולג",     cls: "bg-slate-100 text-slate-600",   icon: Ban },
  delayed:    { label: "מתעכב",    cls: "bg-amber-100 text-amber-700",   icon: Clock },
};

const AdminEmailLog = () => {
  const [search, setSearch] = useState("");

  const { data: rows, isLoading } = useQuery({
    queryKey: ["platform-email-log"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("platform_email_log")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(300);
      return (data || []) as EmailRow[];
    },
    refetchInterval: 15000,
  });

  const filtered = (rows ?? []).filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.to_email?.toLowerCase().includes(s) || r.email_type?.toLowerCase().includes(s) || r.subject?.toLowerCase().includes(s);
  });

  const total = rows?.length ?? 0;
  const delivered = rows?.filter((r) => r.delivered_at || r.status === "opened").length ?? 0;
  const opened = rows?.filter((r) => r.opened_at).length ?? 0;
  const failed = rows?.filter((r) => r.status === "failed" || r.status === "bounced").length ?? 0;

  const fmt = (t: string | null) => (t ? format(new Date(t), "dd/MM HH:mm", { locale: he }) : "-");

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "נשלחו", value: total, color: "text-foreground" },
          { label: "נמסרו", value: delivered, color: "text-emerald-600" },
          { label: "נפתחו", value: opened, color: "text-green-600" },
          { label: "נכשלו/הוחזרו", value: failed, color: "text-red-600" },
        ].map((k) => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חפש לפי מייל, סוג, נושא..." className="pr-9" dir="rtl" />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-right font-medium px-3 py-2">סטטוס</th>
                <th className="text-right font-medium px-3 py-2">נמען</th>
                <th className="text-right font-medium px-3 py-2">סוג</th>
                <th className="text-right font-medium px-3 py-2 hidden md:table-cell">נשלח</th>
                <th className="text-right font-medium px-3 py-2 hidden md:table-cell">נמסר</th>
                <th className="text-right font-medium px-3 py-2 hidden md:table-cell">נפתח</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">טוען...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">אין מיילים עדיין (יופיעו כאן ברגע שיישלחו).</td></tr>
              ) : (
                filtered.map((r) => {
                  const st = STATUS[r.status] || STATUS.sent;
                  const Icon = st.icon;
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${st.cls}`}>
                          <Icon className="h-3 w-3" /> {st.label}
                        </span>
                        {r.error && <span className="block text-[10px] text-red-500 mt-0.5 truncate max-w-[160px]" dir="ltr">{r.error}</span>}
                      </td>
                      <td className="px-3 py-2 truncate max-w-[200px]" dir="ltr">{r.to_email}</td>
                      <td className="px-3 py-2" dir="ltr">{r.email_type}</td>
                      <td className="px-3 py-2 hidden md:table-cell text-muted-foreground">{fmt(r.sent_at)}</td>
                      <td className="px-3 py-2 hidden md:table-cell text-muted-foreground">{fmt(r.delivered_at)}</td>
                      <td className="px-3 py-2 hidden md:table-cell text-muted-foreground">{fmt(r.opened_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        מתעדכן אוטומטית. "נמסר" ו"נפתח" מגיעים מ-Webhook של Resend (יש להגדיר אותו פעם אחת ב-Resend → Webhooks).
      </p>
    </div>
  );
};

export default AdminEmailLog;
