import SEOHead from "@/components/SEOHead";
import { useLocation } from "react-router-dom";
import OnboardingComplete from "@/components/onboarding/OnboardingComplete";
import type { OnboardingData } from "@/pages/Onboarding";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * /onboarding/complete - shown after any successful publish payment. location.state
 * carries the fresh onboarding payload when coming straight from the wizard; when
 * absent (e.g. renewing a lapsed subscription on an existing store), OnboardingComplete
 * fetches the business name/slug from the DB itself, so the celebration screen still
 * shows either way instead of skipping straight to the dashboard.
 */
const OnboardingCompleteGate = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const data = (location.state as { data?: OnboardingData } | null)?.data;

  return (
    <>
      <SEOHead title={t("oc.seo_title")} noindex={true} />
      <OnboardingComplete data={data} />
    </>
  );
};

export default OnboardingCompleteGate;
