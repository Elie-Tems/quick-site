import { useEffect, useState } from "react";
import SEOHead from "@/components/SEOHead";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { gtm } from "@/lib/gtm";
import { Loader2 } from "lucide-react";

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [checkDone, setCheckDone] = useState(false);

  useEffect(() => {
    if (authLoading || !user) {
      return;
    }

    let cancelled = false;

    const decideRedirect = async () => {
      try {
        console.log('🔍 AuthCallback: Starting profile check for user:', user.id);
        
        // Check session validity
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        console.log('🔐 Current session:', { 
          hasSession: !!currentSession, 
          userId: currentSession?.user?.id,
          expiresAt: currentSession?.expires_at,
          error: sessionError 
        });
        
        // Step 1: Get profile (trigger should have created it)
        const profileQuery = supabase
          .from("profiles")
          .select("id, onboarding_completed_at, welcome_sent")
          .eq("user_id", user.id);
        
        console.log('📝 Profile query:', { userId: user.id });
        
        let { data: profile, error: profileError } = await profileQuery.maybeSingle();

        console.log('📊 Initial profile check:', { 
          found: !!profile, 
          error: profileError,
          errorCode: profileError?.code,
          errorMessage: profileError?.message,
          errorDetails: profileError?.details
        });

        if (cancelled) return;

        // If profile doesn't exist yet, retry with longer delays (trigger is working but slow)
        if (!profile && !profileError) {
          console.log("⏳ Profile not found, waiting for trigger...");
          console.log('👤 User metadata:', user.user_metadata);
          console.log('🔐 User app metadata:', user.app_metadata);
          
          // Try 5 times with longer delays (1s, 1.5s, 2s, 2.5s, 3s)
          for (let i = 0; i < 5 && !profile; i++) {
            const delay = 1000 + (i * 500);
            console.log(`⏱️ Retry ${i + 1}/5 - waiting ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            const { data: retryProfile, error: retryError } = await supabase
              .from("profiles")
              .select("id, onboarding_completed_at, welcome_sent")
              .eq("user_id", user.id)
              .maybeSingle();
            
            console.log(`🔄 Retry ${i + 1} result:`, { found: !!retryProfile, error: retryError });
            
            profile = retryProfile;
            if (profile) {
              console.log(`✅ Profile found on retry ${i + 1}`);
              break;
            }
          }
        }

        if (cancelled) return;

        // If still no profile, send to onboarding (it will be created there)
        if (!profile) {
          console.warn("⚠️ AuthCallback: Profile not found after retries, sending to onboarding");
          console.log('ℹ️ Profile will be created during onboarding process');
          navigate("/onboarding", { replace: true });
          setCheckDone(true);
          return;
        }
        
        console.log('✅ Profile found:', profile.id);

        // One-time welcome email on first landing after sign-up. Fire-and-forget
        // (never delays the redirect); guarded by welcome_sent so it goes out
        // exactly once. Gated to genuinely-new accounts (< 24h old) so we never
        // blast a "you just signed up" note at long-standing users.
        if (!profile.welcome_sent && user.email) {
          const acctAgeMs = user.created_at ? Date.now() - new Date(user.created_at).getTime() : 0;
          const isNewAccount = acctAgeMs > 0 && acctAgeMs < 24 * 60 * 60 * 1000;
          if (isNewAccount) {
            const lang = (user.user_metadata?.preferred_language as string) || undefined;
            supabase.functions
              .invoke("send-platform-email", {
                body: {
                  type: "accountWelcome",
                  to: user.email,
                  ctx: { lang, dashboardUrl: `${window.location.origin}/dashboard` },
                },
              })
              .then(({ data, error }) => {
                // Mark sent only on a real send/skip so a transient failure retries next login.
                if (!error && (data?.ok || data?.skipped)) {
                  supabase.from("profiles").update({ welcome_sent: true }).eq("user_id", user.id);
                }
              })
              .catch((e) => console.warn("welcome email failed (non-fatal):", e));
          }
        }

        // Step 2: Update auth_provider if it's a Google login
        if (user.app_metadata?.provider === "google") {
          await supabase
            .from("profiles")
            .update({ auth_provider: "google" })
            .eq("user_id", user.id);
          // Fire sign_up for new Google users (account created in the last 2 minutes)
          const isNewUser = user.created_at && (Date.now() - new Date(user.created_at).getTime()) < 120_000;
          if (isNewUser) gtm.signUp("google");
        }

        if (cancelled) return;

        // Step 3: Check if onboarding is completed
        if (!profile.onboarding_completed_at) {
          navigate("/onboarding", { replace: true });
          setCheckDone(true);
          return;
        }

        // Step 4: Check if business exists
        const { data: business, error: businessError } = await supabase
          .from("businesses")
          .select("id")
          .eq("owner_id", profile.id)
          .maybeSingle();

        if (cancelled) return;

        if (businessError) {
          console.error("AuthCallback business check error:", businessError);
          navigate("/onboarding", { replace: true });
        } else if (!business) {
          // No business exists → send to onboarding to create one
          navigate("/onboarding", { replace: true });
        } else {
          // All good → go to dashboard
          navigate("/dashboard", { replace: true });
        }
        
        setCheckDone(true);
      } catch (err) {
        console.error("AuthCallback unexpected error:", err);
        if (!cancelled) {
          navigate("/onboarding", { replace: true });
          setCheckDone(true);
        }
      }
    };

    decideRedirect();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  // If no user after auth loaded, might be direct visit without session → send to login
  useEffect(() => {
    if (!authLoading && !user && !checkDone) {
      navigate("/login", { replace: true });
      setCheckDone(true);
    }
  }, [authLoading, user, checkDone, navigate]);

  return (
    <>
      <SEOHead title="AuthCallback | סיאנגו" noindex={true} />
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">מפנה אותך...</p>
        </div>
      </div>
    </>
  );
};

export default AuthCallback;
