import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import SEOHead from "@/components/SEOHead";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Below-the-fold sections are lazy-loaded so the first paint (hero) ships with
// the smallest possible bundle - critical for cold visits from Google on mobile.
const TemplateShowcaseSection = lazy(() => import("@/components/TemplateShowcaseSection"));
const HowItWorksSection = lazy(() => import("@/components/HowItWorksSection"));
const WhoIsThisForSection = lazy(() => import("@/components/WhoIsThisForSection"));
const BenefitsSection = lazy(() => import("@/components/BenefitsSection"));
const Footer = lazy(() => import("@/components/Footer"));
const DomainSearch = lazy(() => import("@/components/domains/DomainSearch"));

// Repeated conversion CTA placed between sections.
const CtaBand = ({ title }: { title: string }) => (
  <section className="py-14 px-4 text-center bg-background">
    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-5">{title}</h2>
    <Link
      to="/register"
      className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-white font-bold text-lg hover:brightness-105 transition shadow-lg shadow-primary/30"
    >
      התחילו עכשיו
      <ArrowLeft className="w-5 h-5" />
    </Link>
    <p className="text-sm text-muted-foreground mt-3">5 דקות · ללא ידע טכני · ללא התחייבות</p>
  </section>
);

// True if a Supabase auth session is persisted in localStorage. Lets us decide
// synchronously (before auth finishes initializing) whether to show a loader
// instead of flashing the marketing page for a logged-in user about to be routed.
const hasStoredSession = () => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /^sb-.*-auth-token$/.test(k)) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
};

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  // Show a loader (not the marketing page) while we resolve where a logged-in
  // user should go. Starts true only when a session is already stored, so
  // anonymous visitors still get the marketing page instantly with no flash.
  const [resolving, setResolving] = useState(hasStoredSession);

  // Safety net: a logged-in user who hasn't finished onboarding (e.g. an OAuth
  // redirect that didn't reach /auth/callback, or an email-confirmation link
  // that landed on the root) is routed straight into onboarding.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      setResolving(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profile && !profile.onboarding_completed_at) {
        navigate("/onboarding", { replace: true });
      } else {
        setResolving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate]);

  if (resolving) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="theme-refined">
      <SEOHead />
      <Header />
      <main>
        {/* Above the fold - eager for instant paint */}
        <HeroSection />

        {/* Below the fold - lazy. A small placeholder keeps layout stable. */}
        <Suspense fallback={<div className="min-h-[40vh]" />}>
          <TemplateShowcaseSection />
          <HowItWorksSection />
          <CtaBand title="מוכנים? האתר שלכם באוויר תוך 5 דקות" />
          <WhoIsThisForSection />
          <BenefitsSection />
          <CtaBand title="כל מה שצריך כדי להתחיל למכור אונליין" />
          <Footer />
        </Suspense>
      </main>
    </div>
  );
};

export default Index;
