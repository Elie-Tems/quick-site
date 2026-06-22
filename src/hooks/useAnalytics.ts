import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AnalyticsData {
  totalViews: number;
  uniqueVisitors: number;
  viewsByDate: { date: string; views: number }[];
}

export const useAnalytics = (
  businessId: string | undefined,
  startDate?: Date,
  endDate?: Date
) => {
  return useQuery({
    queryKey: ["analytics", businessId, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async (): Promise<AnalyticsData> => {
      if (!businessId) {
        return { totalViews: 0, uniqueVisitors: 0, viewsByDate: [] };
      }

      let query = supabase
        .from("page_views")
        .select("*")
        .eq("business_id", businessId);

      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }
      if (endDate) {
        // Add 1 day to include the end date fully
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      const { data, error } = await query.order("created_at", { ascending: true });

      if (error) throw error;

      const views = data || [];
      
      // Calculate unique visitors
      const uniqueVisitorIds = new Set(views.map(v => v.visitor_id).filter(Boolean));
      
      // Group views by date
      const viewsByDateMap = new Map<string, number>();
      views.forEach(view => {
        const date = new Date(view.created_at).toLocaleDateString("he-IL");
        viewsByDateMap.set(date, (viewsByDateMap.get(date) || 0) + 1);
      });

      const viewsByDate = Array.from(viewsByDateMap.entries()).map(([date, viewCount]) => ({
        date,
        views: viewCount,
      }));

      return {
        totalViews: views.length,
        uniqueVisitors: uniqueVisitorIds.size,
        viewsByDate,
      };
    },
    enabled: false, // DISABLED - causes infinite loading, investigate RLS policy performance
    retry: 2,
    staleTime: 60000,
    gcTime: 300000,
  });
};

// Function to track a page view
export const trackPageView = async (businessId: string, pagePath: string = "/") => {
  // Get or create visitor ID
  let visitorId = localStorage.getItem("visitor_id");
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem("visitor_id", visitorId);
  }

  try {
    await supabase.from("page_views").insert({
      business_id: businessId,
      visitor_id: visitorId,
      page_path: pagePath,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error("Failed to track page view:", error);
  }
};
