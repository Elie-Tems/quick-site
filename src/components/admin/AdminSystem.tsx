import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Users, Server, Lock, Loader2 } from "lucide-react";

/**
 * The "מערכת" area - replaces the old empty settings placeholder with real,
 * read-only system info. Admin management stays read-only on purpose: adding or
 * removing an admin is an access-control change, done manually for security.
 */

// Configured platform admins (source of truth: CLAUDE.md). Used as a safe fallback
// if the user_roles table can't be read from the client.
const KNOWN_ADMINS = ["moti4384@gmail.com", "furmand713@gmail.com"];

const AdminSystem = () => {
  const [admins, setAdmins] = useState<string[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("user_roles").select("user_id").eq("role", "admin");
        if (error || !data?.length) { setAdmins(KNOWN_ADMINS); return; }
        const ids = data.map((r: any) => r.user_id);
        const { data: profs } = await (supabase as any)
          .from("profiles").select("email").in("user_id", ids);
        const emails = (profs || []).map((p: any) => p.email).filter(Boolean);
        setAdmins(emails.length ? Array.from(new Set(emails)) : KNOWN_ADMINS);
      } catch {
        setAdmins(KNOWN_ADMINS);
      }
    })();
  }, []);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Admins */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> מנהלי המערכת</h2>
        <p className="text-sm text-muted-foreground mb-4">מי שיש לו גישת אדמין לפאנל הזה. הוספה או הסרה נעשית ידנית מטעמי אבטחה.</p>
        {admins === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> טוען...</div>
        ) : (
          <ul className="space-y-2">
            {admins.map((email) => (
              <li key={email} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                  {email[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-medium">{email}</span>
                <span className="mr-auto inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="h-3 w-3" /> אדמין
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Security */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> אבטחה</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-green-600 mt-0.5 shrink-0" /> הגישה לפאנל מוגנת בהרשאת תפקיד (role=admin) - משתמש רגיל לא יכול להיכנס.</li>
          <li className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-green-600 mt-0.5 shrink-0" /> כל הפעולות הרגישות עוברות דרך פונקציות שרת עם בדיקת בעלות, לא כתיבה ישירה מהדפדפן.</li>
          <li className="flex items-start gap-2"><Lock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" /> מומלץ להפעיל אימות דו-שלבי לכל חשבון אדמין.</li>
        </ul>
      </div>

      {/* System info */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2"><Server className="h-5 w-5 text-primary" /> מידע מערכת</h2>
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-border bg-background px-3 py-2"><dt className="text-xs text-muted-foreground">פלטפורמה</dt><dd className="font-medium">סיאנגו · siango.app</dd></div>
          <div className="rounded-lg border border-border bg-background px-3 py-2"><dt className="text-xs text-muted-foreground">בק-אנד</dt><dd className="font-medium">Supabase · ytqgeoviokgxxwalieev</dd></div>
          <div className="rounded-lg border border-border bg-background px-3 py-2"><dt className="text-xs text-muted-foreground">אחסון</dt><dd className="font-medium">Cloudflare Pages</dd></div>
          <div className="rounded-lg border border-border bg-background px-3 py-2"><dt className="text-xs text-muted-foreground">דיוור</dt><dd className="font-medium">Resend · send.siango.app</dd></div>
        </dl>
      </div>
    </div>
  );
};

export default AdminSystem;
