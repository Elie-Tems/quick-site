import { useEffect, useState } from "react";
import SEOHead from "@/components/SEOHead";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Shield, ShieldOff, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AdminDashboardContent from "@/components/admin/AdminDashboardContent";

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaVerified, setMfaVerified] = useState(false);
  const [mfaChecking, setMfaChecking] = useState(true);

  // Redirect if not authenticated
  // useEffect(() => {
  //   if (!authLoading && !user) {
  //     navigate('/login');
  //   }
  // }, [user, authLoading, navigate]);

  // Check if MFA is enrolled and whether current session already passed MFA
  useEffect(() => {
    if (!user) return;

    const checkMfa = async () => {
      setMfaChecking(true);
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error || !data) {
        setMfaChecking(false);
        return;
      }
      // currentLevel is 'aal1' (password only) or 'aal2' (MFA verified)
      // nextLevel is 'aal2' if MFA is enrolled
      if (data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
        setMfaRequired(true);
      } else {
        setMfaVerified(true);
      }
      setMfaChecking(false);
    };

    checkMfa();
  }, [user]);

  const handleMfaVerify = async () => {
    setMfaLoading(true);
    setMfaError("");

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactor = factors?.totp?.[0];

    if (!totpFactor) {
      setMfaError("לא נמצא אמצעי אימות. הגדר 2FA בהגדרות החשבון.");
      setMfaLoading(false);
      return;
    }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: totpFactor.id,
    });

    if (challengeError || !challenge) {
      setMfaError("שגיאה ביצירת challenge. נסה שוב.");
      setMfaLoading(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challenge.id,
      code: mfaCode,
    });

    if (verifyError) {
      setMfaError("קוד שגוי. נסה שוב.");
      setMfaLoading(false);
      return;
    }

    setMfaVerified(true);
    setMfaRequired(false);
    setMfaLoading(false);
  };

  const DEV_BYPASS = true; // TODO: remove before production

  if (!DEV_BYPASS && (authLoading || adminLoading || mfaChecking)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">מאמת הרשאות...</p>
        </div>
      </div>
    );
  }

  if (!DEV_BYPASS && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <ShieldOff className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">אין גישה</h1>
          <p className="text-muted-foreground mb-6">
            אין לך הרשאות לצפות בדף זה. רק מנהלי מערכת יכולים לגשת לאזור זה.
          </p>
        </div>
      </div>
    );
  }

  if (!DEV_BYPASS && mfaRequired && !mfaVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm px-4 w-full">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">אימות דו-שלבי</h1>
          <p className="text-muted-foreground mb-6">
            הכנס את קוד האימות מאפליקציית ה-Authenticator שלך
          </p>
          <div className="space-y-3">
            <Input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="text-center text-xl tracking-widest"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleMfaVerify()}
              dir="ltr"
            />
            {mfaError && (
              <p className="text-sm text-destructive">{mfaError}</p>
            )}
            <Button
              className="w-full"
              onClick={handleMfaVerify}
              disabled={mfaLoading || mfaCode.length !== 6}
            >
              {mfaLoading ? (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              ) : null}
              אמת
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">ניהול מערכת</h1>
              <p className="text-xs text-muted-foreground">אדמין על</p>
            </div>
          </div>
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            חזרה לאתר
          </a>
        </div>
      </header>

      <AdminDashboardContent />
    </div>
  );
};

export default AdminDashboard;
