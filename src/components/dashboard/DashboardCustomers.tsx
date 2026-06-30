import { useMemo, useState } from "react";
import { Users, Search, ArrowRight, Phone, Mail, ShoppingBag, Calendar, Sparkles, Crown, Repeat } from "lucide-react";
import type { Order } from "@/components/dashboard/DashboardOrders";

// CRM (phase 1 free + phase 2 segments/opportunities). Derived entirely from
// existing orders - no new tables. Phase 2 adds segments (VIP / dormant / repeat
// / new) and an opportunities area. NOTE: actually *sending* a win-back message
// needs the WhatsApp/Email modules (not live yet) - for now opportunities surface
// WHO to reach so the merchant can act, and auto-send turns on once channels ship.

interface DashboardCustomersProps {
  orders: Order[];
}

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
}

type SegmentFilter = "all" | "vip" | "dormant" | "repeat" | "new";

const fmtPrice = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 0 }).format(n);
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
const daysAgo = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

const DashboardCustomers = ({ orders }: DashboardCustomersProps) => {
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState<SegmentFilter>("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const customers = useMemo<CustomerRow[]>(() => {
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
    }
    return rows.sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const counts = useMemo(() => ({
    all: customers.length,
    vip: customers.filter((c) => c.isVip).length,
    dormant: customers.filter((c) => c.isDormant).length,
    repeat: customers.filter((c) => c.isRepeat).length,
    new: customers.filter((c) => c.isNew).length,
  }), [customers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (segment === "vip" && !c.isVip) return false;
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
      selected.isRepeat && { label: "לקוח חוזר", icon: Repeat },
    ].filter(Boolean) as { label: string; icon: typeof Crown }[];
    const st = STATUS_META[selected.status];
    const recencyDays = daysAgo(selected.lastOrder);
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
    { id: "dormant", label: `רדומים (${counts.dormant})` },
    { id: "repeat", label: `חוזרים (${counts.repeat})` },
    { id: "new", label: `חדשים (${counts.new})` },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> לקוחות</h2>
          <p className="text-sm text-muted-foreground">נבנה אוטומטית מההזמנות שלך</p>
        </div>
        <span className="text-sm text-muted-foreground">{customers.length} לקוחות</span>
      </div>

      {/* Opportunity: dormant win-back */}
      {counts.dormant > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium">{counts.dormant} לקוחות לא קנו מעל {DORMANT_DAYS} יום</p>
            <p className="text-xs text-muted-foreground mt-0.5">הזדמנות להחזיר אותם עם הטבה. שליחה אוטומטית תתאפשר כשמודול וואטסאפ/מייל יעלה - בינתיים אפשר לראות מי הם וליצור קשר.</p>
          </div>
          <button onClick={() => setSegment("dormant")} className="text-sm font-medium text-primary hover:underline shrink-0">הצג אותם</button>
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
