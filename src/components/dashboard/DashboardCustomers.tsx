import { useMemo, useState, useEffect } from "react";
import { Users, Search, ArrowRight, Phone, Mail, ShoppingBag, Calendar, Crown, Repeat, Eye, Download, MessageCircle, Gift, Copy, X, Plus, Bell } from "lucide-react";
import type { Order } from "@/components/dashboard/DashboardOrders";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// CRM (phase 1 free + phase 2 segments/opportunities). Derived entirely from
// existing orders - no new tables. Phase 2 adds segments (VIP / dormant / repeat
// / new) and an opportunities area. NOTE: actually *sending* a win-back message
// needs the WhatsApp/Email modules (not live yet) - for now opportunities surface
// WHO to reach so the merchant can act, and auto-send turns on once channels ship.

interface DashboardCustomersProps {
  orders: Order[];
  businessId?: string;
  /** Force the labelled demo view (e.g. when the premium CRM isn't activated yet) */
  demoMode?: boolean;
}

// Quick contact helpers.
const telLink = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;
const waLink = (phone: string, text?: string) => {
  const n = phone.replace(/\D/g, "").replace(/^0/, "972");
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
};

const DORMANT_DAYS = 60;
const AT_RISK_DAYS = 30;
const NEW_DAYS = 30;

// Lifecycle status from RFM signals (recency + frequency). VIP is a separate
// value tier (a customer can be "VIP + at-risk" - the most important to act on).
type LifecycleStatus = "new" | "active" | "at_risk" | "dormant";

const STATUS_META: Record<LifecycleStatus, { label: string; dot: string; text: string }> = {
  new: { label: "חדש", dot: "bg-sky-500", text: "text-sky-600" },
  active: { label: "פעיל", dot: "bg-emerald-500", text: "text-emerald-600" },
  at_risk: { label: "בסיכון", dot: "bg-amber-500", text: "text-amber-600" },
  dormant: { label: "רדום", dot: "bg-rose-500", text: "text-rose-600" },
};

interface CustomerRow {
  key: string;
  name: string;
  phone: string;
  email: string;
  orderCount: number;
  totalSpent: number;
  firstOrder: string;
  lastOrder: string;
  orders: Order[];
  isVip: boolean;
  isDormant: boolean;
  isRepeat: boolean;
  isNew: boolean;
  status: LifecycleStatus;
  /** Avg days between this customer's orders (>=2 orders only) */
  avgIntervalDays?: number;
  /** True when the customer is in their typical re-order window and worth a nudge */
  dueForReorder?: boolean;
}

type SegmentFilter = "all" | "vip" | "reorder" | "at_risk" | "dormant" | "repeat" | "new";

const fmtPrice = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 0 }).format(n);
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
const daysAgo = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
const isoAgo = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

// Sample customers shown ONLY when the store has no real customers yet, so the
// merchant sees what the CRM looks like populated. Clearly labelled as a demo.
const buildDemoCustomers = (): CustomerRow[] => {
  const ord = (id: string, daysBack: number, total: number): Order =>
    ({ id, date: isoAgo(daysBack), total, customerName: "", customerPhone: "", customerEmail: "" } as unknown as Order);
  const mk = (key: string, name: string, phone: string, email: string, status: LifecycleStatus,
    isVip: boolean, orders: Order[]): CustomerRow => {
    const totalSpent = orders.reduce((s, o) => s + o.total, 0);
    const sorted = [...orders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const lastOrder = sorted[sorted.length - 1].date;
    let avgIntervalDays: number | undefined;
    let dueForReorder = false;
    if (sorted.length >= 2) {
      let sum = 0;
      for (let i = 1; i < sorted.length; i++) sum += (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / 86400000;
      const avg = sum / (sorted.length - 1);
      avgIntervalDays = Math.round(avg);
      const recency = daysAgo(lastOrder);
      dueForReorder = avg > 0 && recency >= avg * 0.9 && recency <= avg * 2.5;
    }
    return {
      key, name, phone, email, orderCount: orders.length, totalSpent,
      firstOrder: sorted[0].date, lastOrder, orders,
      isVip, isDormant: status === "dormant", isRepeat: orders.length > 1 && status !== "dormant",
      isNew: status === "new", status, avgIntervalDays, dueForReorder,
    };
  };
  return [
    mk("demo-1", "ישראל ישראלי", "050-1234567", "israel@example.com", "active", true,
      [ord("d1a", 240, 690), ord("d1b", 150, 540), ord("d1c", 70, 1190), ord("d1d", 30, 820), ord("d1e", 6, 1010)]),
    mk("demo-2", "דנה כהן", "052-7654321", "dana@example.com", "active", false,
      [ord("d2a", 120, 320), ord("d2b", 60, 410), ord("d2c", 18, 450)]),
    mk("demo-3", "מיכאל לוי", "054-3216549", "michael@example.com", "at_risk", false,
      [ord("d3a", 90, 280), ord("d3b", 44, 360)]),
    mk("demo-4", "נועה אברהם", "053-9876543", "noa@example.com", "new", false,
      [ord("d4a", 4, 220)]),
    mk("demo-5", "יוסי מזרחי", "058-1112233", "yossi@example.com", "dormant", false,
      [ord("d5a", 96, 380)]),
    // Steady ~26-day cadence, last bought 28 days ago -> due for reorder.
    mk("demo-6", "רונית בר", "050-7778899", "ronit@example.com", "active", false,
      [ord("d6a", 80, 240), ord("d6b", 50, 300), ord("d6c", 28, 260)]),
  ];
};

const DashboardCustomers = ({ orders, businessId, demoMode }: DashboardCustomersProps) => {
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<SegmentFilter>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Manual CRM annotations (tags + notes) per customer, persisted to customer_crm.
  const [crm, setCrm] = useState<Record<string, { tags: string[]; notes: string }>>({});
  const [tagDraft, setTagDraft] = useState("");
  useEffect(() => {
    if (!businessId) return;
    supabase.from("customer_crm").select("customer_key, tags, notes").eq("business_id", businessId)
      .then(({ data }) => {
        const m: Record<string, { tags: string[]; notes: string }> = {};
        (data || []).forEach((r: any) => { m[r.customer_key] = { tags: r.tags || [], notes: r.notes || "" }; });
        setCrm(m);
      });
  }, [businessId]);
  const saveCrm = async (key: string, patch: { tags?: string[]; notes?: string }) => {
    const next = { tags: crm[key]?.tags || [], notes: crm[key]?.notes || "", ...patch };
    setCrm((p) => ({ ...p, [key]: next }));
    if (!businessId) return;
    const { error } = await supabase.from("customer_crm").upsert({
      business_id: businessId, customer_key: key, tags: next.tags, notes: next.notes, updated_at: new Date().toISOString(),
    }, { onConflict: "business_id,customer_key" });
    if (error) toast.error("שמירה נכשלה");
  };

  const exportCsv = (rows: CustomerRow[]) => {
    const head = ["שם", "טלפון", "מייל", "הזמנות", "סך רכישות", "סטטוס", "תגיות"];
    const lines = [head, ...rows.map((c) => [
      c.name, c.phone, c.email, String(c.orderCount), String(Math.round(c.totalSpent)),
      STATUS_META[c.status].label, (crm[c.key]?.tags || []).join("; "),
    ])];
    const csv = "﻿" + lines.map((r) => r.map((f) => `"${(f || "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "לקוחות-siango.csv";
    a.click();
    toast.success("הקובץ יוצא");
  };

  const realCustomers = useMemo<CustomerRow[]>(() => {
    const map = new Map<string, CustomerRow>();
    for (const o of orders) {
      const key = (o.customerEmail || o.customerPhone || o.customerName || "").trim().toLowerCase();
      if (!key) continue;
      const ex = map.get(key);
      if (ex) {
        ex.orderCount += 1;
        ex.totalSpent += o.total || 0;
        ex.orders.push(o);
        if (new Date(o.date) > new Date(ex.lastOrder)) ex.lastOrder = o.date;
        if (new Date(o.date) < new Date(ex.firstOrder)) ex.firstOrder = o.date;
        if (!ex.phone && o.customerPhone) ex.phone = o.customerPhone;
        if (!ex.email && o.customerEmail) ex.email = o.customerEmail;
      } else {
        map.set(key, {
          key, name: o.customerName || "לקוח", phone: o.customerPhone || "", email: o.customerEmail || "",
          orderCount: 1, totalSpent: o.total || 0, firstOrder: o.date, lastOrder: o.date, orders: [o],
          isVip: false, isDormant: false, isRepeat: false, isNew: false, status: "active",
        });
      }
    }
    const rows = Array.from(map.values());
    const avgSpend = rows.length ? rows.reduce((s, c) => s + c.totalSpent, 0) / rows.length : 0;
    for (const c of rows) {
      c.isVip = c.totalSpent >= Math.max(avgSpend * 1.5, 1);
      c.isDormant = daysAgo(c.lastOrder) > DORMANT_DAYS;
      c.isRepeat = c.orderCount > 1 && !c.isDormant;
      c.isNew = c.orderCount === 1 && daysAgo(c.firstOrder) <= NEW_DAYS;
      const recency = daysAgo(c.lastOrder);
      c.status = recency > DORMANT_DAYS ? "dormant"
        : recency > AT_RISK_DAYS ? "at_risk"
        : (c.orderCount === 1 && daysAgo(c.firstOrder) <= NEW_DAYS) ? "new"
        : "active";
      // Repeat-purchase rhythm: from a customer's own cadence, are they due to reorder?
      if (c.orderCount >= 2) {
        const dates = c.orders.map((o) => new Date(o.date).getTime()).sort((a, b) => a - b);
        let sum = 0;
        for (let i = 1; i < dates.length; i++) sum += (dates[i] - dates[i - 1]) / 86400000;
        const avg = sum / (dates.length - 1);
        c.avgIntervalDays = Math.round(avg);
        // Prime nudge window: from ~90% of their usual gap up to 2.5x it (after that they've churned).
        c.dueForReorder = avg > 0 && recency >= avg * 0.9 && recency <= avg * 2.5;
      }
    }
    return rows.sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  // No real customers yet (or premium not activated) -> labelled demo view.
  const isDemo = demoMode || realCustomers.length === 0;
  const customers = useMemo(() => (isDemo ? buildDemoCustomers() : realCustomers), [isDemo, realCustomers]);

  const avgLtv = customers.length ? Math.round(customers.reduce((s, c) => s + c.totalSpent, 0) / customers.length) : 0;
  const repeatPct = customers.length ? Math.round((customers.filter((c) => c.orderCount > 1).length / customers.length) * 100) : 0;

  const counts = useMemo(() => ({
    all: customers.length,
    vip: customers.filter((c) => c.isVip).length,
    reorder: customers.filter((c) => c.dueForReorder).length,
    at_risk: customers.filter((c) => c.status === "at_risk").length,
    dormant: customers.filter((c) => c.isDormant).length,
    repeat: customers.filter((c) => c.isRepeat).length,
    new: customers.filter((c) => c.isNew).length,
  }), [customers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (segment === "vip" && !c.isVip) return false;
      if (segment === "reorder" && !c.dueForReorder) return false;
      if (segment === "at_risk" && c.status !== "at_risk") return false;
      if (segment === "dormant" && !c.isDormant) return false;
      if (segment === "repeat" && !c.isRepeat) return false;
      if (segment === "new" && !c.isNew) return false;
      if (q && !(c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [customers, query, segment]);

  const selected = customers.find((c) => c.key === selectedKey) || null;

  if (selected) {
    const tags = [
      selected.isVip && { label: "VIP", icon: Crown },
      selected.dueForReorder && { label: "מוכן לקנייה חוזרת", icon: Repeat },
      selected.isRepeat && !selected.dueForReorder && { label: "לקוח חוזר", icon: Repeat },
    ].filter(Boolean) as { label: string; icon: typeof Crown }[];
    const st = STATUS_META[selected.status];
    const recencyDays = daysAgo(selected.lastOrder);
    const cc = crm[selected.key] || { tags: [], notes: "" };
    const offerText = `היי ${selected.name}! יש לנו הטבה מיוחדת בשבילך 🎁`;
    const addTag = () => {
      const t = tagDraft.trim();
      if (!t || cc.tags.includes(t)) { setTagDraft(""); return; }
      saveCrm(selected.key, { tags: [...cc.tags, t] }); setTagDraft("");
    };
    return (
      <div className="space-y-4" dir="rtl">
        <button onClick={() => setSelectedKey(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="w-4 h-4" /> חזרה לרשימת הלקוחות
        </button>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold">{selected.name.charAt(0)}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-semibold">{selected.name}</h2>
                <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-muted ${st.text}`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                </span>
                {tags.map((t) => (
                  <span key={t.label} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary"><t.icon className="w-3 h-3" />{t.label}</span>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-0.5">
                {selected.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selected.phone}</span>}
                {selected.email && <span className="flex items-center gap-1" dir="ltr"><Mail className="w-3 h-3" />{selected.email}</span>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <div className="rounded-lg bg-muted/40 p-3 text-center"><div className="text-xl font-semibold">{selected.orderCount}</div><div className="text-xs text-muted-foreground">הזמנות</div></div>
            <div className="rounded-lg bg-muted/40 p-3 text-center"><div className="text-xl font-semibold">{fmtPrice(selected.totalSpent)}</div><div className="text-xs text-muted-foreground">סך רכישות (LTV)</div></div>
            <div className="rounded-lg bg-muted/40 p-3 text-center"><div className="text-xl font-semibold">{fmtPrice(Math.round(selected.totalSpent / selected.orderCount))}</div><div className="text-xs text-muted-foreground">ממוצע להזמנה</div></div>
            <div className="rounded-lg bg-muted/40 p-3 text-center"><div className="text-xl font-semibold">{recencyDays === 0 ? "היום" : `${recencyDays} ימ׳`}</div><div className="text-xs text-muted-foreground">מההזמנה האחרונה</div></div>
          </div>
          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 mb-5">
            {selected.phone && (
              <>
                <a href={waLink(selected.phone, offerText)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm rounded-lg bg-primary text-primary-foreground px-3 py-2 hover:bg-primary/90 transition-colors">
                  <Gift className="w-4 h-4" /> שלח הטבה בוואטסאפ
                </a>
                <a href={waLink(selected.phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm rounded-lg border border-border px-3 py-2 hover:bg-muted transition-colors">
                  <MessageCircle className="w-4 h-4" /> וואטסאפ
                </a>
                <a href={telLink(selected.phone)} className="inline-flex items-center gap-1.5 text-sm rounded-lg border border-border px-3 py-2 hover:bg-muted transition-colors">
                  <Phone className="w-4 h-4" /> התקשר
                </a>
              </>
            )}
            {selected.email && (
              <a href={`mailto:${selected.email}`} className="inline-flex items-center gap-1.5 text-sm rounded-lg border border-border px-3 py-2 hover:bg-muted transition-colors">
                <Mail className="w-4 h-4" /> מייל
              </a>
            )}
            <button onClick={() => { navigator.clipboard?.writeText(`${selected.name} · ${selected.phone} · ${selected.email}`); toast.success("הפרטים הועתקו"); }}
              className="inline-flex items-center gap-1.5 text-sm rounded-lg border border-border px-3 py-2 hover:bg-muted transition-colors">
              <Copy className="w-4 h-4" /> העתק פרטים
            </button>
          </div>

          {/* Tags */}
          <h3 className="text-sm font-medium mb-2">תגיות</h3>
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {cc.tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                {t}
                <button onClick={() => saveCrm(selected.key, { tags: cc.tags.filter((x) => x !== t) })} aria-label="הסר תגית"><X className="w-3 h-3" /></button>
              </span>
            ))}
            <div className="inline-flex items-center gap-1">
              <input value={tagDraft} onChange={(e) => setTagDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTag()}
                placeholder="הוסף תגית (סיטונאי, נאמן...)" className="h-8 w-44 rounded-lg border border-border bg-background px-2.5 text-xs" />
              <button onClick={addTag} className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border text-primary hover:bg-muted"><Plus className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Notes */}
          <h3 className="text-sm font-medium mb-2">הערות פנימיות</h3>
          <textarea key={selected.key} defaultValue={cc.notes} onBlur={(e) => { if (e.target.value !== cc.notes) saveCrm(selected.key, { notes: e.target.value }); }}
            placeholder="הערות על הלקוח - העדפות, שיחות, כל מה שחשוב לזכור. נשמר אוטומטית." rows={3}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm mb-5 resize-y" />

          <h3 className="text-sm font-medium mb-3">ציר זמן רכישות</h3>
          <div className="relative pr-4">
            <div className="absolute right-[5px] top-1 bottom-1 w-px bg-border" />
            <div className="flex flex-col gap-3">
              {selected.orders.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((o, i) => {
                const d = daysAgo(o.date);
                return (
                  <div key={o.id} className="relative flex items-center justify-between gap-2">
                    <span className={`absolute -right-4 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-background ${i === 0 ? "bg-primary" : "bg-muted-foreground/40"}`} />
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />{fmtDate(o.date)}
                      <span className="text-xs">· {d === 0 ? "היום" : `לפני ${d} ימים`}</span>
                    </span>
                    <span className="text-sm font-medium">{fmtPrice(o.total)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const segChips: { id: SegmentFilter; label: string }[] = [
    { id: "all", label: `הכל (${counts.all})` },
    { id: "vip", label: `VIP (${counts.vip})` },
    { id: "reorder", label: `מוכנים לקנייה חוזרת (${counts.reorder})` },
    { id: "at_risk", label: `בסיכון (${counts.at_risk})` },
    { id: "dormant", label: `רדומים (${counts.dormant})` },
    { id: "repeat", label: `חוזרים (${counts.repeat})` },
    { id: "new", label: `חדשים (${counts.new})` },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Top bar: demo badge + export */}
      <div className="flex items-center justify-between">
        <span>
          {isDemo && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">תצוגת דמו</span>}
        </span>
        <button onClick={() => exportCsv(filtered)} className="inline-flex items-center gap-1.5 text-sm rounded-lg border border-border px-3 py-1.5 hover:bg-muted transition-colors">
          <Download className="w-4 h-4" /> ייצוא לאקסל
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl bg-card border border-border p-3">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Repeat className="w-3.5 h-3.5" /> לקוחות חוזרים</div>
          <div className="text-2xl font-semibold">{repeatPct}%</div>
        </div>
        <div className="rounded-xl bg-card border border-border p-3">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Crown className="w-3.5 h-3.5" /> ערך ממוצע (LTV)</div>
          <div className="text-2xl font-semibold">{fmtPrice(avgLtv)}</div>
        </div>
        <div className="rounded-xl bg-card border border-border p-3">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-amber-500" /> בסיכון / רדומים</div>
          <div className="text-2xl font-semibold">{counts.at_risk + counts.dormant}</div>
        </div>
        <div className="rounded-xl bg-card border border-border p-3">
          <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Repeat className="w-3.5 h-3.5" /> מוכנים לקנייה חוזרת</div>
          <div className="text-2xl font-semibold">{counts.reorder}</div>
        </div>
      </div>

      {/* Compact opportunity row - only when there's something to act on */}
      {(counts.reorder > 0 || counts.at_risk > 0 || counts.dormant > 0) && (
        <div className="flex flex-wrap gap-2">
          {counts.reorder > 0 && (
            <button onClick={() => setSegment("reorder")}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors">
              <Repeat className="w-3.5 h-3.5" /> {counts.reorder} מוכנים לקנייה חוזרת
            </button>
          )}
          {counts.at_risk > 0 && (
            <button onClick={() => setSegment("at_risk")}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-600 hover:bg-amber-500/10 transition-colors">
              <Bell className="w-3.5 h-3.5" /> {counts.at_risk} מתחילים להתרחק
            </button>
          )}
          {counts.dormant > 0 && (
            <button onClick={() => setSegment("dormant")}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-rose-500/30 bg-rose-500/5 text-rose-600 hover:bg-rose-500/10 transition-colors">
              <Bell className="w-3.5 h-3.5" /> {counts.dormant} רדומים
            </button>
          )}
        </div>
      )}

      {/* Segment chips */}
      <div className="flex gap-2 flex-wrap">
        {segChips.map((s) => (
          <button key={s.id} onClick={() => setSegment(s.id)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${segment === s.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="חיפוש לפי שם, טלפון או מייל" className="w-full h-10 rounded-xl border border-border bg-background pr-9 pl-3 text-sm" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{customers.length === 0 ? "עדיין אין לקוחות - הם יופיעו כאן עם ההזמנה הראשונה" : "לא נמצאו לקוחות תואמים"}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => (
            <button key={c.key} onClick={() => setSelectedKey(c.key)} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-right hover:border-primary/40 transition-colors">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold shrink-0">{c.name.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate flex items-center gap-1.5">
                  {c.name}
                  {c.isVip && <Crown className="w-3 h-3 text-primary shrink-0" />}
                </div>
                <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_META[c.status].dot}`} />
                  <span className={STATUS_META[c.status].text}>{STATUS_META[c.status].label}</span>
                  <span className="truncate">· {c.phone || c.email}</span>
                </div>
              </div>
              <div className="text-left shrink-0">
                <div className="text-sm font-semibold">{fmtPrice(c.totalSpent)}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end"><ShoppingBag className="w-3 h-3" />{c.orderCount}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardCustomers;
