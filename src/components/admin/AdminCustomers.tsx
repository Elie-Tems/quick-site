import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Search, XCircle, CheckCircle2, Clock, Store,
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface BusinessRow {
  id: string;
  name: string;
  slug: string | null;
  is_published: boolean | null;
  business_category: string | null;
  created_at: string;
}

interface MerchantRow {
  profile_id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  registered_at: string;
  plan: string | null;
  subscriptionStatus: string | null;
  businesses: BusinessRow[];
}

const AdminCustomers = ({ onSelectMerchant }: { onSelectMerchant?: (businessId: string) => void } = {}) => {
  const [search, setSearch] = useState("");

  const { data: merchants, isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data: businesses, error } = await supabase
        .from("businesses")
        .select(`
          id, name, slug, is_published, business_category, created_at,
          profiles (
            id, user_id, full_name, email, phone, created_at, onboarding_completed_at, status
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const byProfile = new Map<string, MerchantRow>();

      for (const b of (businesses ?? []) as any[]) {
        const p = Array.isArray(b.profiles) ? (b.profiles[0] ?? null) : (b.profiles ?? null);
        const profileKey = p?.id ?? `anon-${b.id}`;

        if (!byProfile.has(profileKey)) {
          byProfile.set(profileKey, {
            profile_id: p?.id ?? "",
            user_id: p?.user_id ?? "",
            full_name: p?.full_name ?? null,
            email: p?.email ?? b.email ?? null,
            phone: p?.phone ?? null,
            registered_at: p?.created_at ?? b.created_at,
            plan: null,
            subscriptionStatus: null,
            businesses: [],
          });
        }

        byProfile.get(profileKey)!.businesses.push({
          id: b.id,
          name: b.name,
          slug: b.slug,
          is_published: b.is_published,
          business_category: b.business_category,
          created_at: b.created_at,
        });
      }

      const rows = Array.from(byProfile.values());

      // Fetch subscription plans for users that have them
      const userIds = rows.map(r => r.user_id).filter(Boolean);
      if (userIds.length > 0) {
        const { data: subs } = await (supabase as any)
          .from("subscriptions")
          .select("user_id, plan, status")
          .in("user_id", userIds)
          .order("created_at", { ascending: false });

        if (subs) {
          const subByUser = new Map<string, { plan: string; status: string }>();
          for (const s of subs) {
            if (!subByUser.has(s.user_id)) subByUser.set(s.user_id, { plan: s.plan, status: s.status });
          }
          for (const r of rows) {
            const sub = subByUser.get(r.user_id);
            if (sub) { r.plan = sub.plan; r.subscriptionStatus = sub.status; }
          }
        }
      }

      return rows;
    },
  });

  const filtered = (merchants ?? []).filter(m => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      m.full_name?.toLowerCase().includes(s) ||
      m.email?.toLowerCase().includes(s) ||
      m.businesses.some(b => b.name.toLowerCase().includes(s) || b.slug?.toLowerCase().includes(s))
    );
  });

  const totalMerchants = merchants?.length ?? 0;
  const totalStores = merchants?.reduce((sum, m) => sum + m.businesses.length, 0) ?? 0;
  const activeStores = merchants?.reduce((sum, m) => sum + m.businesses.filter(b => b.is_published).length, 0) ?? 0;

  return (
    <div className="space-y-4" dir="rtl">
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "סה\"כ לקוחות", value: totalMerchants, color: "text-foreground" },
          { label: "עם חנות", value: totalStores, color: "text-blue-600" },
          { label: "חנויות פעילות", value: activeStores, color: "text-green-600" },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="חפש לפי שם, מייל, שם חנות..."
          className="pr-9"
          dir="rtl"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-3 px-4 py-2.5 border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground">
          <span>לקוח</span>
          <span>חנות</span>
          <span className="hidden lg:block">סטטוס</span>
          <span className="hidden lg:block">תכנית</span>
          <span>תאריך</span>
        </div>

        {isLoading ? (
          <div className="space-y-0">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 border-b border-border last:border-0 bg-muted/10 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">אין תוצאות</div>
        ) : (
          filtered.map(m => {
            const firstBusiness = m.businesses[0] ?? null;
            const storeCount = m.businesses.length;
            const activeCount = m.businesses.filter(b => b.is_published).length;
            const isClickable = !!(onSelectMerchant && firstBusiness);

            return (
              <div
                key={m.profile_id || m.email}
                onClick={isClickable ? () => onSelectMerchant!(firstBusiness!.id) : undefined}
                className={`grid grid-cols-[1fr_1fr_auto_auto_auto] gap-3 items-center px-4 py-3 border-b border-border last:border-0 text-sm transition-colors ${isClickable ? "cursor-pointer hover:bg-muted/40" : ""}`}
              >
                {/* Customer */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                    {(m.full_name || m.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                </div>

                {/* Store */}
                <div className="min-w-0">
                  {storeCount === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <XCircle className="h-3 w-3" /> אין חנות
                    </span>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Store className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{firstBusiness?.name}</span>
                      </div>
                      {storeCount > 1 && (
                        <p className="text-xs text-muted-foreground">+{storeCount - 1} חנויות נוספות</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="hidden lg:flex items-center gap-1">
                  {storeCount === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                      רשום · ללא חנות
                    </span>
                  ) : activeCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 whitespace-nowrap">
                      <CheckCircle2 className="h-3 w-3" /> פעיל
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 whitespace-nowrap">
                      <Clock className="h-3 w-3" /> לא פורסם
                    </span>
                  )}
                </div>

                {/* Plan */}
                <div className="hidden lg:block">
                  {m.plan ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium whitespace-nowrap">{m.plan}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">ללא מנוי</span>
                  )}
                </div>

                {/* Date */}
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(m.registered_at), "dd/MM/yy", { locale: he })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminCustomers;
