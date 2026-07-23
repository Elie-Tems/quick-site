import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Globe, Search, Link2, Loader2, Plug, Copy, Check, ChevronDown, ChevronUp, Settings } from "lucide-react";
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
  const [provisioning, setProvisioning] = useState<string | null>(null);
  // Expanded byod domain showing DNS instructions
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  // CNAME target per domain, fetched lazily on expand
  const [cnameTargets, setCnameTargets] = useState<Record<string, string>>({});
  const [fetchingCname, setFetchingCname] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState<string | null>(null);

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

  const onProvision = async (domain: string) => {
    setProvisioning(domain);
    try {
      const { data, error } = await supabase.functions.invoke("provision-custom-domain", {
        body: { domain, action: "provision" },
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data?.error || "provision failed");
      // Cache the CNAME target if returned
      if (data?.cnameTarget) {
        setCnameTargets((prev) => ({ ...prev, [domain]: data.cnameTarget }));
      }
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

  // Expand a byod domain row and fetch its CNAME target if not yet cached
  const toggleByodExpand = async (domain: string) => {
    if (expandedDomain === domain) {
      setExpandedDomain(null);
      return;
    }
    setExpandedDomain(domain);
    if (cnameTargets[domain]) return;

    setFetchingCname(domain);
    try {
      const { data, error } = await supabase.functions.invoke("provision-custom-domain", {
        body: { domain, action: "provision" },
      });
      if (!error && data?.cnameTarget) {
        setCnameTargets((prev) => ({ ...prev, [domain]: data.cnameTarget }));
      }
      queryClient.invalidateQueries({ queryKey: ["my-domains", businessId] });
    } catch {
      // CNAME target unavailable; user can still see the instructions panel
    } finally {
      setFetchingCname(null);
    }
  };

  const copyCname = async (domain: string) => {
    const target = cnameTargets[domain];
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target);
      setCopiedDomain(domain);
      setTimeout(() => setCopiedDomain(null), 2000);
    } catch { /* clipboard unavailable */ }
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
              <div key={d.id} className="rounded-lg border border-border text-sm overflow-hidden">
                {/* Main row */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    <span dir="ltr" className="font-medium text-foreground">{d.domain}</span>
                    {d.source === "byod" && (
                      <span className="text-[11px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{t("dash.domains.personal_domain_badge")}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {connectionLabel(d)}
                      {d.expires_at ? ` · ${new Date(d.expires_at).toLocaleDateString("he-IL")}` : ""}
                    </span>
                    {d.source === "byod" ? (
                      // BYOD: gear icon that expands DNS instructions + re-provision
                      <button
                        onClick={() => toggleByodExpand(d.domain)}
                        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        {fetchingCname === d.domain ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Settings className="h-3 w-3" />
                        )}
                        {expandedDomain === d.domain ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    ) : (
                      // Purchased domain: direct provision button
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

                {/* Expanded panel for byod domains */}
                {d.source === "byod" && expandedDomain === d.domain && (
                  <div className="border-t border-border bg-muted/30 p-4 space-y-3">
                    <p className="text-xs font-medium text-foreground">הגדרות DNS</p>
                    <p className="text-xs text-muted-foreground">
                      כדי שהדומיין יצביע לאתר שלך, ודאו שרשומת ה-CNAME הבאה קיימת אצל ספק הדומיין שלכם:
                    </p>
                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs rounded-lg bg-background border border-border p-3">
                      <span className="text-muted-foreground">שם (Name):</span>
                      <span dir="ltr" className="font-mono">www</span>
                      <span className="text-muted-foreground">ערך (Value):</span>
                      <div className="flex items-center gap-2">
                        {cnameTargets[d.domain] ? (
                          <>
                            <span dir="ltr" className="font-mono break-all">{cnameTargets[d.domain]}</span>
                            <button
                              onClick={() => copyCname(d.domain)}
                              className="text-primary hover:opacity-70 shrink-0"
                              title="העתק"
                            >
                              {copiedDomain === d.domain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        ) : (
                          <span className="text-muted-foreground italic">טוען...</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onProvision(d.domain)}
                      disabled={provisioning === d.domain}
                      className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      {provisioning === d.domain ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Plug className="h-3 w-3" />
                      )}
                      {d.cf_ssl_status === "active" ? "חבר מחדש ל-Cloudflare" : "הפעל חיבור SSL"}
                    </button>
                  </div>
                )}
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
