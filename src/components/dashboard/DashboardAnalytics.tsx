import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Eye, Users, CalendarIcon, TrendingUp } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface DashboardAnalyticsProps {
  businessId: string | undefined;
}

type DateRange = "7days" | "30days" | "thisMonth" | "custom";

const DashboardAnalytics = ({ businessId }: DashboardAnalyticsProps) => {
  const { t } = useLanguage();
  const [dateRange, setDateRange] = useState<DateRange>("7days");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case "7days":
        return { start: subDays(now, 7), end: now };
      case "30days":
        return { start: subDays(now, 30), end: now };
      case "thisMonth":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "custom":
        return { start: customStartDate, end: customEndDate };
      default:
        return { start: subDays(now, 7), end: now };
    }
  };

  const { start, end } = getDateRange();
  const { data: analytics, isLoading } = useAnalytics(businessId, start, end);

  const dateRangeButtons = [
    { key: "7days" as DateRange, label: t("dash.analytics.range_7days") },
    { key: "30days" as DateRange, label: t("dash.analytics.range_30days") },
    { key: "thisMonth" as DateRange, label: t("dash.analytics.range_this_month") },
  ];

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          {t("dash.analytics.title")}
        </CardTitle>
        
        <div className="flex items-center gap-2 flex-wrap">
          {dateRangeButtons.map((btn) => (
            <Button
              key={btn.key}
              variant={dateRange === btn.key ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRange(btn.key)}
            >
              {btn.label}
            </Button>
          ))}
          
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={dateRange === "custom" ? "default" : "outline"}
                size="sm"
                className="gap-2"
              >
                <CalendarIcon className="w-4 h-4" />
                {dateRange === "custom" && customStartDate && customEndDate
                  ? `${format(customStartDate, "dd/MM")} - ${format(customEndDate, "dd/MM")}`
                  : t("dash.analytics.custom_range_placeholder")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-4 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t("dash.analytics.from_date_label")}</p>
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={(date) => {
                      setCustomStartDate(date);
                      setDateRange("custom");
                    }}
                    locale={he}
                    disabled={(date) => date > new Date()}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t("dash.analytics.to_date_label")}</p>
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={(date) => {
                      setCustomEndDate(date);
                      setDateRange("custom");
                    }}
                    locale={he}
                    disabled={(date) => 
                      date > new Date() || 
                      (customStartDate ? date < customStartDate : false)
                    }
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("dash.analytics.views_label")}</p>
                  <p className="text-3xl font-bold">
                    {isLoading ? "..." : analytics?.totalViews || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Eye className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t("dash.analytics.unique_visitors_label")}</p>
                  <p className="text-3xl font-bold">
                    {isLoading ? "..." : analytics?.uniqueVisitors || 0}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {analytics?.viewsByDate && analytics.viewsByDate.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-muted-foreground mb-4">{t("dash.analytics.views_by_date_title")}</h4>
            <div className="space-y-2">
              {analytics.viewsByDate.slice(-7).map((item) => (
                <div key={item.date} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm">{item.date}</span>
                  <span className="font-medium">{item.views} {t("dash.analytics.views_suffix")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {(!analytics?.viewsByDate || analytics.viewsByDate.length === 0) && !isLoading && (
          <div className="mt-6 text-center text-muted-foreground py-8">
            <Eye className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>{t("dash.analytics.empty_title")}</p>
            <p className="text-sm">{t("dash.analytics.empty_desc")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardAnalytics;
