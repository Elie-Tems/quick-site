import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import TemplateShowcaseSection from "@/components/TemplateShowcaseSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import WhoIsThisForSection from "@/components/WhoIsThisForSection";
import BenefitsSection from "@/components/BenefitsSection";
import PricingSection from "@/components/PricingSection";
import FinalCTASection from "@/components/FinalCTASection";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Safety net: if a logged-in user who hasn't finished onboarding lands on the
  // home page (e.g. an OAuth redirect that didn't reach /auth/callback), route
  // them into onboarding instead of leaving them stuck on the marketing page.
  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled && profile && !profile.onboarding_completed_at) {
        navigate("/onboarding", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, navigate]);

  return (
    <div className="theme-refined">
      <SEOHead />
      <Header />
      <main>
        <HeroSection />
        <TemplateShowcaseSection />
        <HowItWorksSection />
        <CtaBand title="מוכנים? האתר שלכם באוויר תוך 5 דקות" />
        <WhoIsThisForSection />
        <BenefitsSection />
        <CtaBand title="כל מה שצריך כדי להתחיל למכור אונליין" />
        {/* <PricingSection />
        <FinalCTASection /> */}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
