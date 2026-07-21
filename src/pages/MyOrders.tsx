import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { Package, Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";

// Customer self-service order history via a magic link. No account needed: the
// shopper enters their email, gets a signed link, and views their past orders.
interface MyOrdersProps { slugOverride?: string }

interface OrderItem { name: string; quantity: number; price: number }
interface OrderRow { id: string; date: string; total: number; status: string; items: OrderItem[] }

const fmt = (n: number) => new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", maximumFractionDigits: 0 }).format(n || 0);
const fmtDate = (d: string) => new Date(d).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
const STATUS: Record<string, string> = {
  pending: "התקבלה", confirmed: "ממתין לתשלום", paid: "שולם", completed: "הושלמה", cancelled: "בוטלה",
};

const MyOrders = ({ slugOverride }: MyOrdersProps) => {
  const params = useParams();
  const slug = slugOverride || params.slug || "";
  const [search] = useSearchParams();
  const token = search.get("t");

  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"form" | "sending" | "sent" | "loading" | "orders" | "error">(token ? "loading" : "form");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [storeName, setStoreName] = useState("");
  const [storeColor, setStoreColor] = useState("#0E9F6E");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("customer-orders", { body: { action: "view", token } });
        if (error || !data?.ok) { setPhase("error"); return; }
        setOrders(data.orders || []);
        setStoreName(data.store?.name || "");
        if (data.store?.color) setStoreColor(data.store.color);
        setPhase("orders");
      } catch { setPhase("error"); }
    })();
  }, [token]);

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setPhase("sending");
    try {
      await supabase.functions.invoke("customer-orders", { body: { action: "request", slug, email: email.trim().toLowerCase() } });
    } catch { /* always show the same confirmation (no leak) */ }
    setPhase("sent");
  };

  const storeHref = slugOverride ? "/" : `/${slug}`;

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground" style={{ fontFamily: "Heebo, Arial, sans-serif" }}>
      <SEOHead title="ההזמנות שלי" noindex={true} />
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link to={storeHref} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> חזרה לחנות
        </Link>

        <h1 className="text-2xl font-bold flex items-center gap-2 mb-1"><Package className="w-6 h-6" style={{ color: storeColor }} /> ההזמנות שלי</h1>

        {phase === "form" && (
          <>
            <p className="text-sm text-muted-foreground mb-6">הזינו את כתובת המייל שאיתה ביצעתם הזמנות, ונשלח לכם קישור לצפייה בהיסטוריה.</p>
            <form onSubmit={requestLink} className="flex flex-col sm:flex-row gap-2 max-w-md">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com" dir="ltr"
                  className="w-full h-11 rounded-lg border border-border bg-card pr-9 pl-3 text-sm text-right" />
              </div>
              <button type="submit" className="h-11 rounded-lg px-5 text-sm font-semibold text-white" style={{ background: storeColor }}>
                שליחת קישור
              </button>
            </form>
          </>
        )}

        {(phase === "sending") && <p className="text-sm text-muted-foreground flex items-center gap-2 mt-4"><Loader2 className="w-4 h-4 animate-spin" /> שולח...</p>}

        {phase === "sent" && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mt-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">בדקו את תיבת המייל שלכם 📬</p>
              <p className="text-xs text-muted-foreground mt-1">אם קיימות הזמנות עם המייל הזה, שלחנו קישור לצפייה בהן (בתוקף ל-30 דקות).</p>
            </div>
          </div>
        )}

        {phase === "loading" && <p className="text-sm text-muted-foreground flex items-center gap-2 mt-6"><Loader2 className="w-4 h-4 animate-spin" /> טוען את ההזמנות שלך...</p>}

        {phase === "error" && (
          <div className="rounded-xl border border-border p-5 mt-4">
            <p className="text-sm font-medium">הקישור אינו תקף או שפג תוקפו</p>
            <p className="text-xs text-muted-foreground mt-1">קישורי הצפייה בתוקף ל-30 דקות. אפשר לבקש קישור חדש:</p>
            <Link to={slugOverride ? "/my-orders" : `/${slug}/my-orders`} className="text-sm font-medium hover:underline mt-2 inline-block" style={{ color: storeColor }}>בקשת קישור חדש</Link>
          </div>
        )}

        {phase === "orders" && (
          orders.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-6">לא נמצאו הזמנות.</p>
          ) : (
            <div className="space-y-3 mt-6">
              <p className="text-sm text-muted-foreground">{orders.length} הזמנות {storeName ? `ב${storeName}` : ""}</p>
              {orders.map((o) => (
                <div key={o.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{fmtDate(o.date)}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{STATUS[o.status] || o.status}</span>
                  </div>
                  {o.items.length > 0 && (
                    <ul className="text-sm space-y-1 mb-2">
                      {o.items.map((it, i) => (
                        <li key={i} className="flex justify-between text-muted-foreground">
                          <span>{it.name} × {it.quantity}</span>
                          <span>{fmt(it.price * it.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="font-semibold">סה"כ {fmt(o.total)}</span>
                    <Link to={storeHref} className="text-sm font-medium hover:underline" style={{ color: storeColor }}>הזמנה חוזרת →</Link>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default MyOrders;
