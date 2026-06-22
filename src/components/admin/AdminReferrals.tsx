import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Gift, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Search,
  Download,
  TrendingUp,
  Zap
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";

interface ReferralLogWithUsers {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  reward_given: boolean;
  reward_days: number;
  created_at: string;
  rewarded_at: string | null;
  referrer_email?: string;
  referred_email?: string;
}

const AdminReferrals = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  // Fetch all referral logs with user emails
  const { data: referralLogs, isLoading } = useQuery({
    queryKey: ['admin-referral-logs'],
    queryFn: async () => {
      // Get referral logs
      const { data: logs, error } = await supabase
        .from('referral_logs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get all profiles to map emails
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email');
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.email]) || []);
      
      return logs?.map(log => ({
        ...log,
        referrer_email: profileMap.get(log.referrer_user_id) || 'לא ידוע',
        referred_email: profileMap.get(log.referred_user_id) || 'לא ידוע',
      })) as ReferralLogWithUsers[];
    },
  });

  // Manual reward mutation
  const grantRewardMutation = useMutation({
    mutationFn: async (referredEmail: string) => {
      const { data, error } = await supabase.rpc('admin_grant_referral_reward', {
        referred_user_email: referredEmail
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("התגמול הוענק בהצלחה!");
      queryClient.invalidateQueries({ queryKey: ['admin-referral-logs'] });
    },
    onError: (error) => {
      toast.error("שגיאה בהענקת התגמול");
      console.error(error);
    },
  });

  // Calculate stats
  const stats = {
    totalReferrals: referralLogs?.length || 0,
    rewardedReferrals: referralLogs?.filter(r => r.reward_given).length || 0,
    pendingReferrals: referralLogs?.filter(r => !r.reward_given).length || 0,
    totalMonthsGiven: referralLogs?.filter(r => r.reward_given).reduce((sum, r) => sum + (r.reward_days / 30), 0) || 0,
  };

  // Filter logs
  const filteredLogs = referralLogs?.filter(log => 
    log.referrer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.referred_email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Export to CSV
  const handleExport = () => {
    if (!filteredLogs.length) return;
    
    const headers = ['תאריך', 'מפנה', 'מופנה', 'סטטוס', 'תאריך תגמול'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), 'dd/MM/yyyy', { locale: he }),
      log.referrer_email,
      log.referred_email,
      log.reward_given ? 'תוגמל' : 'ממתין',
      log.rewarded_at ? format(new Date(log.rewarded_at), 'dd/MM/yyyy', { locale: he }) : '-',
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `referrals-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm text-muted-foreground">סה״כ הפניות</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalReferrals}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm text-muted-foreground">הפניות שתוגמלו</span>
          </div>
          <p className="text-2xl font-bold">{stats.rewardedReferrals}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-sm text-muted-foreground">ממתינות לתשלום</span>
          </div>
          <p className="text-2xl font-bold">{stats.pendingReferrals}</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Gift className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm text-muted-foreground">חודשים שחולקו</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalMonthsGiven.toFixed(0)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי אימייל..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            ייצוא CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>תאריך הפניה</TableHead>
                <TableHead>מפנה</TableHead>
                <TableHead>מופנה</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>תאריך תגמול</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="animate-pulse">טוען...</div>
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    לא נמצאו הפניות
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                    </TableCell>
                    <TableCell className="font-medium">{log.referrer_email}</TableCell>
                    <TableCell>{log.referred_email}</TableCell>
                    <TableCell>
                      {log.reward_given ? (
                        <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
                          <CheckCircle2 className="h-3 w-3 ml-1" />
                          תוגמל
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                          <Clock className="h-3 w-3 ml-1" />
                          ממתין
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.rewarded_at 
                        ? format(new Date(log.rewarded_at), 'dd/MM/yyyy', { locale: he })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      {!log.reward_given && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => grantRewardMutation.mutate(log.referred_email || '')}
                          disabled={grantRewardMutation.isPending}
                          className="gap-1"
                        >
                          <Zap className="h-3 w-3" />
                          תגמל ידנית
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AdminReferrals;
