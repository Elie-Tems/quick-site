import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Globe } from "lucide-react";
import DomainSearch from "@/components/domains/DomainSearch";
import DomainPurchaseDialog from "@/components/domains/DomainPurchaseDialog";

interface Props {
  businessId?: string;
}

/**
 * Merchant Domains screen: search + buy a domain (payment-first via iCount; the
 * domain is registered on the customer's name after payment), and see the
 * domains already registered for this store.
 */
const DashboardDomains = ({ businessId }: Props) => {
  const [buying, setBuying] = useState<{ domain: string; price: number | null } | null>(null);

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
        .select("id, domain, status, expires_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      return (data || []) as Array<{ id: string; domain: string; status: string; expires_at: string | null }>;
    },
  });

  const onBuy = (domain: string, priceIls: number | null) => {
    setBuying({ domain, price: priceIls });
  };

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Globe className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">דומיין משלך</h1>
          <p className="text-sm text-muted-foreground">כתובת אמיתית ומקצועית לאתר - חפשו ורכשו בקליק, נחבר אוטומטית.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold text-foreground mb-3">חיפוש דומיין</h3>
        <DomainSearch onBuy={onBuy} />
      </div>

      {owned && owned.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-3">הדומיינים שלי</h3>
          <div className="space-y-2">
            {owned.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                <span dir="ltr" className="font-medium text-foreground">{d.domain}</span>
                <span className="text-muted-foreground">
                  {d.status === "active" ? "פעיל" : d.status}
                  {d.expires_at ? ` · עד ${new Date(d.expires_at).toLocaleDateString("he-IL")}` : ""}
                </span>
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
