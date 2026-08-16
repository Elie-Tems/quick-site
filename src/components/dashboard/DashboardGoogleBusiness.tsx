import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Loader2, CheckCircle2, Globe, Clock, Unlink, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

interface Props { businessId: string; }

interface GBPStatus {
  connected: boolean;
  locationId: string | null;
  locationName: string | null;
  websitePushed: boolean;
  hours: object | null;
  lastSync: string | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function callFn(name: string, body: object, token: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

const DashboardGoogleBusiness = ({ businessId }: Props) => {
  const [status, setStatus] = useState<GBPStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [pushingWebsite, setPushingWebsite] = useState(false);
  const [pullingHours, setPullingHours] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? "";
  };

  const loadStatus = async () => {
    try {
      const token = await getToken();
      const data = await callFn("gbp-sync", { action: "status", businessId }, token);
      setStatus(data);
    } catch {
      setStatus({ connected: false, locationId: null, locationName: null, websitePushed: false, hours: null, lastSync: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // Handle return from OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get("gbp") === "connected") {
      toast.success("גוגל ביזנס חובר בהצלחה!");
      window.history.replaceState({}, "", window.location.pathname);
      loadStatus();
    } else if (params.get("gbp") === "denied") {
      toast.error("החיבור בוטל");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("gbp") === "error" || params.get("gbp") === "expired") {
      toast.error("שגיאה בחיבור — נסה שוב");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [businessId]);

  const connect = async () => {
    setConnecting(true);
    try {
      const token = await getToken();
      const data = await callFn("gbp-oauth-start", { businessId }, token);
      window.location.href = data.url;
    } catch (e: any) {
      const msg = e.message === "google_not_configured"
        ? "גוגל לא מוגדר — בדוק סודות ב-Supabase (GOOGLE_CLIENT_ID, GBP_REDIRECT_URI)"
        : "שגיאה בהתחלת החיבור";
      toast.error(msg);
      setConnecting(false);
    }
  };

  const pushWebsite = async () => {
    setPushingWebsite(true);
    try {
      const token = await getToken();
      const data = await callFn("gbp-sync", { action: "push_website", businessId }, token);
      toast.success(`כתובת האתר עודכנה בגוגל: ${data.storeUrl}`);
      await loadStatus();
    } catch (e: any) {
      toast.error("שגיאה בעדכון האתר בגוגל");
    } finally {
      setPushingWebsite(false);
    }
  };

  const pullHours = async () => {
    setPullingHours(true);
    try {
      const token = await getToken();
      await callFn("gbp-sync", { action: "pull_hours", businessId }, token);
      toast.success("שעות פתיחה יובאו מגוגל");
      await loadStatus();
    } catch {
      toast.error("שגיאה בייבוא שעות הפתיחה");
    } finally {
      setPullingHours(false);
    }
  };

  const disconnect = async () => {
    if (!confirm("לנתק את גוגל ביזנס?")) return;
    setDisconnecting(true);
    try {
      const token = await getToken();
      await callFn("gbp-sync", { action: "disconnect", businessId }, token);
      toast.success("גוגל ביזנס נותק");
      await loadStatus();
    } catch {
      toast.error("שגיאה בניתוק");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg">
      {/* Header */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-[#4285F4]/10 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold">Google Business Profile</h2>
            <p className="text-xs text-muted-foreground">
              {status?.connected
                ? `מחובר: ${status.locationName ?? "עסק ללא שם"}`
                : "לא מחובר"}
            </p>
          </div>
          {status?.connected && (
            <span className="mr-auto text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full font-medium">
              מחובר
            </span>
          )}
        </div>

        {!status?.connected ? (
          <>
            <p className="text-sm text-muted-foreground mt-3 mb-4 leading-relaxed">
              חבר את העסק שלך לגוגל ביזנס — נעדכן אוטומטית את כתובת האתר שלך בגוגל כדי שלקוחות ימצאו אותך, ונייבא את שעות הפתיחה.
            </p>
            <Button onClick={connect} disabled={connecting} className="w-full gap-2">
              {connecting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> מחבר...</>
                : <>
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    התחבר עם Google
                  </>}
            </Button>
          </>
        ) : (
          <div className="mt-4 space-y-3">
            {/* Push website */}
            <div className={`rounded-xl border p-4 ${status.websitePushed ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20" : "border-border bg-muted/20"}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-lg p-1.5 ${status.websitePushed ? "bg-green-100 dark:bg-green-800/50" : "bg-muted"}`}>
                  {status.websitePushed
                    ? <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    : <Globe className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    {status.websitePushed ? "כתובת האתר עודכנה בגוגל ✓" : "עדכן כתובת אתר בגוגל"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {status.websitePushed
                      ? "לקוחות שמחפשים אותך בגוגל יגיעו ישירות לאתר שלך."
                      : "לקוחות שיחפשו אותך בגוגל יראו את הקישור לאתר שלך. זה הדבר הכי חשוב לחשיפה."}
                  </p>
                  {!status.websitePushed && (
                    <Button
                      size="sm"
                      onClick={pushWebsite}
                      disabled={pushingWebsite}
                      className="mt-2 gap-1.5"
                    >
                      {pushingWebsite
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> מעדכן...</>
                        : <><Globe className="h-3.5 w-3.5" /> עדכן עכשיו</>}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Pull hours */}
            <div className={`rounded-xl border p-4 ${status.hours ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20" : "border-border bg-muted/20"}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-lg p-1.5 ${status.hours ? "bg-blue-100 dark:bg-blue-800/50" : "bg-muted"}`}>
                  {status.hours
                    ? <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    : <Clock className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">
                    {status.hours ? "שעות פתיחה יובאו ✓" : "יבא שעות פתיחה מגוגל"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {status.hours
                      ? "שעות הפתיחה שלך מגוגל נשמרו."
                      : "שעות הפתיחה שמוגדרות בגוגל יישמרו כאן — לא צריך להזין פעמיים."}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={pullHours}
                    disabled={pullingHours}
                    className="mt-2 gap-1.5"
                  >
                    {pullingHours
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> מייבא...</>
                      : <><Clock className="h-3.5 w-3.5" /> {status.hours ? "רענן שעות" : "יבא שעות"}</>}
                  </Button>
                </div>
              </div>
            </div>

            {/* Last sync + disconnect */}
            <div className="flex items-center justify-between pt-1">
              {status.lastSync && (
                <p className="text-xs text-muted-foreground">
                  סונכרן לאחרונה: {new Date(status.lastSync).toLocaleDateString("he-IL")}
                </p>
              )}
              <button
                type="button"
                onClick={disconnect}
                disabled={disconnecting}
                className="mr-auto text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
              >
                {disconnecting
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Unlink className="h-3 w-3" />}
                נתק
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Setup instructions (when not connected) */}
      {!status?.connected && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1 leading-relaxed">
              <p className="font-semibold">דרישות לחיבור ראשוני:</p>
              <ul className="space-y-0.5 list-disc list-inside text-amber-700 dark:text-amber-400">
                <li>סודות Supabase: <code className="bg-amber-100 dark:bg-amber-800/50 px-1 rounded">GOOGLE_CLIENT_ID</code>, <code className="bg-amber-100 dark:bg-amber-800/50 px-1 rounded">GOOGLE_CLIENT_SECRET</code>, <code className="bg-amber-100 dark:bg-amber-800/50 px-1 rounded">GBP_REDIRECT_URI</code></li>
                <li>ב-Google Cloud: Enable "Business Profile APIs" + הוספת Redirect URI</li>
                <li>ב-OAuth Consent Screen: הוספת scope <code className="bg-amber-100 dark:bg-amber-800/50 px-1 rounded">business.manage</code></li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardGoogleBusiness;
