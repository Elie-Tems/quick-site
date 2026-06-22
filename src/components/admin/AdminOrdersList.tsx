import { useState } from "react";
import { 
  ShoppingCart,
  Search,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard,
  Package
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAllOrders } from "@/hooks/useAdmin";

const statusConfig: Record<string, { label: string; icon: any; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'ממתין', icon: Clock, variant: 'secondary' },
  confirmed: { label: 'אושר', icon: CheckCircle, variant: 'default' },
  paid: { label: 'שולם', icon: CreditCard, variant: 'default' },
  completed: { label: 'הושלם', icon: Package, variant: 'default' },
  cancelled: { label: 'בוטל', icon: XCircle, variant: 'destructive' },
};

const AdminOrdersList = () => {
  const { data: orders, isLoading } = useAllOrders();
  const [searchQuery, setSearchQuery] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredOrders = orders?.filter(order => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.customer_name.toLowerCase().includes(query) ||
      order.customer_email.toLowerCase().includes(query) ||
      order.business_name.toLowerCase().includes(query)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש לפי שם לקוח, אימייל או עסק..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Orders count */}
      <p className="text-sm text-muted-foreground">
        {filteredOrders?.length || 0} הזמנות (100 אחרונות)
      </p>

      {/* Orders list */}
      <div className="space-y-3">
        {filteredOrders?.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-xl">
            <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">לא נמצאו הזמנות</p>
          </div>
        ) : (
          filteredOrders?.map((order) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            
            return (
              <div 
                key={order.id}
                className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Order info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{order.customer_name}</h3>
                      <Badge variant={status.variant} className="gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span>{order.customer_email}</span>
                      <span>{order.customer_phone}</span>
                    </div>
                  </div>

                  {/* Business */}
                  <div className="text-sm">
                    <a 
                      href={order.business_slug ? `/store/${order.business_slug}` : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      {order.business_name}
                      {order.business_slug && <ExternalLink className="h-3 w-3" />}
                    </a>
                  </div>

                  {/* Price & Date */}
                  <div className="text-left">
                    <p className="font-bold text-foreground">{formatCurrency(order.total_price)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminOrdersList;
