import { useState } from "react";
import { ShoppingCart, ArrowRight, User, Phone, Mail, Package, Heart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
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
  checkin_date?: string;
  checkout_date?: string;
  num_guests?: number;
  unit_name?: string;
}

interface DashboardOrdersProps {
  orders: Order[];
  onOrdersChange: (orders: Order[]) => void;
  onStatusChange?: (orderId: string, status: Order['status']) => void;
  businessType?: BusinessType;
  isLoading?: boolean;
}

// Emoji per business type (not user-facing text, no translation needed)
const SECTION_EMOJI: Record<BusinessType, string> = {
  products: "📦",
  services: "📋",
  realestate: "🤝",
  vacation: "🛎️",
  nonprofit: "💰",
  synagogue: "🙏",
};

// Chip visual style per business type + status. Keyed by status id (not label text)
// so it keeps working no matter which language the label is rendered in.
const STATUS_STYLE_BY_TYPE: Record<BusinessType, Record<Order['status'], { bg: string; text: string }>> = {
  products: {
    received: { bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-300" },
    pending_payment: { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-300" },
    completed: { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300" },
    cancelled: { bg: "bg-red-500/15", text: "text-red-700 dark:text-red-300" },
  },
  services: {
    received: { bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-300" },
    pending_payment: { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-300" },
    completed: { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300" },
    cancelled: { bg: "bg-red-500/15", text: "text-red-700 dark:text-red-300" },
  },
  nonprofit: {
    received: { bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-300" },
    pending_payment: { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-300" },
    completed: { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300" },
    cancelled: { bg: "bg-red-500/15", text: "text-red-700 dark:text-red-300" },
  },
  synagogue: {
    received: { bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-300" },
    pending_payment: { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-300" },
    completed: { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300" },
    cancelled: { bg: "bg-red-500/15", text: "text-red-700 dark:text-red-300" },
  },
  realestate: {
    received: { bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-300" },
    pending_payment: { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-300" },
    completed: { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300" },
    cancelled: { bg: "bg-muted", text: "text-muted-foreground" },
  },
  vacation: {
    received: { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-300" },
    pending_payment: { bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-300" },
    completed: { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300" },
    cancelled: { bg: "bg-red-500/15", text: "text-red-700 dark:text-red-300" },
  },
};

type StatusVariantCfg = Record<Order['status'], { variant: 'default' | 'secondary' | 'destructive' | 'outline' }>;

const STATUS_VARIANT_BY_TYPE: Record<BusinessType, StatusVariantCfg> = {
  products: {
    received: { variant: 'secondary' },
    pending_payment: { variant: 'outline' },
    completed: { variant: 'default' },
    cancelled: { variant: 'destructive' },
  },
  services: {
    received: { variant: 'secondary' },
    pending_payment: { variant: 'outline' },
    completed: { variant: 'default' },
    cancelled: { variant: 'destructive' },
  },
  nonprofit: {
    received: { variant: 'secondary' },
    pending_payment: { variant: 'outline' },
    completed: { variant: 'default' },
    cancelled: { variant: 'destructive' },
  },
  synagogue: {
    received: { variant: 'secondary' },
    pending_payment: { variant: 'outline' },
    completed: { variant: 'default' },
    cancelled: { variant: 'destructive' },
  },
  realestate: {
    received: { variant: 'secondary' },
    pending_payment: { variant: 'outline' },
    completed: { variant: 'default' },
    cancelled: { variant: 'destructive' },
  },
  vacation: {
    received: { variant: 'secondary' },
    pending_payment: { variant: 'outline' },
    completed: { variant: 'default' },
    cancelled: { variant: 'destructive' },
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

const DashboardOrders = ({ orders, onOrdersChange, onStatusChange, businessType = 'products', isLoading = false }: DashboardOrdersProps) => {
  const { t } = useLanguage();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const STATUS_LABEL_BY_TYPE: Record<BusinessType, Record<Order['status'], string>> = {
    products: {
      received: t("dash.orders.status.received"),
      pending_payment: t("dash.orders.status.pending_payment"),
      completed: t("dash.orders.status.completed"),
      cancelled: t("dash.orders.status.cancelled"),
    },
    services: {
      received: t("dash.orders.status.received"),
      pending_payment: t("dash.orders.status.pending_payment"),
      completed: t("dash.orders.status.completed"),
      cancelled: t("dash.orders.status.cancelled"),
    },
    nonprofit: {
      received: t("dash.orders.status.received"),
      pending_payment: t("dash.orders.status.reviewing"),
      completed: t("dash.orders.status.recorded"),
      cancelled: t("dash.orders.status.cancelled"),
    },
    synagogue: {
      received: t("dash.orders.status.received"),
      pending_payment: t("dash.orders.status.reviewing"),
      completed: t("dash.orders.status.recorded"),
      cancelled: t("dash.orders.status.cancelled"),
    },
    realestate: {
      received: t("dash.orders.status.new_lead"),
      pending_payment: t("dash.orders.status.in_progress"),
      completed: t("dash.orders.status.closed"),
      cancelled: t("dash.orders.status.not_relevant"),
    },
    vacation: {
      received: t("dash.orders.status.awaiting_approval"),
      pending_payment: t("dash.orders.status.approved"),
      completed: t("dash.orders.status.departed"),
      cancelled: t("dash.orders.status.cancelled"),
    },
  };

  const SECTION_CONFIG: Record<BusinessType, { emoji: string; title: string; emptyMsg: string }> = {
    products: { emoji: SECTION_EMOJI.products, title: t("dash.orders.section.products.title"), emptyMsg: t("dash.orders.section.products.empty") },
    services: { emoji: SECTION_EMOJI.services, title: t("dash.orders.section.services.title"), emptyMsg: t("dash.orders.section.services.empty") },
    realestate: { emoji: SECTION_EMOJI.realestate, title: t("dash.orders.section.realestate.title"), emptyMsg: t("dash.orders.section.realestate.empty") },
    vacation: { emoji: SECTION_EMOJI.vacation, title: t("dash.orders.section.vacation.title"), emptyMsg: t("dash.orders.section.vacation.empty") },
    nonprofit: { emoji: SECTION_EMOJI.nonprofit, title: t("dash.orders.section.nonprofit.title"), emptyMsg: t("dash.orders.section.nonprofit.empty") },
    synagogue: { emoji: SECTION_EMOJI.synagogue, title: t("dash.orders.section.synagogue.title"), emptyMsg: t("dash.orders.section.synagogue.empty") },
  };

  // Per-type text labels
  const LABELS: Record<BusinessType, { title: string; single: string; contact: string; items: string; empty: string; emptyDesc: string; listItem: string }> = {
    products: {
      title: t("dash.orders.labels.products.title"), single: t("dash.orders.labels.products.single"), contact: t("dash.orders.labels.products.contact"), items: t("dash.orders.labels.products.items"),
      empty: t("dash.orders.labels.products.empty"),
      emptyDesc: t("dash.orders.labels.products.empty_desc"),
      listItem: t("dash.orders.labels.products.list_item"),
    },
    services: {
      title: t("dash.orders.labels.services.title"), single: t("dash.orders.labels.services.single"), contact: t("dash.orders.labels.services.contact"), items: t("dash.orders.labels.services.items"),
      empty: t("dash.orders.labels.services.empty"),
      emptyDesc: t("dash.orders.labels.services.empty_desc"),
      listItem: t("dash.orders.labels.services.list_item"),
    },
    nonprofit: {
      title: t("dash.orders.labels.nonprofit.title"), single: t("dash.orders.labels.nonprofit.single"), contact: t("dash.orders.labels.nonprofit.contact"), items: t("dash.orders.labels.nonprofit.items"),
      empty: t("dash.orders.labels.nonprofit.empty"),
      emptyDesc: t("dash.orders.labels.nonprofit.empty_desc"),
      listItem: t("dash.orders.labels.nonprofit.list_item"),
    },
    synagogue: {
      title: t("dash.orders.labels.synagogue.title"), single: t("dash.orders.labels.synagogue.single"), contact: t("dash.orders.labels.synagogue.contact"), items: t("dash.orders.labels.synagogue.items"),
      empty: t("dash.orders.labels.synagogue.empty"),
      emptyDesc: t("dash.orders.labels.synagogue.empty_desc"),
      listItem: t("dash.orders.labels.synagogue.list_item"),
    },
    realestate: {
      title: t("dash.orders.labels.realestate.title"), single: t("dash.orders.labels.realestate.single"), contact: t("dash.orders.labels.realestate.contact"), items: t("dash.orders.labels.realestate.items"),
      empty: t("dash.orders.labels.realestate.empty"),
      emptyDesc: t("dash.orders.labels.realestate.empty_desc"),
      listItem: t("dash.orders.labels.realestate.list_item"),
    },
    vacation: {
      title: t("dash.orders.labels.vacation.title"), single: t("dash.orders.labels.vacation.single"), contact: t("dash.orders.labels.vacation.contact"), items: t("dash.orders.labels.vacation.items"),
      empty: t("dash.orders.labels.vacation.empty"),
      emptyDesc: t("dash.orders.labels.vacation.empty_desc"),
      listItem: t("dash.orders.labels.vacation.list_item"),
    },
  };

  const statusVariant = STATUS_VARIANT_BY_TYPE[businessType];
  const statusLabel = STATUS_LABEL_BY_TYPE[businessType];
  const statusStyle = STATUS_STYLE_BY_TYPE[businessType];
  const lbl = LABELS[businessType];
  const ListIcon = TYPE_ICON[businessType];

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
    const statusText = statusLabel[selectedOrder.status];
    const chip = statusStyle[selectedOrder.status];

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
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${chip.bg} ${chip.text}`}>
            {statusText}
          </span>
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
                  <span className="font-medium text-foreground">{t("dash.orders.notes_label")}</span> {selectedOrder.notes}
                </p>
              )}
            </div>
          </div>

          {/* Vacation booking details */}
          {businessType === "vacation" && (selectedOrder.checkin_date || selectedOrder.checkout_date) && (
            <div className="rounded-xl bg-muted/40 p-3 space-y-1 text-sm">
              <div className="flex gap-4 flex-wrap">
                {selectedOrder.checkin_date && <div><span className="text-muted-foreground">{t("dash.orders.checkin_label")} </span><b>{selectedOrder.checkin_date}</b></div>}
                {selectedOrder.checkout_date && <div><span className="text-muted-foreground">{t("dash.orders.checkout_label")} </span><b>{selectedOrder.checkout_date}</b></div>}
              </div>
              {selectedOrder.num_guests && <div><span className="text-muted-foreground">{t("dash.orders.guests_label")} </span><b>{selectedOrder.num_guests}</b></div>}
              {selectedOrder.unit_name && <div><span className="text-muted-foreground">{t("dash.orders.unit_label")} </span><b>{selectedOrder.unit_name}</b></div>}
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
                <span className="font-semibold">{t("dash.orders.total_label")}</span>
                <span className="text-lg font-bold text-primary">{formatPrice(selectedOrder.total)}</span>
              </div>
            </div>
          </div>

          {/* Status Actions */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <h2 className="font-semibold mb-4">{t("dash.orders.update_status_heading")}</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusVariant).map(([key, config]) => (
                <Button
                  key={key}
                  variant={selectedOrder.status === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleStatusChange(selectedOrder.id, key as Order['status'])}
                >
                  {statusLabel[key as Order['status']]}
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
        const cfg = SECTION_CONFIG[businessType ?? "products"] ?? SECTION_CONFIG.products;
        return (
          <div className="rounded-2xl bg-gradient-to-l from-blue-500/15 to-blue-500/5 border border-blue-500/20 p-5 flex items-center gap-4">
            <div className="text-4xl">{cfg.emoji}</div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{cfg.title}</h1>
              <p className="text-sm text-muted-foreground">{(orders ?? []).length} {t("dash.orders.total_count_suffix")}</p>
            </div>
          </div>
        );
      })()}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="text-5xl mb-4">{(SECTION_CONFIG[businessType ?? "products"] ?? SECTION_CONFIG.products).emoji}</div>
          <p className="text-sm text-muted-foreground max-w-xs">
            {(SECTION_CONFIG[businessType ?? "products"] ?? SECTION_CONFIG.products).emptyMsg}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const statusText = statusLabel[order.status];
            const chip = statusStyle[order.status];
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
                      {statusText}
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
