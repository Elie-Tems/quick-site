import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, ExternalLink, Mail, Phone, Globe,
  CheckCircle2, XCircle, Clock, ShoppingBag,
  ChevronDown, ChevronUp, Eye,
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface CustomerRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  onboarding_completed_at: string | null;
  status: string | null;
  business?: {
    id: string;
    business_name: string;
    slug: string | null;
    is_published: boolean | null;
    business_category: string | null;
    created_at: string;
    subscription_plan: string | null;
    orders_count?: number;
  } | null;
}

const PLAN_LABELS: Record<string, string> = {
  basic: "בסיסי", recommended: "מומלץ", premium: "פרימיום",
};
const PLAN_COLORS: Record<string, string> = {
  basic: "bg-slate-100 text-slate-700",
  recommended: "bg-blue-100 text-blue-700",
  premium: "bg-purple-100 text-purple-700",
};

function StatusBadge({ published }: { published: boolean | null }) {
  if (published) return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="h-3 w-3" /> פעיל
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
      <Clock className="h-3 w-3" /> לא פורסם
    </span>
  );
}

function CustomerCard({ c }: { c: CustomerRow }) {
  const [expanded, setExpanded] = useState(false);
  const b = c.business;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden transition-shadow hover:shadow-md">
      {/* Main row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
          {(c.full_name || c.email || "?")[0].toUpperCase()}
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{c.full_name || "—"}</p>
          <p className="text-xs text-muted-foreground truncate">{c.email}</p>
        </div>

        {/* Store name */}
        <div className="hidden md:block flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{b?.business_name || "אין חנות"}</p>
          <p className="text-xs text-muted-foreground">{b?.business_category || ""}</p>
        </div>

        {/* Status */}
        <div className="shrink-0">
          {b ? <StatusBadge published={b.is_published} /> : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <XCircle className="h-3 w-3" /> ללא חנות
            </span>
          )}
        </div>

        {/* Plan */}
        {b?.subscription_plan && (
          <span className={`hidden md:inline text-xs font-medium px-2 py-0.5 rounded-full ${PLAN_COLORS[b.subscription_plan] ?? "bg-muted text-muted-foreground"}`}>
            {PLAN_LABELS[b.subscription_plan] ?? b.subscription_plan}
          </span>
        )}

        {/* Date */}
        <p className="hidden lg:block text-xs text-muted-foreground shrink-0">
          {format(new Date(c.created_at), "dd/MM/yy", { locale: he })}
        </p>

        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {/* Customer info */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">פרטי לקוח</p>
            {c.email && (
              <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-primary hover:underline">
                <Mail className="h-4 w-4" /> {c.email}
              </a>
            )}
            {c.phone && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" /> {c.phone}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              נרשם: {format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: he })}
            </p>
            {c.onboarding_completed_at && (
              <p className="text-xs text-muted-foreground">
                סיים onboarding: {format(new Date(c.onboarding_completed_at), "dd/MM/yyyy", { locale: he })}
              </p>
            )}
          </div>

          {/* Store info */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">פרטי חנות</p>
            {b ? (
              <>
                <p className="font-medium">{b.business_name}</p>
                <p className="text-xs text-muted-foreground">{b.business_category || "ללא קטגוריה"}</p>
                <p className="text-xs text-muted-foreground">
                  נוצרה: {format(new Date(b.created_at), "dd/MM/yyyy", { locale: he })}
                </p>
                {b.slug && (
                  <a
                    href={`/store/${b.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" /> /store/{b.slug}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-xs">לא יצר חנות עדיין</p>
            )}
          </div>

          {/* Stats + actions */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase">פעולות</p>
            <div className="flex flex-wrap gap-2">
              {c.email && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                  <a href={`mailto:${c.email}`}><Mail className="h-3.5 w-3.5" /> שלח מייל</a>
                </Button>
              )}
              {b?.slug && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                  <a href={`/store/${b.slug}`} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-3.5 w-3.5" /> צפה בחנות
                  </a>
                </Button>
              )}
            </div>
            {b?.orders_count !== undefined && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShoppingBag className="h-3.5 w-3.5" /> {b.orders_count} הזמנות
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const AdminCustomers = () => {
  const [search, setSearch] = useState("");

  const { data: customers, isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`
          id, full_name, email, phone, created_at, onboarding_completed_at, status,
          businesses (
            id, business_name, slug, is_published, business_category, created_at, subscription_plan
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (profiles ?? []).map((p: any) => ({
        ...p,
        business: p.businesses?.[0] ?? null,
      })) as CustomerRow[];
    },
  });

  const filtered = (customers ?? []).filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      c.full_name?.toLowerCase().includes(s) ||
      c.email?.toLowerCase().includes(s) ||
      c.business?.business_name?.toLowerCase().includes(s) ||
      c.business?.slug?.toLowerCase().includes(s)
    );
  });

  const total = customers?.length ?? 0;
  const withStore = customers?.filter(c => c.business).length ?? 0;
  const published = customers?.filter(c => c.business?.is_published).length ?? 0;

  return (
    <div className="space-y-4" dir="rtl">
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "סה״כ לקוחות", value: total, color: "text-foreground" },
          { label: "עם חנות", value: withStore, color: "text-blue-600" },
          { label: "חנויות פעילות", value: published, color: "text-green-600" },
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

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">אין תוצאות</div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_1fr_auto] gap-4 px-4 text-xs font-semibold text-muted-foreground uppercase">
            <span>לקוח</span><span>חנות</span><span>סטטוס</span><span>תוכנית</span><span>תאריך</span><span></span>
          </div>
          {filtered.map(c => <CustomerCard key={c.id} c={c} />)}
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;
