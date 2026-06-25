import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTenantSlug, isCustomDomainHost } from "@/lib/subdomain";

interface ResolvedTenant {
  /** The store slug to render, or null for the platform (apex). */
  tenantSlug: string | null;
  /** True while a custom domain is being resolved (show a loader, not the apex). */
  resolving: boolean;
}

/**
 * Resolves which store (if any) the current host should serve:
 *  - `*.siango.app` subdomain  -> slug from the host (synchronous, no loading).
 *  - the apex / platform host   -> null (render the platform).
 *  - a custom domain (the customer's own domain bought via Siango) -> look the
 *    host up via the get_store_slug_for_domain RPC and serve that store.
 *
 * Falling back to the platform on an unresolved custom host is intentional: a
 * domain that points at us but isn't mapped yet just shows the marketing site.
 */
export function useResolvedTenant(): ResolvedTenant {
  const subdomainSlug = getTenantSlug();
  const isCustom = !subdomainSlug && isCustomDomainHost();

  const [customSlug, setCustomSlug] = useState<string | null>(null);
  const [resolving, setResolving] = useState<boolean>(isCustom);

  useEffect(() => {
    if (!isCustom) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await (supabase as any).rpc("get_store_slug_for_domain", {
          p_host: window.location.hostname,
        });
        if (!cancelled) setCustomSlug(typeof data === "string" && data ? data : null);
      } catch {
        if (!cancelled) setCustomSlug(null);
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCustom]);

  if (subdomainSlug) return { tenantSlug: subdomainSlug, resolving: false };
  if (isCustom) return { tenantSlug: customSlug, resolving };
  return { tenantSlug: null, resolving: false };
}
