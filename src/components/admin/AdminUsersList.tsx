import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, User, Mail, Calendar, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

type UserStatus = "registered" | "onboarding_started" | "onboarding_completed" | "active";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  status: UserStatus;
  auth_provider: string | null;
  created_at: string;
  onboarding_completed_at: string | null;
}

const statusConfig: Record<UserStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  registered: { 
    label: "נרשם", 
    color: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
    icon: Clock 
  },
  onboarding_started: { 
    label: "באמצע הקמה", 
    color: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    icon: Clock 
  },
  onboarding_completed: { 
    label: "השלים הקמה", 
    color: "bg-green-500/20 text-green-500 border-green-500/30",
    icon: CheckCircle 
  },
  active: { 
    label: "פעיל", 
    color: "bg-primary/20 text-primary border-primary/30",
    icon: CheckCircle 
  },
};

const AdminUsersList = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Profile[];
    },
  });

  const filteredUsers = users?.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery);
    
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate funnel stats
  const funnelStats = {
    total: users?.length || 0,
    registered: users?.filter(u => u.status === "registered").length || 0,
    onboardingStarted: users?.filter(u => u.status === "onboarding_started").length || 0,
    completed: users?.filter(u => u.status === "onboarding_completed" || u.status === "active").length || 0,
  };

  const conversionRate = funnelStats.total > 0 
    ? Math.round((funnelStats.completed / funnelStats.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Funnel Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{funnelStats.total}</div>
            <div className="text-sm text-muted-foreground">סה"כ נרשמים</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-500">{funnelStats.registered}</div>
            <div className="text-sm text-muted-foreground">לא התחילו הקמה</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-500">{funnelStats.onboardingStarted}</div>
            <div className="text-sm text-muted-foreground">באמצע הקמה</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-500">{funnelStats.completed}</div>
            <div className="text-sm text-muted-foreground">השלימו ({conversionRate}%)</div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            משתמשים ({filteredUsers?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי שם, אימייל או טלפון..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge 
                variant={statusFilter === "all" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setStatusFilter("all")}
              >
                הכל
              </Badge>
              <Badge 
                variant={statusFilter === "registered" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setStatusFilter("registered")}
              >
                נרשמו בלבד
              </Badge>
              <Badge 
                variant={statusFilter === "onboarding_completed" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setStatusFilter("onboarding_completed")}
              >
                השלימו הקמה
              </Badge>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">טוען...</div>
          ) : filteredUsers?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">לא נמצאו משתמשים</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>משתמש</TableHead>
                    <TableHead>אימייל</TableHead>
                    <TableHead>סטטוס</TableHead>
                    <TableHead>ספק כניסה</TableHead>
                    <TableHead>תאריך הרשמה</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => {
                    const statusInfo = statusConfig[user.status] || statusConfig.registered;
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-medium">{user.full_name || "לא צוין"}</div>
                              {user.phone && (
                                <div className="text-sm text-muted-foreground">{user.phone}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm" dir="ltr">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`gap-1 ${statusInfo.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.auth_provider === "google" ? "Google" : "אימייל"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(user.created_at), "dd/MM/yyyy HH:mm", { locale: he })}
                          </div>
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

export default AdminUsersList;