import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, CheckCircle2, MailX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStorefront } from "@/hooks/useStorefront";

/**
 * Public unsubscribe page (Chok HaSpam — working one-click opt-out).
 * `?email=` in the link triggers an automatic unsubscribe on load; otherwise the
 * visitor can type their address. Honored immediately via the scoped RPC.
 */
const StoreUnsubscribe = ({ slugOverride }: { slugOverride?: string }) => {
  const params = useParams<{ slug: string }>();
  const slug = slugOverride ?? params.slug;
  const { business, isLoading } = useStorefront(slug);
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const unsubscribe = useCallback(
    async (target: string) => {
      if (!business?.id || !target.trim()) return;
      setStatus("loading");
      const { error } = await supabase.rpc("unsubscribe_email", {
        p_business_id: business.id,
        p_email: target.trim(),
      } as any);
      setStatus(error ? "error" : "done");
    },
    [business?.id],
  );

  // One-click: if the email is in the URL, unsubscribe automatically.
  useEffect(() => {
    const urlEmail = searchParams.get("email");
    if (urlEmail && business?.id && status === "idle") {
      unsubscribe(urlEmail);
    }
  }, [business?.id, searchParams, status, unsubscribe]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4" dir="rtl">
      <Helmet>
        <title>הסרה מרשימת תפוצה{business ? ` | ${business.name}` : ""}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-md w-full text-center">
        {status === "done" ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">הוסרת בהצלחה</h1>
            <p className="text-muted-foreground">
              לא תקבל יותר מיילים שיווקיים מ{business?.name || "העסק"}. נשמח לראותך שוב בעתיד.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-5">
              <MailX className="w-8 h-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">הסרה מרשימת התפוצה</h1>
            <p className="text-muted-foreground mb-6">
              להסרה מרשימת הדיוור של {business?.name || "העסק"}, הזן את כתובת המייל שלך.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); unsubscribe(email); }} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                dir="ltr"
                required
                className="w-full h-12 px-4 rounded-lg bg-card border border-border text-foreground focus:border-primary focus:outline-none"
              />
              {status === "error" && (
                <p className="text-sm text-destructive">אירעה שגיאה. נסה שוב מאוחר יותר.</p>
              )}
              <button
                type="submit"
                disabled={status === "loading" || !business?.id}
                className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {status === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
                הסר אותי מרשימת התפוצה
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default StoreUnsubscribe;
