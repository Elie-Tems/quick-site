import { useMemo, useState } from "react";
import { Users, Search, ArrowRight, Phone, Mail, ShoppingBag, Calendar } from "lucide-react";
import type { Order } from "@/components/dashboard/DashboardOrders";

// CRM phase 1 (free tier): a customer list derived from existing orders - no new
// tables. Groups orders by email (falling back to phone) into a customer card
// with purchase history, total spent (LTV) and last-order date.

interface DashboardCustomersProps {
  orders: Order[];
}

interface CustomerRow {
  key: string;
  name: string;
  phone: string;
  email: string;
  orderCount: number;
  totalSpent: number;
  lastOrder: string;
  orders: Order[];
}

const fmtPrice = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });

const DashboardCustomers = ({ orders }: DashboardCustomersProps) => {
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const customers = useMemo<CustomerRow[]>(() => {
    const map = new Map<string, CustomerRow>();
    for (const o of orders) {
      const key = (o.customerEmail || o.customerPhone || o.customerName || "").trim().toLowerCase();
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpent += o.total || 0;
        existing.orders.push(o);
        if (new Date(o.date) > new Date(existing.lastOrder)) existing.lastOrder = o.date;
        if (!existing.phone && o.customerPhone) existing.phone = o.customerPhone;
        if (!existing.email && o.customerEmail) existing.email = o.customerEmail;
      } else {
        map.set(key, {
          key,
          name: o.customerName || "לקוח",
          phone: o.customerPhone || "",
          email: o.customerEmail || "",
          orderCount: 1,
          totalSpent: o.total || 0,
          lastOrder: o.date,
          orders: [o],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [orders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q),
    );
  }, [customers, query]);

  const selected = customers.find((c) => c.key === selectedKey) || null;

  if (selected) {
    return (
      <div className="space-y-4" dir="rtl">
        <button onClick={() => setSelectedKey(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="w-4 h-4" /> חזרה לרשימת הלקוחות
        </button>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold">
              {selected.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-0.5">
                {selected.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{selected.phone}</span>}
                {selected.email && <span className="flex items-center gap-1" dir="ltr"><Mail className="w-3 h-3" />{selected.email}</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <div className="text-xl font-semibold">{selected.orderCount}</div>
              <div className="text-xs text-muted-foreground">הזמנות</div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <div className="text-xl font-semibold">{fmtPrice(selected.totalSpent)}</div>
              <div className="text-xs text-muted-foreground">סך רכישות</div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <div className="text-xl font-semibold">{fmtPrice(Math.round(selected.totalSpent / selected.orderCount))}</div>
              <div className="text-xs text-muted-foreground">ממוצע להזמנה</div>
            </div>
          </div>

          <h3 className="text-sm font-medium mb-2">פירוט רכישות</h3>
          <div className="flex flex-col gap-2">
            {selected.orders
              .slice()
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground"><Calendar className="w-3.5 h-3.5" />{fmtDate(o.date)}</span>
                  <span className="font-medium">{fmtPrice(o.total)}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> לקוחות</h2>
          <p className="text-sm text-muted-foreground">נבנה אוטומטית מההזמנות שלך</p>
        </div>
        <span className="text-sm text-muted-foreground">{customers.length} לקוחות</span>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חיפוש לפי שם, טלפון או מייל"
          className="w-full h-10 rounded-xl border border-border bg-background pr-9 pl-3 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">{customers.length === 0 ? "עדיין אין לקוחות - הם יופיעו כאן עם ההזמנה הראשונה" : "לא נמצאו לקוחות תואמים"}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((c) => (
            <button
              key={c.key}
              onClick={() => setSelectedKey(c.key)}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-right hover:border-primary/40 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold shrink-0">
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground truncate">{c.phone || c.email}</div>
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
