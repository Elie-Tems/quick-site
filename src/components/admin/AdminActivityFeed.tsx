import { Zap, ShoppingCart, UserPlus, Globe, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivityFeed, ActivityEvent } from "@/hooks/useAdmin";

const eventConfig = {
  order:   { icon: ShoppingCart, color: "text-green-500",  bg: "bg-green-500/10" },
  signup:  { icon: UserPlus,     color: "text-blue-500",   bg: "bg-blue-500/10" },
  publish: { icon: Globe,        color: "text-violet-500", bg: "bg-violet-500/10" },
  cancel:  { icon: XCircle,      color: "text-red-500",    bg: "bg-red-500/10" },
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `לפני ${diff}ש'`;
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)}ד'`;
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)}ש"`;
  return `לפני ${Math.floor(diff / 86400)} ימים`;
}

const AdminActivityFeed = () => {
  const { data, isLoading } = useActivityFeed();

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <Zap className="h-5 w-5 text-yellow-500" />
        Activity Feed
        <span className="text-xs text-muted-foreground font-normal mr-auto">מתעדכן כל 30 שניות</span>
      </h3>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : (data ?? []).length > 0 ? (
        <div className="space-y-2 max-h-[480px] overflow-y-auto">
          {(data ?? []).map((event: ActivityEvent) => {
            const cfg = eventConfig[event.type];
            const Icon = cfg.icon;
            return (
              <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                </div>
                <p className="text-sm flex-1">{event.label}</p>
                <span className="text-xs text-muted-foreground shrink-0">{timeAgo(event.time)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center py-8 text-muted-foreground">אין פעילות עדיין</p>
      )}
    </div>
  );
};

export default AdminActivityFeed;
