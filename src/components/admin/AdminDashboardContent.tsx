import { useState } from "react";
import { 
  Building2, 
  ShoppingCart, 
  Eye, 
  Users, 
  TrendingUp, 
  Package,
  DollarSign,
  BarChart3,
  List,
  Settings,
  CreditCard,
  Gift,
  XCircle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePlatformStats } from "@/hooks/useAdmin";
import AdminStatsCards from "./AdminStatsCards";
import AdminBusinessesList from "./AdminBusinessesList";
import AdminOrdersList from "./AdminOrdersList";
import AdminAnalytics from "./AdminAnalytics";
import AdminUsersList from "./AdminUsersList";
import AdminPayments from "./AdminPayments";
import AdminReferrals from "./AdminReferrals";
import AdminCancellations from "./AdminCancellations";

const AdminDashboardContent = () => {
  const { data: stats, isLoading: statsLoading } = usePlatformStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Stats Overview */}
      <AdminStatsCards stats={stats} isLoading={statsLoading} />

      {/* Tabs for different sections */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-8 lg:w-auto lg:inline-grid">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">משתמשים</span>
          </TabsTrigger>
          <TabsTrigger value="businesses" className="gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">עסקים</span>
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">הזמנות</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">תשלומים</span>
          </TabsTrigger>
          <TabsTrigger value="referrals" className="gap-2">
            <Gift className="h-4 w-4" />
            <span className="hidden sm:inline">הפניות</span>
          </TabsTrigger>
          <TabsTrigger value="cancellations" className="gap-2">
            <XCircle className="h-4 w-4" />
            <span className="hidden sm:inline">ביטולים</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">אנליטיקס</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">הגדרות</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <AdminUsersList />
        </TabsContent>

        <TabsContent value="businesses">
          <AdminBusinessesList />
        </TabsContent>

        <TabsContent value="orders">
          <AdminOrdersList />
        </TabsContent>

        <TabsContent value="payments">
          <AdminPayments />
        </TabsContent>

        <TabsContent value="referrals">
          <AdminReferrals />
        </TabsContent>

        <TabsContent value="cancellations">
          <AdminCancellations />
        </TabsContent>

        <TabsContent value="analytics">
          <AdminAnalytics />
        </TabsContent>

        <TabsContent value="settings">
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-xl font-bold mb-4">הגדרות מערכת</h2>
            <p className="text-muted-foreground">הגדרות נוספות יתווספו בקרוב...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboardContent;
