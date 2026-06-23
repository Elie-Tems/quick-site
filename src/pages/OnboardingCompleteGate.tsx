import { useEffect } from "react";
import SEOHead from "@/components/SEOHead";
import { useNavigate, useLocation } from "react-router-dom";
import OnboardingComplete from "@/components/onboarding/OnboardingComplete";
import type { OnboardingData } from "@/pages/Onboarding";

/**
 * /onboarding/complete — requires onboarding payload in location.state (from publish flow).
 */
const OnboardingCompleteGate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const data = (location.state as { data?: OnboardingData } | null)?.data;

  useEffect(() => {
    if (!data) {
      navigate("/dashboard?from_payment=true", { replace: true });
    }
  }, [data, navigate]);

  if (!data) {
    return null;
  }

  return (
    <>
      <SEOHead title="הגדרת האתר הושלמה | סיאנגו" noindex={true} />
      <OnboardingComplete data={data} />
    </>
  );
};

export default OnboardingCompleteGate;
