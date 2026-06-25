import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Command Center data: today's pulse + headline KPIs + actionable alerts, all
 * from existing tables (admin RLS read). Each piece is resolved independently
 * (Promise.allSettled) so one failing query never blanks the whole dashboard.
 */
export interface CommandCenterData {
  today: {
    signups: number;
    published: number;
    newSubscribers: number;
    orders: number;
    gmv: number;
    newDomains: number;
  };
  kpis: {
    mrr: number;
    arr: number;
    activeStores: number;
    totalUsers: number;
  };
  alerts: {
    lowDomainBalance: { balance: number; currency: string } | null;
    failedDomainOrders: number;
    pendingCancellations: number;
  };
}

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const val = <T,>(r: PromiseSettledResult<T>, fallback: T): T =>
  r.status === "fulfilled" ? r.value : fallback;

async function countSince(table: string, sinceCol: string, since: string, extra?: (q: any) => any): Promise<number> {
  let q = (supabase as any).from(table).select("*", { count: "exact", head: true }).gte(sinceCol, since);
  if (extra) q = extra(q);
  const { count } = await q;
  return count || 0;
}

export function useCommandCenter() {
  return useQuery<CommandCenterData>({
    queryKey: ["command-center"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const today = startOfToday();
      const nowIso = new Date().toISOString();

      const [
        signups, published, newSubscribers, newDomains,
        ordersToday, subs, activeStores, totalUsers,
        balanceRow, failedDomainOrders, pendingCancellations,
      ] = await Promise.allSettled([
        countSince("profiles", "created_at", today),
        countSince("businesses", "published_at", today, (q) => q.eq("is_published", true)),
        countSince("subscriptions", "created_at", today),
        countSince("domains", "created_at", today),
        (supabase as any).from("orders").select("total_price").gte("created_at", today),
        (supabase as any).from("subscriptions").select("monthly_total, paid_until, status"),
        (supabase as any).from("businesses").select("*", { count: "exact", head: true }).eq("is_published", true),
        (supabase as any).from("profiles").select("*", { count: "exact", head: true }),
        (supabase as any).from("domain_provider_status").select("balance, currency").eq("provider", "openprovider").maybeSingle(),
        (supabase as any).from("domain_orders").select("*", { count: "exact", head: true }).in("status", ["failed", "failed_funds"]),
        (supabase as any).from("subscriptions").select("*", { count: "exact", head: true }).not("cancel_at", "is", null).gt("cancel_at", nowIso),
      ]);

      const ordersRows = (val(ordersToday as any, { data: [] }).data || []) as Array<{ total_price: number | null }>;
      const subsRows = (val(subs as any, { data: [] }).data || []) as Array<{ monthly_total: number | null; paid_until: string | null; status: string | null }>;
      const now = new Date();
      const mrr = subsRows
        .filter((s) => s.status === "active" && s.paid_until && new Date(s.paid_until) > now)
        .reduce((sum, s) => sum + (Number(s.monthly_total) || 69), 0);

      const balance = val(balanceRow as any, { data: null }).data as { balance: number | null; currency: string | null } | null;

      return {
        today: {
          signups: val(signups as any, 0),
          published: val(published as any, 0),
          newSubscribers: val(newSubscribers as any, 0),
          orders: ordersRows.length,
          gmv: ordersRows.reduce((s, o) => s + (Number(o.total_price) || 0), 0),
          newDomains: val(newDomains as any, 0),
        },
        kpis: {
          mrr,
          arr: mrr * 12,
          activeStores: val(activeStores as any, { count: 0 }).count || 0,
          totalUsers: val(totalUsers as any, { count: 0 }).count || 0,
        },
        alerts: {
          lowDomainBalance:
            balance && balance.balance != null && balance.balance < 20
              ? { balance: balance.balance, currency: balance.currency || "USD" }
              : null,
          failedDomainOrders: val(failedDomainOrders as any, { count: 0 }).count || 0,
          pendingCancellations: val(pendingCancellations as any, { count: 0 }).count || 0,
        },
      };
    },
  });
}
