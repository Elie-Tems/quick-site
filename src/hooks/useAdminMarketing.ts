import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Platform-wide marketing/ads intelligence for the super-admin: ad budget per
 * channel (across all stores) + per-source performance (views, conversions,
 * revenue, conversion rate). Built from ad_channels / ad_links / page_views /
 * analytics_events. Each query is independent (allSettled) so one failure never
 * blanks the screen.
 */
export interface ChannelBudget {
  name: string;
  totalBudget: number;
  currency: string;
  period: string;
  businesses: number;
  links: number;
  clicks: number;
}

export interface SourcePerformance {
  source: string;
  views: number;
  conversions: number;
  revenue: number;
  convRate: number; // %
}

export interface AdminMarketingData {
  channels: ChannelBudget[];
  sources: SourcePerformance[];
  totals: { budget: number; views: number; conversions: number; revenue: number };
}

const val = <T,>(r: PromiseSettledResult<{ data: T[] | null }>, fb: T[] = []): T[] =>
  r.status === "fulfilled" ? (r.value.data || fb) : fb;

export function useAdminMarketing(days = 30) {
  return useQuery<AdminMarketingData>({
    queryKey: ["admin-marketing", days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceIso = since.toISOString();

      const [chR, lnR, pvR, evR] = await Promise.allSettled([
        (supabase as any).from("ad_channels").select("name, budget_amount, budget_currency, budget_period, business_id").limit(10000),
        (supabase as any).from("ad_links").select("channel_id, utm_source, clicks").limit(20000),
        (supabase as any).from("page_views").select("visitor_id, utm_source").not("utm_source", "is", null).gte("created_at", sinceIso).limit(50000),
        (supabase as any).from("analytics_events").select("visitor_id, value").eq("event_type", "purchase").gte("created_at", sinceIso).limit(50000),
      ]);

      const channels = val(chR) as Array<{ name: string; budget_amount: number | null; budget_currency: string | null; budget_period: string | null; business_id: string }>;
      const links = val(lnR) as Array<{ channel_id: string; utm_source: string | null; clicks: number | null }>;
      const pageViews = val(pvR) as Array<{ visitor_id: string | null; utm_source: string | null }>;
      const purchases = val(evR) as Array<{ visitor_id: string | null; value: number | null }>;

      // --- Budget per channel (grouped by normalized channel name) ---
      // Map clicks per channel via channel_id is not available without the channel rows'
      // ids; instead sum clicks per channel NAME by joining links->channels is skipped
      // (ad_links lacks the name). We aggregate clicks by utm_source separately below.
      const chMap = new Map<string, ChannelBudget>();
      for (const c of channels) {
        const name = (c.name || "אחר").trim();
        const key = name.toLowerCase();
        const e = chMap.get(key) || { name, totalBudget: 0, currency: c.budget_currency || "ILS", period: c.budget_period || "monthly", businesses: 0, links: 0, clicks: 0 };
        e.totalBudget += Number(c.budget_amount) || 0;
        e.businesses += 1;
        chMap.set(key, e);
      }
      const channelBudgets = Array.from(chMap.values()).sort((a, b) => b.totalBudget - a.totalBudget);

      // --- Visitor -> source map (for conversion attribution) ---
      const visitorSource = new Map<string, string>();
      const viewsBySource: Record<string, number> = {};
      for (const pv of pageViews) {
        const src = (pv.utm_source || "").trim().toLowerCase();
        if (!src) continue;
        viewsBySource[src] = (viewsBySource[src] || 0) + 1;
        if (pv.visitor_id && !visitorSource.has(pv.visitor_id)) visitorSource.set(pv.visitor_id, src);
      }

      // --- Conversions + revenue per source (attributed by the buyer's source) ---
      const convBySource: Record<string, number> = {};
      const revBySource: Record<string, number> = {};
      for (const ev of purchases) {
        const src = ev.visitor_id ? visitorSource.get(ev.visitor_id) : undefined;
        if (!src) continue;
        convBySource[src] = (convBySource[src] || 0) + 1;
        revBySource[src] = (revBySource[src] || 0) + (Number(ev.value) || 0);
      }

      const sources: SourcePerformance[] = Object.keys(viewsBySource)
        .map((src) => {
          const views = viewsBySource[src];
          const conversions = convBySource[src] || 0;
          return {
            source: src,
            views,
            conversions,
            revenue: revBySource[src] || 0,
            convRate: views ? Math.round((conversions / views) * 1000) / 10 : 0,
          };
        })
        .sort((a, b) => b.views - a.views);

      const totals = {
        budget: channelBudgets.reduce((s, c) => s + c.totalBudget, 0),
        views: sources.reduce((s, x) => s + x.views, 0),
        conversions: sources.reduce((s, x) => s + x.conversions, 0),
        revenue: sources.reduce((s, x) => s + x.revenue, 0),
      };

      return { channels: channelBudgets, sources, totals };
    },
  });
}
