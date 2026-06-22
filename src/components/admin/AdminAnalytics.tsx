import { useState } from "react";
import { 
  BarChart3,
  TrendingUp,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageViewsOverTime, usePlatformStats } from "@/hooks/useAdmin";

const AdminAnalytics = () => {
  const [timeRange, setTimeRange] = useState(30);
  const { data: viewsData, isLoading: viewsLoading } = usePageViewsOverTime(timeRange);
  const { data: stats } = usePlatformStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const maxViews = Math.max(...(viewsData?.map(d => d.views) || [1]));

  return (
    <div className="space-y-6">
      {/* Time range selector */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">טווח זמן:</span>
        <div className="flex gap-2">
          {[7, 14, 30, 60].map((days) => (
            <Button
              key={days}
              variant={timeRange === days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(days)}
            >
              {days} ימים
            </Button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">ממוצע צפיות יומי</span>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {viewsData && viewsData.length > 0 
              ? Math.round(viewsData.reduce((sum, d) => sum + d.views, 0) / viewsData.length)
              : 0
            }
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-green-500" />
            <span className="text-sm text-muted-foreground">ממוצע הכנסה להזמנה</span>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {stats && stats.total_orders > 0 
              ? formatCurrency(stats.total_revenue / stats.total_orders)
              : '₪0'
            }
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-purple-500" />
            <span className="text-sm text-muted-foreground">ממוצע מוצרים לעסק</span>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {stats && stats.total_businesses > 0 
              ? Math.round(stats.total_products / stats.total_businesses)
              : 0
            }
          </p>
        </div>
      </div>

      {/* Page views chart */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          צפיות לפי תאריך
        </h3>
        
        {viewsLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : viewsData && viewsData.length > 0 ? (
          <div className="space-y-2">
            {viewsData.slice(-14).map((item) => (
              <div key={item.date} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-20 text-left">
                  {item.date}
                </span>
                <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                  <div 
                    className="h-full bg-primary/80 rounded transition-all duration-300"
                    style={{ width: `${(item.views / maxViews) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-12 text-left">
                  {item.views}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            אין נתוני צפיות לטווח הזמן הנבחר
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnalytics;
