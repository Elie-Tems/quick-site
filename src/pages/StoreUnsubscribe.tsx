import { useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStorefront } from "@/hooks/useStorefront";
import UnsubscribeFlow from "@/components/unsubscribe/UnsubscribeFlow";

/**
 * Public per-store unsubscribe page (Chok HaSpam - one-click opt-out).
 * `?email=` triggers an automatic unsubscribe on load; otherwise the visitor can
 * type their address. Honored immediately via the scoped, anon-callable RPC.
 */
const StoreUnsubscribe = ({ slugOverride }: { slugOverride?: string }) => {
  const params = useParams<{ slug: string }>();
  const slug = slugOverride ?? params.slug;
  const { business, isLoading } = useStorefront(slug);
  const [searchParams] = useSearchParams();

  const onUnsubscribe = useCallback(
    async (target: string, reason?: string, detail?: string) => {
      if (!business?.id) return { error: new Error("store not loaded") };
      const { error } = await supabase.rpc("unsubscribe_email", {
        p_business_id: business.id,
        p_email: target,
        p_reason: reason ?? null,
        p_reason_detail: detail ?? null,
      } as any);
      return { error };
    },
    [business?.id],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>הסרה מרשימת תפוצה{business ? ` | ${business.name}` : ""}</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <UnsubscribeFlow
        senderName={business?.name || "העסק"}
        initialEmail={searchParams.get("email") || ""}
        ready={!!business?.id}
        onUnsubscribe={onUnsubscribe}
      />
    </>
  );
};

export default StoreUnsubscribe;
