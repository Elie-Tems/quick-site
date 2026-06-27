import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Download, MailX, Search, Plus, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Admin suppression list (Chok HaSpam evidence). Shows every unsubscribe -
 * Siango-platform rows (business_id NULL) and per-store rows - with the reason
 * the recipient gave. Supports manual add, bulk import, and CSV export so the
 * list is auditable and portable.
 */

type Row = {
  id: string;
  email: string;
  reason: string | null;
  reason_detail: string | null;
  source: string;
  unsubscribed_at: string;
  business_id: string | null;
  businesses?: { name?: string } | null;
};

const REASON_LABELS: Record<string, string> = {
  too_many: "יותר מדי מיילים",
  not_relevant: "תוכן לא רלוונטי",
  never_signed_up: "לא נרשם/ה",
  no_longer_interested: "כבר לא מעוניין/ת",
  other: "אחר",
};

const SOURCE_LABELS: Record<string, string> = {
  email_link: "לינק במייל",
  manual: "הוספה ידנית",
  import: "ייבוא",
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });

const AdminUnsubscribes = () => {
  const [scope, setScope] = useState<"all" | "platform" | "store">("all");
  const [q, setQ] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [bulk, setBulk] = useState("");
  const [showImport, setShowImport] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-unsubscribes"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("email_unsubscribes")
        .select("id,email,reason,reason_detail,source,unsubscribed_at,business_id,businesses(name)")
        .order("unsubscribed_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      return (data || []) as Row[];
    },
  });

  const rows = useMemo(() => {
    let r = data || [];
    if (scope === "platform") r = r.filter((x) => !x.business_id);
    if (scope === "store") r = r.filter((x) => !!x.business_id);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      r = r.filter(
        (x) =>
          x.email.toLowerCase().includes(needle) ||
          (x.businesses?.name || "").toLowerCase().includes(needle),
      );
    }
    return r;
  }, [data, scope, q]);

  const addOne = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    const { error } = await (supabase as any)
      .from("email_unsubscribes")
      .upsert({ email, business_id: null, source: "manual" }, { onConflict: "business_id,email" });
    if (error) toast.error("שגיאה בהוספה: " + error.message);
    else {
      toast.success("נוסף לרשימת ההסרות");
      setNewEmail("");
      refetch();
    }
  };

  const importBulk = async () => {
    const emails = Array.from(
      new Set(
        bulk
          .split(/[\s,;]+/)
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.includes("@")),
      ),
    );
    if (!emails.length) {
      toast.error("לא נמצאו כתובות מייל תקינות");
      return;
    }
    const { error } = await (supabase as any)
      .from("email_unsubscribes")
      .upsert(
        emails.map((email) => ({ email, business_id: null, source: "import" })),
        { onConflict: "business_id,email" },
      );
    if (error) toast.error("שגיאה בייבוא: " + error.message);
    else {
      toast.success(`${emails.length} כתובות נוספו לרשימת ההסרות`);
      setBulk("");
      setShowImport(false);
      refetch();
    }
  };

  const exportCsv = () => {
    const header = ["email", "scope", "reason", "reason_detail", "source", "unsubscribed_at"];
    const lines = rows.map((r) =>
      [
        r.email,
        r.business_id ? r.businesses?.name || "store" : "Siango",
        r.reason ? REASON_LABELS[r.reason] || r.reason : "",
        r.reason_detail || "",
        SOURCE_LABELS[r.source] || r.source,
        r.unsubscribed_at,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `siango-unsubscribes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {([
            ["all", "הכל"],
            ["platform", "פלטפורמה (Siango)"],
            ["store", "חנויות"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setScope(key)}
              className={
                "px-3 py-1.5 text-sm transition-colors " +
                (scope === key ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted")
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חיפוש מייל / חנות..."
            className="w-full h-9 pr-9 pl-3 rounded-lg bg-card border border-border text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <button
          onClick={() => setShowImport((s) => !s)}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm hover:bg-muted"
        >
          <Upload className="h-4 w-4" /> ייבוא רשימה
        </button>
        <button
          onClick={exportCsv}
          disabled={!rows.length}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> ייצוא CSV
        </button>
      </div>

      {/* Manual add */}
      <div className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-lg p-3">
        <span className="text-sm text-muted-foreground">הוספה ידנית (פלטפורמה):</span>
        <input
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="email@example.com"
          dir="ltr"
          className="h-9 px-3 rounded-lg bg-background border border-border text-sm focus:border-primary focus:outline-none min-w-[220px]"
        />
        <button
          onClick={addOne}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> הוסף
        </button>
      </div>

      {/* Bulk import */}
      {showImport && (
        <div className="bg-card border border-border rounded-lg p-3 space-y-2">
          <p className="text-sm text-muted-foreground">
            הדבק כתובות מייל (מופרדות בפסיק / רווח / שורה). יתווספו לרשימת ההסרות של הפלטפורמה.
          </p>
          <textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            rows={4}
            dir="ltr"
            placeholder="a@b.com, c@d.com ..."
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:border-primary focus:outline-none"
          />
          <button
            onClick={importBulk}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90"
          >
            <Upload className="h-4 w-4" /> ייבא
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-muted-foreground px-6">
            לא ניתן לטעון את רשימת ההסרות. ייתכן שטבלת ההסרות עדיין לא הופעלה במסד הנתונים.
          </div>
        ) : !rows.length ? (
          <div className="py-16 text-center text-muted-foreground">
            <MailX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">אין הסרות להצגה</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-xs text-muted-foreground border-b border-border bg-muted/30">
                  <th className="font-medium px-4 py-2.5">מייל</th>
                  <th className="font-medium px-4 py-2.5">היכן</th>
                  <th className="font-medium px-4 py-2.5">סיבה</th>
                  <th className="font-medium px-4 py-2.5">מקור</th>
                  <th className="font-medium px-4 py-2.5">תאריך</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-4 py-2.5" dir="ltr" style={{ textAlign: "right" }}>{r.email}</td>
                    <td className="px-4 py-2.5">
                      {r.business_id ? (
                        <span className="text-foreground">{r.businesses?.name || "חנות"}</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
                          Siango
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {r.reason ? REASON_LABELS[r.reason] || r.reason : "-"}
                      {r.reason_detail ? ` (${r.reason_detail})` : ""}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{SOURCE_LABELS[r.source] || r.source}</td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{fmtDate(r.unsubscribed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        סה״כ {rows.length.toLocaleString("he-IL")} הסרות. הרשימה מתעדכנת אוטומטית בכל לחיצה על "הסרה" במייל.
      </p>
    </div>
  );
};

export default AdminUnsubscribes;
