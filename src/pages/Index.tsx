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

const Index = () => {
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
