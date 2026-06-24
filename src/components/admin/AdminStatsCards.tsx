import { 
  Building2, 
  ShoppingCart, 
  Eye, 
  Users, 
  Package,
  DollarSign,
  UserCheck
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformStats } from "@/hooks/useAdmin";

interface AdminStatsCardsProps {
  stats: PlatformStats | undefined;
  isLoading: boolean;
}

const AdminStatsCards = ({ stats, isLoading }: AdminStatsCardsProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const statItems = [
    {
      label: 'סה"כ עסקים',
      value: stats?.total_businesses || 0,
      icon: Building2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'סה"כ הזמנות',
      value: stats?.total_orders || 0,
      icon: ShoppingCart,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'הכנסה חודשית (מנויים)',
      value: formatCurrency(stats?.total_revenue || 0),
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      isFormatted: true,
    },
    {
      label: 'סה"כ צפיות',
      value: stats?.total_page_views || 0,
      icon: Eye,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'מבקרים ייחודיים',
      value: stats?.total_unique_visitors || 0,
      icon: UserCheck,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
    {
      label: 'סה"כ מוצרים',
      value: stats?.total_products || 0,
      icon: Package,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
    },
    {
      label: 'סה"כ משתמשים',
      value: stats?.total_users || 0,
      icon: Users,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {statItems.map((item) => (
        <div 
          key={item.label}
          className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow"
        >
          <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center mb-3`}>
            <item.icon className={`h-5 w-5 ${item.color}`} />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {item.isFormatted ? item.value : item.value.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  );
};

export default AdminStatsCards;
