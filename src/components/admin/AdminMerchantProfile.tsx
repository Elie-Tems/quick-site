import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import {
  ArrowRight, Mail, ExternalLink, StickyNote, Trash2,
  Globe, ToggleLeft, ToggleRight, Loader2, ChevronLeft,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface MerchantProfileData {
  businessId: string;
  businessName: string;
  slug: string | null;
  businessCategory: string | null;
  isPublished: boolean;
  enabledModules: Record<string, boolean>;
  businessPhone: string | null;
  businessEmail: string | null;
  businessCreatedAt: string;
  aboutText: string;
  profileId: string | null;
  userId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  ownerRegisteredAt: string | null;
  adminNotes: string;
  plan: string | null;
  subscriptionStatus: string | null;
  paidUntil: string | null;
  cancelAt: string | null;
  totalOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  recentOrders: Array<{ id: string; created_at: string; total_price: number | null; status: string | null }>;
  recentActivity: Array<{ text: string; time: string }>;
}

function useMerchantProfile(businessId: string) {
  return useQuery<MerchantProfileData>({
    queryKey: ["merchant-profile", businessId],
    queryFn: async () => {
      const [bizRes, ordersRes, customersRes] = await Promise.all([
        (supabase as any)
          .from("businesses")
          .select(`
            id, name, slug, business_category, is_published,
            enabled_modules, phone, email, created_at, about_text,
            profiles ( id, user_id, full_name, email, phone, created_at, admin_notes )
          `)
          .eq("id", businessId)
          .maybeSingle(),
        (supabase as any)
          .from("orders")
          .select("id, created_at, total_price, status")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false })
          .limit(20),
        (supabase as any)
          .from("customers")
          .select("*", { count: "exact", head: true })
          .eq("business_id", businessId),
      ]);

      const biz = bizRes.data;
      if (!biz) throw new Error("Business not found");

      const profile = Array.isArray(biz.profiles) ? biz.profiles[0] : biz.profiles;
      const orders = (ordersRes.data || []) as Array<{ id: string; created_at: string; total_price: number | null; status: string | null }>;

      let sub: any = null;
      if (profile?.user_id) {
        const { data } = await (supabase as any)
          .from("subscriptions")
          .select("plan, status, paid_until, cancel_at")
          .eq("user_id", profile.user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        sub = data;
      }

      const totalRevenue = orders.reduce((s, o) => s + (Number(o.total_price) || 0), 0);

      const recentActivity = orders.slice(0, 5).map(o => ({
        text: `הזמנה #${o.id.slice(0, 8)} — ₪${Math.round(Number(o.total_price) || 0)}`,
        time: format(new Date(o.created_at), "dd/MM HH:mm", { locale: he }),
      }));

      return {
        businessId: biz.id,
        businessName: biz.name,
        slug: biz.slug,
        businessCategory: biz.business_category,
        isPublished: biz.is_published ?? false,
        enabledModules: (biz.enabled_modules as Record<string, boolean>) || {},
        businessPhone: biz.phone,
        businessEmail: biz.email,
        businessCreatedAt: biz.created_at,
        profileId: profile?.id ?? null,
        userId: profile?.user_id ?? null,
        ownerName: profile?.full_name ?? null,
        ownerEmail: profile?.email ?? null,
        ownerPhone: profile?.phone ?? null,
        ownerRegisteredAt: profile?.created_at ?? null,
        adminNotes: (profile?.admin_notes as string) ?? "",
        aboutText: biz.about_text ?? "",
        plan: sub?.plan ?? null,
        subscriptionStatus: sub?.status ?? null,
        paidUntil: sub?.paid_until ?? null,
        cancelAt: sub?.cancel_at ?? null,
        totalOrders: orders.length,
        totalRevenue,
        totalCustomers: customersRes.count || 0,
        recentOrders: orders,
        recentActivity,
      };
    },
  });
}

type Tab = "overview" | "log" | "site" | "notes";

function OverviewTab({ data }: { data: MerchantProfileData }) {
  const ils = (n: number) => `₪${Math.round(n).toLocaleString("he-IL")}`;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'הזמנות סה"כ', value: data.totalOrders },
          { label: "מחזור כולל", value: ils(data.totalRevenue) },
          { label: "לקוחות", value: data.totalCustomers },
          { label: "סטטוס מנוי", value: data.subscriptionStatus === "active" ? "פעיל" : data.subscriptionStatus || "—" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4">
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground">פעילות אחרונה</div>
          {data.recentActivity.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">אין פעילות עדיין</p>
          ) : data.recentActivity.map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
              <span className="flex-1 text-muted-foreground">{a.text}</span>
              <span className="text-xs text-muted-foreground shrink-0">{a.time}</span>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground">פרטי חשבון</div>
          {[
            { label: "שם בעלים", value: data.ownerName || "—" },
            { label: "מייל", value: data.ownerEmail || "—" },
            { label: "טלפון", value: data.ownerPhone || "—" },
            { label: "מסלול", value: data.plan || "ללא מנוי" },
            { label: "חידוש הבא", value: data.paidUntil ? format(new Date(data.paidUntil), "dd.MM.yyyy", { locale: he }) : "—" },
          ].map(f => (
            <div key={f.label} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 text-sm">
              <span className="text-muted-foreground">{f.label}</span>
              <span className="font-medium">{f.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LogTab({ data }: { data: MerchantProfileData }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground">לוג הזמנות</div>
      {data.recentOrders.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground text-center">אין הזמנות עדיין</p>
      ) : data.recentOrders.map(o => (
        <div key={o.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 text-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          <span className="flex-1 text-muted-foreground">הזמנה #{o.id.slice(0, 8)}</span>
          <span className="font-medium">₪{Math.round(Number(o.total_price) || 0)}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            {format(new Date(o.created_at), "dd/MM/yy HH:mm", { locale: he })}
          </span>
        </div>
      ))}
    </div>
  );
}

function AboutTextEditor({ businessId, initialText, onRefresh }: {
  businessId: string;
  initialText: string;
  onRefresh: () => void;
}) {
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("businesses")
      .update({ about_text: text })
      .eq("id", businessId);
    setSaving(false);
    if (error) toast.error("שגיאה בשמירה: " + error.message);
    else { toast.success("טקסט אודות עודכן"); onRefresh(); }
  };

  return (
    <div className="p-4 space-y-3">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
        dir="rtl"
        placeholder="טקסט אודות העסק..."
        className="w-full text-sm rounded-lg border border-border bg-background p-3 resize-y"
      />
      <Button size="sm" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" /> : null}
        שמור
      </Button>
    </div>
  );
}

function SiteTab({ data, businessId, onRefresh }: {
  data: MerchantProfileData;
  businessId: string;
  onRefresh: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const knownModules = [
    { key: "booking", label: "יומן תורים" },
    { key: "gallery", label: "גלריה" },
    { key: "crm_plus", label: "CRM+" },
    { key: "campaigns", label: "קמפיינים" },
    { key: "coupons", label: "קופונים" },
  ];

  const toggleModule = async (key: string, current: boolean) => {
    setSaving(true);
    const updated = { ...data.enabledModules, [key]: !current };
    const { error } = await (supabase as any)
      .from("businesses")
      .update({ enabled_modules: updated })
      .eq("id", businessId);
    setSaving(false);
    if (error) toast.error("שגיאה בעדכון מודול");
    else { toast.success("מודול עודכן"); onRefresh(); }
  };

  return (
    <div className="space-y-4">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground">הגדרות אתר</div>
        {[
          { label: "שם עסק", value: data.businessName },
          { label: "slug", value: data.slug || "—" },
          { label: "קטגוריה", value: data.businessCategory || "—" },
          { label: "טלפון", value: data.businessPhone || "—" },
          { label: "מייל", value: data.businessEmail || "—" },
        ].map(f => (
          <div key={f.label} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 text-sm">
            <span className="text-muted-foreground">{f.label}</span>
            <span className="font-medium text-left" dir="ltr">{f.value}</span>
          </div>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground flex items-center justify-between">
          מודולים פעילים
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </div>
        {knownModules.map(m => {
          const active = !!data.enabledModules[m.key];
          return (
            <div key={m.key} className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0 text-sm">
              <span className="text-muted-foreground">{m.label}</span>
              <button
                onClick={() => toggleModule(m.key, active)}
                disabled={saving}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${active ? "text-green-600" : "text-muted-foreground"}`}
              >
                {active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                {active ? "פעיל" : "כבוי"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border text-xs font-semibold text-muted-foreground">טקסט אודות</div>
      <AboutTextEditor businessId={businessId} initialText={data.aboutText} onRefresh={onRefresh} />
    </div>
    </div>
  );
}

function NotesTab({ profileId, notes, setNotes, savingNotes, setSavingNotes }: {
  profileId: string | null;
  notes: string;
  setNotes: (v: string) => void;
  savingNotes: boolean;
  setSavingNotes: (v: boolean) => void;
}) {
  const save = async () => {
    if (!profileId) { toast.error("אין פרופיל — לא ניתן לשמור הערה"); return; }
    setSavingNotes(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ admin_notes: notes })
      .eq("id", profileId);
    setSavingNotes(false);
    if (error) toast.error("שגיאה בשמירת הערה: " + error.message);
    else toast.success("הערה נשמרה");
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground">הערות פנימיות — נראה רק למוטי ודניאל</p>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={6}
        placeholder="הוסף הערה..."
        dir="rtl"
        className="w-full text-sm rounded-lg border border-border bg-background p-3 resize-y"
      />
      <Button size="sm" onClick={save} disabled={savingNotes}>
        {savingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" /> : null}
        שמור הערה
      </Button>
    </div>
  );
}

const AdminMerchantProfile = ({
  businessId,
  onBack,
}: {
  businessId: string;
  onBack: () => void;
}) => {
  const { data, isLoading, error } = useMerchantProfile(businessId);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [notes, setNotes] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (data && notes === null) setNotes(data.adminNotes);

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (error || !data) return (
    <div className="p-6 text-destructive">שגיאה בטעינת הפרופיל</div>
  );

  const initials = (data.businessName || "?").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Back bar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-card text-sm">
        <button onClick={onBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight className="h-4 w-4" /> סוחרים
        </button>
        <ChevronLeft className="h-3 w-3 text-muted-foreground" />
        <span className="text-foreground font-medium">{data.businessName}</span>
      </div>

      {/* Merchant header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg">{data.businessName}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${data.isPublished ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
              {data.isPublished ? "פעיל" : "לא פורסם"}
            </span>
            {data.plan && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{data.plan}</span>
            )}
            {data.businessCategory && (
              <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted-foreground">{data.businessCategory}</span>
            )}
          </div>
          {data.slug && (
            <p className="text-xs text-muted-foreground mt-1">
              siango.app/{data.slug} · נרשם {data.businessCreatedAt ? format(new Date(data.businessCreatedAt), "dd.MM.yyyy", { locale: he }) : "—"}
            </p>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-2 px-6 py-2.5 border-b border-border bg-card flex-wrap">
        {data.ownerEmail && (
          <a href={`mailto:${data.ownerEmail}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors text-primary">
            <Mail className="h-3.5 w-3.5" /> שלח מייל
          </a>
        )}
        {data.slug && (
          <a href={`https://siango.app/${data.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors">
            <Globe className="h-3.5 w-3.5" /> פתח אתר
          </a>
        )}
        <button
          onClick={() => setActiveTab("notes")}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
        >
          <StickyNote className="h-3.5 w-3.5" /> הוסף הערה
        </button>
        <button
          onClick={() => setDeleteDialogOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-colors mr-auto"
        >
          <Trash2 className="h-3.5 w-3.5" /> מחק אתר
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 py-0 border-b border-border bg-background">
        {(["overview", "log", "site", "notes"] as Tab[]).map(t => {
          const labels: Record<Tab, string> = { overview: "סקירה", log: "לוג פעילות", site: "הגדרות אתר", notes: "הערות פנימיות" };
          return (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-3 text-sm border-b-2 -mb-px transition-colors ${activeTab === t ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeTab === "overview" && <OverviewTab data={data} />}
        {activeTab === "log" && <LogTab data={data} />}
        {activeTab === "site" && (
          <SiteTab
            data={data}
            businessId={businessId}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ["merchant-profile", businessId] })}
          />
        )}
        {activeTab === "notes" && (
          <NotesTab
            profileId={data.profileId}
            notes={notes ?? ""}
            setNotes={setNotes}
            savingNotes={savingNotes}
            setSavingNotes={setSavingNotes}
          />
        )}
      </div>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>מחיקת אתר — {data.businessName}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">האתר, המוצרים, ההזמנות, והלקוחות שלו יימחקו לצמיתות. אין דרך חזרה.</p>
          <DialogFooter className="flex gap-2 justify-start">
            <Button variant="destructive" disabled={deleting} onClick={async () => {
              setDeleting(true);
              const { error } = await (supabase as any).from("businesses").delete().eq("id", businessId);
              setDeleting(false);
              if (error) { toast.error("שגיאה במחיקה: " + error.message); return; }
              toast.success("האתר נמחק");
              setDeleteDialogOpen(false);
              onBack();
            }}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
              מחק לצמיתות
            </Button>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>ביטול</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMerchantProfile;
