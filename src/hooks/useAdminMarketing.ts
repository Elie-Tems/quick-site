import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Siango's OWN acquisition marketing (admin-only): the funnel for the campaigns
 * Siango runs to get new merchants. Per UTM source: ad visits (clicks) ->
 * signups (conversions); plus admin-managed budget per channel and the overall
 * cost per acquired signup. Built from siango_ad_visits + admin_signups_by_utm
 * RPC + siango_ad_channels.
 */
export interface AdChannel {
  id: string;
  name: string;
  budget_amount: number;
  budget_currency: string;
  budget_period: string;
  notes: string | null;
}

export interface SourceFunnel {
  source: string;
  views: number;       // ad clicks / landings
  signups: number;     // conversions
  convRate: number;    // %
}

export interface AdminMarketingData {
  channels: AdChannel[];
  sources: SourceFunnel[];
  totals: { budget: number; views: number; signups: number; costPerSignup: number };
}

const val = <T,>(r: PromiseSettledResult<{ data: T[] | null }>, fb: T[] = []): T[] =>
  r.status === "fulfilled" ? (r.value.data || fb) : fb;

export function useAdminMarketing(days = 30) {
  return useQuery<AdminMarketingData>({
    queryKey: ["admin-siango-marketing", days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceIso = since.toISOString();

      const [chR, vsR, suR] = await Promise.allSettled([
        (supabase as any).from("siango_ad_channels").select("id, name, budget_amount, budget_currency, budget_period, notes").order("budget_amount", { ascending: false }),
        (supabase as any).from("siango_ad_visits").select("utm_source").gte("created_at", sinceIso).limit(100000),
        (supabase as any).rpc("admin_signups_by_utm", { p_since: sinceIso }),
      ]);

      const channels = val(chR) as AdChannel[];
      const visits = val(vsR) as Array<{ utm_source: string | null }>;
      const signupRows = (suR.status === "fulfilled" ? (suR.value.data || []) : []) as Array<{ source: string; campaign: string; signups: number }>;

      // Views per source (ad clicks/landings).
      const viewsBySource: Record<string, number> = {};
      for (const v of visits) {
        const s = (v.utm_source || "").trim().toLowerCase();
        if (!s) continue;
        viewsBySource[s] = (viewsBySource[s] || 0) + 1;
      }
      // Signups per source (sum across campaigns), excluding direct/no-utm.
      const signupsBySource: Record<string, number> = {};
      for (const r of signupRows) {
        const s = (r.source || "").trim().toLowerCase();
        if (!s || s === "direct") continue;
        signupsBySource[s] = (signupsBySource[s] || 0) + Number(r.signups || 0);
      }

      const allSources = new Set([...Object.keys(viewsBySource), ...Object.keys(signupsBySource)]);
      const sources: SourceFunnel[] = Array.from(allSources)
        .map((s) => {
          const views = viewsBySource[s] || 0;
          const signups = signupsBySource[s] || 0;
          return { source: s, views, signups, convRate: views ? Math.round((signups / views) * 1000) / 10 : 0 };
        })
        .sort((a, b) => b.signups - a.signups || b.views - a.views);

      const budget = channels.reduce((s, c) => s + (Number(c.budget_amount) || 0), 0);
      const totalSignups = sources.reduce((s, x) => s + x.signups, 0);
      const totalViews = sources.reduce((s, x) => s + x.views, 0);

      return {
        channels,
        sources,
        totals: {
          budget,
          views: totalViews,
          signups: totalSignups,
          costPerSignup: totalSignups ? Math.round((budget / totalSignups) * 10) / 10 : 0,
        },
      };
    },
  });
}
