import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import UnsubscribeFlow from "@/components/unsubscribe/UnsubscribeFlow";

/**
 * Public unsubscribe page for SIANGO's own platform emails (welcome, lifecycle,
 * marketing). Reached from the footer link in every platform email. Works fully
 * logged-out - this replaces the old, broken link that pointed at the auth-gated
 * /dashboard and crashed for recipients (Chok HaSpam violation).
 */
const PlatformUnsubscribe = () => {
  const [searchParams] = useSearchParams();

  const onUnsubscribe = useCallback(async (target: string, reason?: string, detail?: string) => {
    const { error } = await supabase.rpc("platform_unsubscribe_email", {
      p_email: target,
      p_reason: reason ?? null,
      p_reason_detail: detail ?? null,
    } as any);
    return { error };
  }, []);

  return (
    <>
      <Helmet>
        <title>הסרה מרשימת תפוצה | Siango</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <UnsubscribeFlow
        senderName="Siango"
        initialEmail={searchParams.get("email") || ""}
        ready={true}
        onUnsubscribe={onUnsubscribe}
      />
    </>
  );
};

export default PlatformUnsubscribe;
