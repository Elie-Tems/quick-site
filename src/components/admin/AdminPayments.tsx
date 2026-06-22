import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  Download,
  Calendar,
  DollarSign,
  Building2
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

type PaymentStatus = "pending" | "success" | "failed" | "refunded" | "cancelled";

interface Payment {
  id: string;
  order_id: string | null;
  business_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_provider: string | null;
  provider_transaction_id: string | null;
  error_message: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  created_at: string;
  businesses?: { name: string } | null;
}

interface PaymentStats {
  total_payments: number;
  successful_payments: number;
  failed_payments: number;
  pending_payments: number;
  refunded_payments: number;
  total_revenue: number;
  revenue_last_30_days: number;
  revenue_last_7_days: number;
  revenue_this_month: number;
}

const statusConfig: Record<PaymentStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { 
    label: "ממתין", 
    color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    icon: Clock 
  },
  success: { 
    label: "הצליח", 
    color: "bg-green-500/20 text-green-500 border-green-500/30",
    icon: CheckCircle 
  },
  failed: { 
    label: "נכשל", 
    color: "bg-red-500/20 text-red-500 border-red-500/30",
    icon: XCircle 
  },
  refunded: { 
    label: "הוחזר", 
    color: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    icon: RefreshCw 
  },
  cancelled: { 
    label: "בוטל", 
    color: "bg-gray-500/20 text-gray-500 border-gray-500/30",
    icon: XCircle 
  },
};

const AdminPayments = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "month" | "all">("30d");

  // Fetch payment stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-payment-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_payment_stats")
        .select("*")
        .single();

      if (error) throw error;
      return data as PaymentStats;
    },
  });

  // Fetch payments list
  const { data: payments, isLoading: paymentsLoading, refetch } = useQuery({
    queryKey: ["admin-payments", statusFilter, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select(`
          *,
          businesses:business_id (name)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      // Date filtering
      const now = new Date();
      if (dateRange === "7d") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        query = query.gte("created_at", weekAgo.toISOString());
      } else if (dateRange === "30d") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        query = query.gte("created_at", monthAgo.toISOString());
      } else if (dateRange === "month") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        query = query.gte("created_at", startOfMonth.toISOString());
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as Payment[];
    },
  });

  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = 
      payment.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.provider_transaction_id?.includes(searchQuery) ||
      payment.businesses?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const exportToCSV = () => {
    if (!filteredPayments?.length) return;

    const headers = ["תאריך", "עסק", "לקוח", "סכום", "סטטוס", "ספק", "מזהה עסקה", "שגיאה"];
    const rows = filteredPayments.map(p => [
      format(new Date(p.created_at), "dd/MM/yyyy HH:mm"),
      p.businesses?.name || "",
      p.customer_name || "",
      p.amount,
      statusConfig[p.status]?.label || p.status,
      p.payment_provider || "",
      p.provider_transaction_id || "",
      p.error_message || ""
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `payments-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const successRate = stats?.total_payments 
    ? Math.round((stats.successful_payments / stats.total_payments) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : formatCurrency(stats?.total_revenue || 0)}
                </div>
                <div className="text-sm text-muted-foreground">סה"כ הכנסות</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : formatCurrency(stats?.revenue_this_month || 0)}
                </div>
                <div className="text-sm text-muted-foreground">החודש</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">
                  {statsLoading ? "..." : stats?.successful_payments || 0}
                </div>
                <div className="text-sm text-muted-foreground">תשלומים מוצלחים</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">
                  {statsLoading ? "..." : stats?.failed_payments || 0}
                </div>
                <div className="text-sm text-muted-foreground">סירובים ({100 - successRate}%)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              תשלומים ({filteredPayments?.length || 0})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
              <Download className="h-4 w-4" />
              ייצא דוח CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי שם לקוח, עסק או מזהה עסקה..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            
            <div className="flex gap-2 flex-wrap">
              {/* Date Range */}
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                {[
                  { value: "7d", label: "7 ימים" },
                  { value: "30d", label: "30 ימים" },
                  { value: "month", label: "החודש" },
                  { value: "all", label: "הכל" },
                ].map((range) => (
                  <Button
                    key={range.value}
                    variant={dateRange === range.value ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setDateRange(range.value as typeof dateRange)}
                    className="text-xs"
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Status Filters */}
          <div className="flex gap-2 flex-wrap mb-6">
            <Badge 
              variant={statusFilter === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter("all")}
            >
              הכל
            </Badge>
            <Badge 
              variant={statusFilter === "success" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter("success")}
            >
              הצליחו
            </Badge>
            <Badge 
              variant={statusFilter === "failed" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter("failed")}
            >
              נכשלו
            </Badge>
            <Badge 
              variant={statusFilter === "pending" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter("pending")}
            >
              ממתינים
            </Badge>
            <Badge 
              variant={statusFilter === "refunded" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setStatusFilter("refunded")}
            >
              הוחזרו
            </Badge>
          </div>

          {/* Table */}
          {paymentsLoading ? (
            <div className="text-center py-8 text-muted-foreground">טוען...</div>
          ) : filteredPayments?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>אין תשלומים עדיין</p>
              <p className="text-sm mt-2">תשלומים יופיעו כאן כשלקוחות ישלמו בחנויות</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>תאריך</TableHead>
                    <TableHead>עסק</TableHead>
                    <TableHead>לקוח</TableHead>
                    <TableHead>סכום</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead>ספק</TableHead>
                    <TableHead>פרטים</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments?.map((payment) => {
                    const statusInfo = statusConfig[payment.status] || statusConfig.pending;
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", { locale: he })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{payment.businesses?.name || "לא ידוע"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{payment.customer_name || "לא צוין"}</div>
                            {payment.customer_email && (
                              <div className="text-sm text-muted-foreground" dir="ltr">
                                {payment.customer_email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold">{formatCurrency(payment.amount)}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={`gap-1 ${statusInfo.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{payment.payment_provider || "-"}</span>
                        </TableCell>
                        <TableCell>
                          {payment.status === "failed" && payment.error_message ? (
                            <div className="text-sm text-red-500 max-w-[200px] truncate" title={payment.error_message}>
                              {payment.error_message}
                            </div>
                          ) : payment.provider_transaction_id ? (
                            <div className="text-xs text-muted-foreground font-mono" dir="ltr">
                              {payment.provider_transaction_id}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPayments;
