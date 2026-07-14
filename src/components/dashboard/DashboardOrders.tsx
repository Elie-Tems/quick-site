import { useState } from "react";
import { ShoppingCart, ArrowRight, User, Phone, Mail, Package, Heart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BusinessType } from "@/lib/businessModules";

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  date: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  notes?: string;
  items: OrderItem[];
  total: number;
  status: 'received' | 'pending_payment' | 'completed' | 'cancelled';
}

interface DashboardOrdersProps {
  orders: Order[];
  onOrdersChange: (orders: Order[]) => void;
  onStatusChange?: (orderId: string, status: Order['status']) => void;
  businessType?: BusinessType;
}

const ORDER_SECTION_CONFIG: Record<string, { emoji: string; title: string; emptyMsg: string }> = {
  products:   { emoji: "📦", title: "הזמנות",           emptyMsg: "כשלקוחות יזמינו, ההזמנות יופיעו כאן. שתפו את האתר!" },
  services:   { emoji: "📋", title: "לידים",             emptyMsg: "כשאנשים יפנו, הלידים יופיעו כאן." },
  realestate: { emoji: "🤝", title: "לידים",             emptyMsg: "כשמתעניינים יפנו, הלידים יופיעו כאן." },
  vacation:   { emoji: "🛎️", title: "הזמנות לינה",      emptyMsg: "כשאורחים יזמינו, ההזמנות יופיעו כאן. שתפו את האתר!" },
  nonprofit:  { emoji: "💰", title: "תרומות",            emptyMsg: "תרומות שיתקבלו יופיעו כאן." },
  synagogue:  { emoji: "🙏", title: "תרומות ועליות",     emptyMsg: "תרומות ועליות יופיעו כאן." },
};

const STATUS_CHIP: Record<string, { bg: string; text: string }> = {
  "חדשה":           { bg: "bg-blue-500/15",    text: "text-blue-700 dark:text-blue-300" },
  "בטיפול":         { bg: "bg-amber-500/15",   text: "text-amber-700 dark:text-amber-300" },
  "הושלמה":         { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300" },
  "בוטלה":          { bg: "bg-red-500/15",     text: "text-red-700 dark:text-red-300" },
  "ליד חדש":        { bg: "bg-blue-500/15",    text: "text-blue-700 dark:text-blue-300" },
  "נסגר":           { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300" },
  "לא רלוונטי":     { bg: "bg-muted",          text: "text-muted-foreground" },
  "ממתין לאישור":   { bg: "bg-amber-500/15",   text: "text-amber-700 dark:text-amber-300" },
  "מאושר":          { bg: "bg-blue-500/15",    text: "text-blue-700 dark:text-blue-300" },
  "הגיע":           { bg: "bg-violet-500/15",  text: "text-violet-700 dark:text-violet-300" },
  "עזב":            { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300" },
  "נקלטה":          { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300" },
  "בבדיקה":         { bg: "bg-amber-500/15",   text: "text-amber-700 dark:text-amber-300" },
  "התקבלה":         { bg: "bg-blue-500/15",    text: "text-blue-700 dark:text-blue-300" },
  "ממתין לתשלום":   { bg: "bg-amber-500/15",   text: "text-amber-700 dark:text-amber-300" },
};

type StatusCfg = Record<Order['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }>;

const STATUS_BY_TYPE: Record<BusinessType, StatusCfg> = {
  products: {
    received: { label: 'התקבלה', variant: 'secondary' },
    pending_payment: { label: 'ממתין לתשלום', variant: 'outline' },
    completed: { label: 'הושלמה', variant: 'default' },
    cancelled: { label: 'בוטלה', variant: 'destructive' },
  },
  services: {
    received: { label: 'התקבלה', variant: 'secondary' },
    pending_payment: { label: 'ממתין לתשלום', variant: 'outline' },
    completed: { label: 'הושלמה', variant: 'default' },
    cancelled: { label: 'בוטלה', variant: 'destructive' },
  },
  nonprofit: {
    received: { label: 'התקבלה', variant: 'secondary' },
    pending_payment: { label: 'בבדיקה', variant: 'outline' },
    completed: { label: 'נקלטה', variant: 'default' },
    cancelled: { label: 'בוטלה', variant: 'destructive' },
  },
  synagogue: {
    received: { label: 'התקבלה', variant: 'secondary' },
    pending_payment: { label: 'בבדיקה', variant: 'outline' },
    completed: { label: 'נקלטה', variant: 'default' },
    cancelled: { label: 'בוטלה', variant: 'destructive' },
  },
  realestate: {
    received: { label: 'ליד חדש', variant: 'secondary' },
    pending_payment: { label: 'בטיפול', variant: 'outline' },
    completed: { label: 'נסגר', variant: 'default' },
    cancelled: { label: 'לא רלוונטי', variant: 'destructive' },
  },
  vacation: {
    received: { label: 'ממתין לאישור', variant: 'secondary' },
    pending_payment: { label: 'מאושר', variant: 'outline' },
    completed: { label: 'עזב', variant: 'default' },
    cancelled: { label: 'בוטלה', variant: 'destructive' },
  },
};

// Per-type text labels
const LABELS: Record<BusinessType, { title: string; single: string; contact: string; items: string; empty: string; emptyDesc: string; listItem: string }> = {
  products: {
    title: 'הזמנות', single: 'הזמנה', contact: 'פרטי לקוח', items: 'מוצרים',
    empty: 'עדיין אין הזמנות',
    emptyDesc: 'ברגע שלקוח יזמין מהחנות, ההזמנה תופיע כאן.',
    listItem: 'פריטים',
  },
  services: {
    title: 'הזמנות', single: 'הזמנה', contact: 'פרטי לקוח', items: 'שירותים / מוצרים',
    empty: 'עדיין אין הזמנות',
    emptyDesc: 'ברגע שלקוח יזמין, ההזמנה תופיע כאן.',
    listItem: 'פריטים',
  },
  nonprofit: {
    title: 'תרומות', single: 'תרומה', contact: 'פרטי תורם', items: 'פרויקט / יעד',
    empty: 'עדיין לא התקבלו תרומות',
    emptyDesc: 'ברגע שמישהו יתרום דרך האתר, התרומה תופיע כאן.',
    listItem: 'פריטים',
  },
  synagogue: {
    title: 'תרומות', single: 'תרומה', contact: 'פרטי תורם', items: 'פרויקט / יעד',
    empty: 'עדיין לא התקבלו תרומות',
    emptyDesc: 'ברגע שמישהו יתרום דרך האתר, התרומה תופיע כאן.',
    listItem: 'פריטים',
  },
  realestate: {
    title: 'לידים', single: 'ליד', contact: 'פרטי מתעניין', items: 'נכסים שהתעניין',
    empty: 'עדיין לא הגיעו לידים',
    emptyDesc: 'ברגע שמישהו ישאיר פרטים על נכס, הליד יופיע כאן.',
    listItem: 'נכסים',
  },
  vacation: {
    title: 'הזמנות לינה', single: 'הזמנה', contact: 'פרטי אורח', items: 'יחידות',
    empty: 'עדיין אין הזמנות לינה',
    emptyDesc: 'ברגע שאורח יזמין, ההזמנה תופיע כאן.',
    listItem: 'לילות',
  },
};

const TYPE_ICON: Record<BusinessType, React.ComponentType<{ className?: string }>> = {
  products: ShoppingCart,
  services: ShoppingCart,
  nonprofit: Heart,
  synagogue: Heart,
  realestate: Users,
  vacation: ShoppingCart,
};

const DashboardOrders = ({ orders, onOrdersChange, onStatusChange, businessType = 'products' }: DashboardOrdersProps) => {
  const statusConfig = STATUS_BY_TYPE[businessType];
  const lbl = LABELS[businessType];
  const ListIcon = TYPE_ICON[businessType];
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleStatusChange = (orderId: string, newStatus: Order['status']) => {
    onOrdersChange(orders.map(o =>
      o.id === orderId ? { ...o, status: newStatus } : o
    ));
    if (selectedOrder?.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
    onStatusChange?.(orderId, newStatus); // persist to DB
  };

  // Order Details View
  if (selectedOrder) {
    const status = statusConfig[selectedOrder.status];
    
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-muted rounded-lg">
            <ArrowRight className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{lbl.single} #{selectedOrder.id}</h1>
            <p className="text-sm text-muted-foreground">{formatDate(selectedOrder.date)}</p>
          </div>
          {(() => {
            const chip = STATUS_CHIP[status.label] ?? { bg: "bg-muted", text: "text-muted-foreground" };
            return (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${chip.bg} ${chip.text}`}>
                {status.label}
              </span>
            );
          })()}
        </div>

        <div className="space-y-6 max-w-2xl">
          {/* Customer Details */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              {lbl.contact}
            </h2>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2">
                <span className="font-medium">{selectedOrder.customerName}</span>
              </p>
              <a href={`tel:${selectedOrder.customerPhone}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary" dir="ltr">
                <Phone className="h-4 w-4" />
                {selectedOrder.customerPhone}
              </a>
              <a href={`mailto:${selectedOrder.customerEmail}`} className="flex items-center gap-2 text-muted-foreground hover:text-primary" dir="ltr">
                <Mail className="h-4 w-4" />
                {selectedOrder.customerEmail}
              </a>
              {selectedOrder.notes && (
                <p className="text-muted-foreground pt-2 border-t border-border mt-3">
                  <span className="font-medium text-foreground">הערות:</span> {selectedOrder.notes}
                </p>
              )}
            </div>
          </div>

          {/* Vacation booking details */}
          {businessType === "vacation" && ((selectedOrder as any).checkin_date || (selectedOrder as any).checkout_date) && (
            <div className="rounded-xl bg-muted/40 p-3 space-y-1 text-sm">
              <div className="flex gap-4 flex-wrap">
                {(selectedOrder as any).checkin_date && <div><span className="text-muted-foreground">כניסה: </span><b>{(selectedOrder as any).checkin_date}</b></div>}
                {(selectedOrder as any).checkout_date && <div><span className="text-muted-foreground">יציאה: </span><b>{(selectedOrder as any).checkout_date}</b></div>}
              </div>
              {(selectedOrder as any).num_guests && <div><span className="text-muted-foreground">אורחים: </span><b>{(selectedOrder as any).num_guests}</b></div>}
              {(selectedOrder as any).unit_name && <div><span className="text-muted-foreground">יחידה: </span><b>{(selectedOrder as any).unit_name}</b></div>}
            </div>
          )}

          {/* Order Items */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              {lbl.items}
            </h2>
            <div className="space-y-3">
              {selectedOrder.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {item.productName} × {item.quantity}
                  </span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="font-semibold">סה״כ</span>
                <span className="text-lg font-bold text-primary">{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>
          </div>

          {/* Status Actions */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="font-semibold mb-4">עדכון סטטוס</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusConfig).map(([key, config]) => (
                <Button
                  key={key}
                  variant={selectedOrder.status === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusChange(selectedOrder.id, key as Order['status'])}
                >
                  {config.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List View
  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Colorful order header */}
      {(() => {
        const cfg = ORDER_SECTION_CONFIG[businessType ?? "products"] ?? ORDER_SECTION_CONFIG.products;
        return (
          <div className="rounded-2xl bg-gradient-to-l from-blue-500/15 to-blue-500/5 border border-blue-500/20 p-5 flex items-center gap-4">
            <div className="text-4xl">{cfg.emoji}</div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{cfg.title}</h1>
              <p className="text-sm text-muted-foreground">{(orders ?? []).length} בסה"כ</p>
            </div>
          </div>
        );
      })()}

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="text-5xl mb-4">{(ORDER_SECTION_CONFIG[businessType ?? "products"] ?? ORDER_SECTION_CONFIG.products).emoji}</div>
          <p className="text-sm text-muted-foreground max-w-xs">
            {(ORDER_SECTION_CONFIG[businessType ?? "products"] ?? ORDER_SECTION_CONFIG.products).emptyMsg}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const status = statusConfig[order.status];
            const chip = STATUS_CHIP[status.label] ?? { bg: "bg-muted", text: "text-muted-foreground" };
            return (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border shadow-soft hover:border-primary/30 transition-colors text-right"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{order.customerName}</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${chip.bg} ${chip.text}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDate(order.date)}</p>
                </div>
                <div className="text-left">
                  <p className="font-bold text-primary">{formatPrice(order.total)}</p>
                  <p className="text-xs text-muted-foreground">{order.items.length} {lbl.listItem}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DashboardOrders;
