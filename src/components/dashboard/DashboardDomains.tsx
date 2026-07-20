import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Globe, Search, Link2, Loader2, Plug } from "lucide-react";
import DomainSearch from "@/components/domains/DomainSearch";
import DomainPurchaseDialog from "@/components/domains/DomainPurchaseDialog";
import ConnectOwnDomain from "@/components/domains/ConnectOwnDomain";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  businessId?: string;
}

/**
 * Merchant Domains screen: search + buy a domain (payment-first via a synchronous
 * Cardcom-token charge - domain-purchase charges the saved card and registers the
 * domain server-side in one call, no redirect/webhook; the domain is registered on
 * the customer's name only after the charge is confirmed), and see the domains
 * already registered for this store.
 */
const DashboardDomains = ({ businessId }: Props) => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [buying, setBuying] = useState<{ domain: string; price: number | null } | null>(null);
  const [mode, setMode] = useState<"buy" | "own">("buy");
  // Which domain is currently being (re-)provisioned - manual re-trigger of the
  // Cloudflare custom-hostname setup (provision-custom-domain), e.g. if the
  // post-purchase auto-provision hadn't run or the connection got stuck.
  const [provisioning, setProvisioning] = useState<string | null>(null);

  const { data: biz } = useQuery({
    queryKey: ["domain-biz-prefill", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("businesses")
        .select("name, email, phone")
        .eq("id", businessId)
        .maybeSingle();
      return data as { name?: string; email?: string; phone?: string } | null;
    },
  });

  const { data: owned } = useQuery({
    queryKey: ["my-domains", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("domains")
        .select("id, domain, status, expires_at, cf_ssl_status, source")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      return (data || []) as Array<{ id: string; domain: string; status: string; expires_at: string | null; cf_ssl_status: string | null; source: string | null }>;
    },
  });

  // Connection status shown to the merchant: the domain itself (status) vs. whether
  // it's actually serving securely yet (cf_ssl_status, filled in async by
  // domain-cf-sync). cf_ssl_status is null while Cloudflare isn't configured yet,
  // or briefly right after purchase before the first sync/register attempt.
  const connectionLabel = (d: { status: string; cf_ssl_status: string | null }) => {
    if (d.status !== "active") return d.status;
    if (d.cf_ssl_status === "active") return t("dash.domains.status_connected_ssl");
    if (d.cf_ssl_status === "pending_validation") return t("dash.domains.status_connecting_ssl");
    if (d.cf_ssl_status === "error" || d.cf_ssl_status === "pending_deployment") return t("dash.domains.status_connecting_delay");
    return t("dash.domains.status_active");
  };

  const onBuy = (domain: string, priceIls: number | null) => {
    setBuying({ domain, price: priceIls });
  };

  // Manually (re-)connect a purchased domain to Cloudflare. Normally this runs
  // automatically after purchase; this button is the recovery path if it didn't.
  const onProvision = async (domain: string) => {
    setProvisioning(domain);
    try {
      const { data, error } = await supabase.functions.invoke("provision-custom-domain", {
        body: { domain, action: "provision" },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data?.error || "provision failed");
      if (data?.configured === false) {
        toast.info(data.message || t("dash.domains.provisioning_soon"));
      } else {
        toast.success(`${t("dash.domains.connect_request_prefix")}${domain}${t("dash.domains.connect_request_suffix")}`);
      }
      queryClient.invalidateQueries({ queryKey: ["my-domains", businessId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("dash.domains.connect_error"));
    } finally {
      setProvisioning(null);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Globe className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("dash.domains.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("dash.domains.subtitle")}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4 rounded-lg bg-muted/50 p-1 w-fit">
          <button
            onClick={() => setMode("buy")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "buy" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Search className="w-3.5 h-3.5" /> {t("dash.domains.tab_search")}
          </button>
          <button
            onClick={() => setMode("own")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "own" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <Link2 className="w-3.5 h-3.5" /> {t("dash.domains.tab_own")}
          </button>
        </div>

        {mode === "buy" ? (
          <DomainSearch onBuy={onBuy} />
        ) : (
          <ConnectOwnDomain
            businessId={businessId}
            onConnected={() => queryClient.invalidateQueries({ queryKey: ["my-domains", businessId] })}
          />
        )}
      </div>

      {owned && owned.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-3">{t("dash.domains.my_domains")}</h3>
          <div className="space-y-2">
            {owned.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <span dir="ltr" className="font-medium text-foreground">{d.domain}</span>
                  {d.source === "byod" && (
                    <span className="text-[11px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{t("dash.domains.personal_domain_badge")}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    {connectionLabel(d)}
                    {d.expires_at ? ` ${t("dash.domains.expires_until")} ${new Date(d.expires_at).toLocaleDateString("he-IL")}` : ""}
                  </span>
                  {/* Purchased domains only: byod domains are connected via the
                      add-on flow and have no completed domain_order to re-provision. */}
                  {d.source !== "byod" && (
                    <button
                      onClick={() => onProvision(d.domain)}
                      disabled={provisioning === d.domain}
                      className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      {provisioning === d.domain ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plug className="h-3 w-3" />
                      )}
                      {d.cf_ssl_status === "active" ? t("dash.domains.reconnect") : t("dash.domains.connect_domain")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {buying && (
        <DomainPurchaseDialog
          open={!!buying}
          onOpenChange={(o) => !o && setBuying(null)}
          domain={buying.domain}
          priceIls={buying.price}
          businessId={businessId}
          prefill={{ name: biz?.name, email: biz?.email, phone: biz?.phone }}
        />
      )}
    </div>
  );
};

export default DashboardDomains;
