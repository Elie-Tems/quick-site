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
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

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
        <WhoIsThisForSection />
        <BenefitsSection />
        {/* <PricingSection />
        <FinalCTASection /> */}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
