import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Users, Send, Crown } from "lucide-react";

const fmt = (n: number) => n.toLocaleString("he-IL");

/**
 * Super-admin WhatsApp view: adoption + usage across all merchants. Ties into the
 * usage-billing / partner-earnings story. Read-only (admin RLS). The feature is
 * build-only until Moti approves; this just monitors it.
 */
const val = (r: PromiseSettledResult<{ count?: number | null }>): number =>
  r.status === "fulfilled" ? (r.value.count || 0) : 0;

const AdminWhatsApp = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-whatsapp"],
    queryFn: async () => {
      const since = new Date(); since.setDate(since.getDate() - 30);
      const [acc, contacts, sent, subs] = await Promise.allSettled([
        (supabase as any).from("whatsapp_accounts").select("*", { count: "exact", head: true }).eq("status", "connected"),
        (supabase as any).from("whatsapp_contacts").select("*", { count: "exact", head: true }),
        (supabase as any).from("whatsapp_messages").select("*", { count: "exact", head: true }).eq("direction", "out").gte("created_at", since.toISOString()),
        (supabase as any).from("whatsapp_subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
      ]);
      return { connected: val(acc as any), contacts: val(contacts as any), sent30: val(sent as any), subs: val(subs as any) };
    },
  });

  const stats = [
    { label: "חנויות מחוברות", value: data?.connected, icon: MessageCircle },
    { label: "אנשי קשר (סה\"כ)", value: data?.contacts, icon: Users },
    { label: "הודעות יצאו (30 יום)", value: data?.sent30, icon: Send },
    { label: "מנויי וואטסאפ פעילים", value: data?.subs, icon: Crown },
  ];

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#25D366]/15 flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5 text-[#25D366]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">וואטסאפ - אימוץ ושימוש</h2>
          <p className="text-sm text-muted-foreground mt-0.5">כמה סוחרים חיברו וואטסאפ, גודל רשימות התפוצה, נפח הודעות ומנויים.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#25D366]/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-[#25D366]" />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold text-foreground">{isLoading || s.value === undefined ? "…" : fmt(s.value)}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        מקור ההכנסה: תוסף חודשי + מרווח על הודעות שיווק + מספר טלפון. מתחבר לרווחי שותפים / חיוב לפי שימוש.
      </p>
    </div>
  );
};

export default AdminWhatsApp;
