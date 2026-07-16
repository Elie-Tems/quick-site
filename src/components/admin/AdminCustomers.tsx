import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, ExternalLink, Mail, Phone, Globe,
  CheckCircle2, XCircle, Clock, ShoppingBag,
  ChevronDown, ChevronUp, Eye, RotateCcw, StickyNote, Loader2, HeartPulse,
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";
import BillingChargesPanel from "./BillingChargesPanel";

// ---- Merchant 360: lifecycle / health stage, computed from what we already have.
// A real CRM header answer to "who is this merchant and what's their state" without
// any new schema. Plain Hebrew, heuristic but honest.
type Tone = "green" | "blue" | "amber" | "muted" | "red";
function lifecycleStage(c: CustomerRow): { label: string; tone: Tone; hint: string } {
  const b = c.business;
  if (!b) return { label: "רשום · ללא חנות", tone: "muted", hint: "נרשם אך לא הקים חנות" };
  const ageDays = (Date.now() - new Date(b.created_at).getTime()) / 86_400_000;
  if (!b.is_published) return { label: "בהקמה", tone: "amber", hint: "חנות נוצרה אך עוד לא פורסמה" };
  if (ageDays <= 30) return { label: "חדש · פעיל", tone: "blue", hint: "חנות פורסמה לאחרונה" };
  return { label: "פעיל", tone: "green", hint: "חנות פורסמה ופעילה" };
}
const TONE_CLS: Record<Tone, string> = {
  green: "text-green-700 bg-green-100",
  blue: "text-blue-700 bg-blue-100",
  amber: "text-amber-700 bg-amber-100",
  red: "text-red-700 bg-red-100",
  muted: "text-muted-foreground bg-muted",
};

interface CustomerRow {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  onboarding_completed_at: string | null;
  status: string | null;
  business?: {
    id: string;
    name: string;
    slug: string | null;
    is_published: boolean | null;
    business_category: string | null;
    created_at: string;
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

function CustomerCard({ c, onResetOnboarding }: { c: CustomerRow; onResetOnboarding: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const b = c.business;
  const stage = lifecycleStage(c);

  // Internal admin notes (real CRM). Loaded lazily on expand and saved to
  // profiles.admin_notes. Guarded so a missing column (migration not applied)
  // never breaks the card - it just hints to run the migration.
  const [note, setNote] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  useEffect(() => {
    if (!expanded || note !== null) return;
    (async () => {
      try {
        const { data } = await (supabase as any).from("profiles").select("admin_notes").eq("id", c.id).maybeSingle();
        setNote((data?.admin_notes as string) ?? "");
      } catch { setNote(""); }
    })();
  }, [expanded, note, c.id]);
  const saveNote = async () => {
    setSavingNote(true);
    // .select() so a 0-row write (blocked by RLS / no admin permission) is
    // detectable - without it Supabase reports success even when nothing was
    // written, silently losing the note.
    const { data, error } = await (supabase as any).from("profiles").update({ admin_notes: note ?? "" }).eq("id", c.id).select();
    setSavingNote(false);
    if (error) toast.error("להפעלת ההערות יש להריץ את מיגרציית admin_notes");
    else if (!data || data.length === 0) toast.error("ההערה לא נשמרה - אין הרשאה לעדכן סוחר זה");
    else toast.success("ההערה נשמרה");
  };

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
          <p className="font-semibold text-sm truncate">{c.full_name || "-"}</p>
          <p className="text-xs text-muted-foreground truncate">{c.email}</p>
        </div>

        {/* Store name */}
        <div className="hidden md:block flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{b?.name || "אין חנות"}</p>
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

        {/* Lifecycle stage (Merchant 360) */}
        <span title={stage.hint} className={`hidden sm:inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${TONE_CLS[stage.tone]}`}>
          {stage.label}
        </span>


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
                <p className="font-medium">{b.name}</p>
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
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
                onClick={() => onResetOnboarding(c.id)}
              >
                <RotateCcw className="h-3.5 w-3.5" /> אפס onboarding
              </Button>
            </div>
            {b?.orders_count !== undefined && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShoppingBag className="h-3.5 w-3.5" /> {b.orders_count} הזמנות
              </p>
            )}
          </div>
          {/* Merchant 360: health / lifecycle at a glance */}
          <div className="md:col-span-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><HeartPulse className="h-4 w-4" /> מחזור חיים</span>
            <span title={stage.hint} className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${TONE_CLS[stage.tone]}`}>{stage.label}</span>
            <span className="text-xs text-muted-foreground">{stage.hint}</span>
          </div>

          {/* Subscription charges + admin refund (full width) */}
          <div className="md:col-span-3">
            <BillingChargesPanel userId={c.user_id} />
          </div>

          {/* Internal admin notes (real CRM) */}
          <div className="md:col-span-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5 mb-1.5"><StickyNote className="h-3.5 w-3.5" /> הערות פנימיות</p>
            <textarea
              value={note ?? ""}
              onChange={(e) => setNote(e.target.value)}
              placeholder="הערות אדמין על הסוחר (נראה רק לנו)..."
              rows={2}
              className="w-full text-sm rounded-lg border border-border bg-background p-2.5 resize-y"
              dir="rtl"
            />
            <div className="mt-1.5">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={saveNote} disabled={savingNote || note === null}>
                {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StickyNote className="h-3.5 w-3.5" />} שמירת הערה
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const AdminCustomers = () => {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const handleResetOnboarding = async (profileId: string) => {
    if (!window.confirm("לאפס את ה-onboarding למשתמש זה? הוא יועבר לאשף בכניסה הבאה.")) return;
    // .select() so a 0-row update (blocked by RLS / no admin permission) surfaces
    // as an error instead of a false success - Supabase returns no error when an
    // UPDATE matches no writable rows.
    const { data, error } = await supabase
      .from("profiles")
      .update({ onboarding_completed_at: null, status: "registered" } as any)
      .eq("id", profileId)
      .select();
    if (error) {
      toast.error("שגיאה באיפוס: " + error.message);
    } else if (!data || data.length === 0) {
      toast.error("האיפוס נכשל - אין הרשאה לעדכן משתמש זה");
    } else {
      toast.success("ה-onboarding אופס - המשתמש יועבר לאשף בכניסה הבאה");
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    }
  };

  const { data: customers, isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select(`
          id, user_id, full_name, email, phone, created_at, onboarding_completed_at, status,
          businesses (
            id, name, slug, is_published, business_category, created_at
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
          {filtered.map(c => <CustomerCard key={c.id} c={c} onResetOnboarding={handleResetOnboarding} />)}
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;
