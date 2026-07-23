import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Mail, Phone, Globe, ExternalLink,
  CheckCircle2, Clock, XCircle,
  ChevronDown, ChevronUp, Eye, RotateCcw, StickyNote, Loader2, Trash2, Store,
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";
import BillingChargesPanel from "./BillingChargesPanel";

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
  onboarding_completed_at: string | null;
  status: string | null;
  businesses: BusinessRow[];
}

function StoreBadge({ b }: { b: BusinessRow }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
      <div className="flex items-center gap-2 min-w-0">
        <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium truncate">{b.name}</span>
        {b.business_category && (
          <span className="text-xs text-muted-foreground hidden sm:inline">{b.business_category}</span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 mr-2">
        {b.is_published ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="h-3 w-3" /> פעיל
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
            <Clock className="h-3 w-3" /> לא פורסם
          </span>
        )}
        {b.slug && (
          <a
            href={`/store/${b.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-muted-foreground hover:text-primary"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

function MerchantCard({
  m,
  onResetOnboarding,
  onDeleteUser,
}: {
  m: MerchantRow;
  onResetOnboarding: (profileId: string) => void;
  onDeleteUser: (userId: string, email: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!expanded || note !== null || !m.profile_id) return;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("profiles").select("admin_notes").eq("id", m.profile_id).maybeSingle();
        setNote((data?.admin_notes as string) ?? "");
      } catch { setNote(""); }
    })();
  }, [expanded, note, m.profile_id]);

  const saveNote = async () => {
    setSavingNote(true);
    const { data, error } = await (supabase as any)
      .from("profiles").update({ admin_notes: note ?? "" }).eq("id", m.profile_id).select();
    setSavingNote(false);
    if (error) toast.error("להפעלת ההערות יש להריץ את מיגרציית admin_notes");
    else if (!data || data.length === 0) toast.error("ההערה לא נשמרה - אין הרשאה");
    else toast.success("ההערה נשמרה");
  };

  const storeCount = m.businesses.length;
  const activeCount = m.businesses.filter(b => b.is_published).length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden transition-shadow hover:shadow-md">
      {/* Header row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
          {(m.full_name || m.email || "?")[0].toUpperCase()}
        </div>

        {/* Name + email */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{m.full_name || "-"}</p>
          <p className="text-xs text-muted-foreground truncate">{m.email}</p>
        </div>

        {/* Store count badge */}
        <div className="shrink-0">
          {storeCount === 0 ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <XCircle className="h-3 w-3" /> ללא חנות
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              <Store className="h-3 w-3" />
              {storeCount === 1 ? "חנות אחת" : `${storeCount} חנויות`}
              {activeCount > 0 && (
                <span className="text-green-700">· {activeCount} פעיל</span>
              )}
            </span>
          )}
        </div>

        {/* Date */}
        <p className="hidden lg:block text-xs text-muted-foreground shrink-0">
          {format(new Date(m.registered_at), "dd/MM/yy", { locale: he })}
        </p>

        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 p-4 space-y-4 text-sm">
          {/* Top: contact + actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact info */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase">פרטי סוחר</p>
              {m.email && (
                <a href={`mailto:${m.email}`} className="flex items-center gap-2 text-primary hover:underline text-xs">
                  <Mail className="h-3.5 w-3.5" /> {m.email}
                </a>
              )}
              {m.phone && (
                <p className="flex items-center gap-2 text-muted-foreground text-xs">
                  <Phone className="h-3.5 w-3.5" /> {m.phone}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                נרשם: {format(new Date(m.registered_at), "dd/MM/yyyy HH:mm", { locale: he })}
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">פעולות</p>
              <div className="flex flex-wrap gap-2">
                {m.email && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                    <a href={`mailto:${m.email}`}><Mail className="h-3.5 w-3.5" /> שלח מייל</a>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 text-amber-700 border-amber-300 hover:bg-amber-50"
                  onClick={() => onResetOnboarding(m.profile_id)}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> אפס onboarding
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 text-red-700 border-red-300 hover:bg-red-50"
                  onClick={() => onDeleteUser(m.user_id, m.email)}
                >
                  <Trash2 className="h-3.5 w-3.5" /> מחק משתמש
                </Button>
              </div>
            </div>
          </div>

          {/* Stores list */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              חנויות ({storeCount})
            </p>
            {storeCount === 0 ? (
              <p className="text-xs text-muted-foreground">לא יצר חנות עדיין</p>
            ) : (
              <div className="space-y-2">
                {m.businesses.map(b => <StoreBadge key={b.id} b={b} />)}
              </div>
            )}
          </div>

          {/* Billing */}
          {m.user_id && (
            <div>
              <BillingChargesPanel userId={m.user_id} />
            </div>
          )}

          {/* Admin notes */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5 mb-1.5">
              <StickyNote className="h-3.5 w-3.5" /> הערות פנימיות
            </p>
            <textarea
              value={note ?? ""}
              onChange={e => setNote(e.target.value)}
              placeholder="הערות אדמין על הסוחר (נראה רק לנו)..."
              rows={2}
              className="w-full text-sm rounded-lg border border-border bg-background p-2.5 resize-y"
              dir="rtl"
            />
            <div className="mt-1.5">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={saveNote} disabled={savingNote || note === null}>
                {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StickyNote className="h-3.5 w-3.5" />} שמור הערה
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
    const { data, error } = await supabase
      .from("profiles")
      .update({ onboarding_completed_at: null, status: "registered" } as any)
      .eq("id", profileId)
      .select();
    if (error) toast.error("שגיאה באיפוס: " + error.message);
    else if (!data || data.length === 0) toast.error("האיפוס נכשל - אין הרשאה");
    else {
      toast.success("ה-onboarding אופס");
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    }
  };

  const handleDeleteUser = async (userId: string, email: string | null) => {
    const label = email || userId;
    if (!window.confirm(`למחוק לצמיתות את המשתמש "${label}"?\n\nפעולה זו תמחק את החשבון, הפרופיל וכל החנויות שלו ואינה הפיכה.`)) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("אין session"); return; }
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      toast.success(`המשתמש "${label}" נמחק`);
      queryClient.invalidateQueries({ queryKey: ["admin-customers"] });
    } catch (e: any) {
      toast.error("שגיאה במחיקה: " + e.message);
    }
  };

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

      // Group by profile (user). A user may have 0-N businesses.
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
            onboarding_completed_at: p?.onboarding_completed_at ?? null,
            status: p?.status ?? null,
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

      return Array.from(byProfile.values());
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
          { label: "סוחרים", value: totalMerchants, color: "text-foreground" },
          { label: "חנויות", value: totalStores, color: "text-blue-600" },
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
          {filtered.map(m => (
            <MerchantCard
              key={m.profile_id || m.email}
              m={m}
              onResetOnboarding={handleResetOnboarding}
              onDeleteUser={handleDeleteUser}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;
