import { useState } from "react";
import { ShoppingCart, ArrowRight, User, Phone, Mail, Package, Heart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  realestate: {
    received: { label: 'ליד חדש', variant: 'secondary' },
    pending_payment: { label: 'בטיפול', variant: 'outline' },
    completed: { label: 'נסגר', variant: 'default' },
    cancelled: { label: 'לא רלוונטי', variant: 'destructive' },
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
  realestate: {
    title: 'לידים', single: 'ליד', contact: 'פרטי מתעניין', items: 'נכסים שהתעניין',
    empty: 'עדיין לא הגיעו לידים',
    emptyDesc: 'ברגע שמישהו ישאיר פרטים על נכס, הליד יופיע כאן.',
    listItem: 'נכסים',
  },
};

const TYPE_ICON: Record<BusinessType, React.ComponentType<{ className?: string }>> = {
  products: ShoppingCart,
  services: ShoppingCart,
  nonprofit: Heart,
  realestate: Users,
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
          <Badge variant={status.variant}>{status.label}</Badge>
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
      <h1 className="text-xl font-semibold text-foreground">{lbl.title}</h1>

      {orders.length === 0 ? (
        <div className="text-center py-14 bg-muted/30 rounded-xl px-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ListIcon className="h-8 w-8 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground mb-1">{lbl.empty}</p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">{lbl.emptyDesc}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const status = statusConfig[order.status];
            return (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="w-full flex items-center gap-4 p-4 bg-card rounded-xl border border-border shadow-soft hover:border-primary/30 transition-colors text-right"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{order.customerName}</span>
                    <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
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
