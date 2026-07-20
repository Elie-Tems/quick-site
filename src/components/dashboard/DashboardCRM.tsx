import { useMemo, useState } from "react";
import { Users, Truck, TrendingUp, Lock, Kanban } from "lucide-react";
import DashboardCustomers from "./DashboardCustomers";
import DashboardSuppliers from "./DashboardSuppliers";
import DashboardProfitability from "./DashboardProfitability";
import DashboardAnalytics from "./DashboardAnalytics";
import DashboardLeadsPipeline from "./DashboardLeadsPipeline";
import type { Order } from "./DashboardOrders";
import type { BusinessType } from "@/lib/businessModules";
import { useContacts } from "@/hooks/useCrm";
import { useLanguage } from "@/contexts/LanguageContext";

type CrmTab = "customers" | "pipeline" | "suppliers" | "profitability";

interface DashboardCRMProps {
  orders: Order[];
  businessId?: string;
  demoMode?: boolean;
  initialTab?: CrmTab;
  hasCrmAddon?: boolean;
  businessType?: BusinessType;
}

const fmtPrice = (n: number) =>
  new Intl.NumberFormat("he-IL", { style: "currency", currency: "ILS", minimumFractionDigits: 0 }).format(n);

// Verticals whose "customers" are leads/donors living in the `contacts` table
// rather than in `orders`. For these, the CRM customer list must be sourced from
// contacts - otherwise it always reads empty ("עדיין אין לקוחות") even with
// captured leads/donations.
const CONTACTS_VERTICALS: BusinessType[] = ["realestate", "nonprofit", "synagogue"];
const isContactsVertical = (t?: BusinessType): boolean => !!t && CONTACTS_VERTICALS.includes(t);

// Free tier: customer name + what they bought + total. All segments/analytics are CRM+.
function FreeCustomerView({ orders }: { orders: Order[] }) {
  const { t } = useLanguage();
  const customers = useMemo(() => {
    const map = new Map<string, { name: string; total: number; items: string[] }>();
    for (const o of orders) {
      const key = (o.customerEmail || o.customerPhone || o.customerName || "").trim().toLowerCase();
      if (!key) continue;
      const ex = map.get(key);
      const itemNames = (o.items || []).map((it: any) => it.name || it.productName).filter(Boolean);
      if (ex) {
        ex.total += o.total || 0;
        itemNames.forEach((n: string) => { if (!ex.items.includes(n)) ex.items.push(n); });
      } else {
        map.set(key, { name: o.customerName || t("dash.crm.default_customer_name"), total: o.total || 0, items: itemNames });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [orders, t]);

  return (
    <div className="space-y-5">
      {customers.length === 0 ? (
        <div className="text-center py-14 rounded-2xl border border-dashed border-border">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">{t("dash.crm.no_customers")}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
          {customers.map((c, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 bg-card hover:bg-muted/20 transition-colors">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                {c.items.length > 0 && (
                  <p className="text-xs text-muted-foreground truncate">{c.items.slice(0, 2).join(", ")}{c.items.length > 2 ? ` +${c.items.length - 2}` : ""}</p>
                )}
              </div>
              {c.total > 0 && (
                <span className="text-sm font-semibold tabular-nums text-foreground shrink-0">
                  {fmtPrice(c.total)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Blurred CRM+ preview with lock overlay */}
      <div className="relative rounded-2xl border border-border overflow-hidden">
        <div className="blur-sm pointer-events-none select-none p-4 space-y-3" aria-hidden="true">
          <div className="grid grid-cols-2 gap-2">
            {[["67%", t("dash.crm.repeat_customers")], ["₪1,245", t("dash.crm.avg_ltv")]].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-muted/50 p-3">
                <div className="text-2xl font-bold">{v}</div>
                <div className="text-xs text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[`${t("dash.crm.segment_vip")} (1)`, `${t("dash.crm.segment_at_risk")} (2)`, `${t("dash.crm.segment_dormant")} (3)`].map((s) => (
              <span key={s} className="text-xs px-3 py-1 rounded-full bg-primary/10 border border-primary/20">{s}</span>
            ))}
          </div>
          <div className="space-y-2 pt-1">
            {[t("dash.crm.demo_name_1"), t("dash.crm.demo_name_2")].map((n) => (
              <div key={n} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
                <div className="flex-1 h-2.5 rounded-full bg-muted/60" />
                <div className="w-14 h-2.5 rounded-full bg-muted/40" />
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-[2px]">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/15 flex items-center justify-center mb-3">
            <Lock className="w-5 h-5 text-violet-600" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">{t("dash.crm.upsell_title")}</p>
          <p className="text-xs text-muted-foreground text-center mb-4 max-w-[220px] leading-relaxed">
            {t("dash.crm.upsell_desc")}
          </p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-upgrades"))}
            className="rounded-xl bg-violet-600 text-white px-5 py-2 text-sm font-semibold hover:bg-violet-700 transition-colors"
          >
            {t("dash.crm.upgrade_cta")}
          </button>
        </div>
      </div>
    </div>
  );
}

// Customer list for lead/donation verticals - sourced from the `contacts` table
// (via useContacts) instead of orders. ltv_cached / txn_count come from the CRM
// aggregation so donors/leads show their total given and count.
function ContactsCustomerView({ businessId, kind, hasCrmAddon }: { businessId?: string; kind: "lead" | "donation"; hasCrmAddon: boolean }) {
  const { t } = useLanguage();
  const { data: contacts = [], isLoading } = useContacts(businessId);
  const sorted = useMemo(
    () => [...contacts].sort((a, b) => (b.ltv_cached ?? 0) - (a.ltv_cached ?? 0)),
    [contacts],
  );
  const emptyLabel = kind === "donation"
    ? t("dash.crm.no_donors")
    : t("dash.crm.no_leads");
  const txnLabel = kind === "donation" ? t("dash.crm.donations_label") : t("dash.crm.inquiries_label");

  if (isLoading) {
    return <div className="text-center py-14 text-sm text-muted-foreground">{t("dash.crm.loading")}</div>;
  }
  return (
    <div className="space-y-5">
      {sorted.length === 0 ? (
        <div className="text-center py-14 rounded-2xl border border-dashed border-border">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
          {sorted.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3.5 bg-card hover:bg-muted/20 transition-colors">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {(c.name || "?").charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.name || t("dash.crm.no_name")}</p>
                {(c.phone || c.email) && (
                  <p className="text-xs text-muted-foreground truncate" dir="ltr">{c.phone || c.email}</p>
                )}
              </div>
              <div className="text-left shrink-0">
                {(c.ltv_cached ?? 0) > 0 && (
                  <div className="text-sm font-semibold tabular-nums text-foreground">{fmtPrice(c.ltv_cached ?? 0)}</div>
                )}
                {c.txn_count > 0 && (
                  <div className="text-xs text-muted-foreground mt-0.5">{c.txn_count} {txnLabel}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CRM+ blurred preview — shown only on free tier */}
      {!hasCrmAddon && (
        <div className="relative rounded-2xl border border-border overflow-hidden">
          <div className="blur-sm pointer-events-none select-none p-4 space-y-3" aria-hidden="true">
            <div className="grid grid-cols-2 gap-2">
              {[["67%", t("dash.crm.repeat_short")], ["₪1,245", t("dash.crm.avg_ltv")]].map(([v, l]) => (
                <div key={l} className="rounded-xl bg-muted/50 p-3">
                  <div className="text-2xl font-bold">{v}</div>
                  <div className="text-xs text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {[`${t("dash.crm.segment_vip")} (1)`, `${t("dash.crm.segment_at_risk")} (2)`, `${t("dash.crm.segment_dormant")} (3)`].map((s) => (
                <span key={s} className="text-xs px-3 py-1 rounded-full bg-primary/10 border border-primary/20">{s}</span>
              ))}
            </div>
            <div className="space-y-2 pt-1">
              {[t("dash.crm.demo_name_1"), t("dash.crm.demo_name_2")].map((n) => (
                <div key={n} className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 h-2.5 rounded-full bg-muted/60" />
                  <div className="w-14 h-2.5 rounded-full bg-muted/40" />
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-[2px]">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/15 flex items-center justify-center mb-3">
              <Lock className="w-5 h-5 text-violet-600" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">{t("dash.crm.upsell_title")}</p>
            <p className="text-xs text-muted-foreground text-center mb-4 max-w-[220px] leading-relaxed">
              {t("dash.crm.upsell_desc")}
            </p>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-upgrades"))}
              className="rounded-xl bg-violet-600 text-white px-5 py-2 text-sm font-semibold hover:bg-violet-700 transition-colors"
            >
              {t("dash.crm.upgrade_cta")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LockedTabView({ tab }: { tab: "suppliers" | "profitability" }) {
  const { t } = useLanguage();
  const meta = tab === "suppliers"
    ? {
        title: t("dash.crm.suppliers_title"),
        desc: t("dash.crm.suppliers_desc"),
        features: [t("dash.crm.suppliers_feature_cost"), t("dash.crm.suppliers_feature_sheet"), t("dash.crm.suppliers_feature_margin")],
      }
    : {
        title: t("dash.crm.profitability_title"),
        desc: t("dash.crm.profitability_desc"),
        features: [t("dash.crm.profitability_feature_income"), t("dash.crm.profitability_feature_chart"), t("dash.crm.profitability_feature_top")],
      };

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="w-12 h-12 rounded-2xl bg-violet-500/15 flex items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-violet-600" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{meta.title} - CRM+</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-xs">{meta.desc}</p>
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {meta.features.map((f) => (
          <span key={f} className="text-xs px-3 py-1.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">{f}</span>
        ))}
      </div>
      <button
        type="button"
        className="rounded-xl bg-violet-600 text-white px-6 py-2.5 text-sm font-semibold hover:bg-violet-700 transition-colors"
        onClick={() => window.dispatchEvent(new CustomEvent("open-upgrades"))}
      >
        {t("dash.crm.upgrade_cta")}
      </button>
    </div>
  );
}

type TabDef = { id: CrmTab; label: string; icon: typeof Users };

const getBaseTabs = (t: (key: string) => string): TabDef[] => [
  { id: "customers",     label: t("dash.crm.tab_customers"),     icon: Users },
  { id: "suppliers",     label: t("dash.crm.tab_suppliers"),     icon: Truck },
  { id: "profitability", label: t("dash.crm.tab_profitability"), icon: TrendingUp },
];

const getRealestateTabs = (t: (key: string) => string): TabDef[] => [
  { id: "pipeline",      label: t("dash.crm.tab_pipeline"),      icon: Kanban },
  { id: "customers",     label: t("dash.crm.tab_contacts"),      icon: Users },
  { id: "suppliers",     label: t("dash.crm.tab_suppliers"),     icon: Truck },
  { id: "profitability", label: t("dash.crm.tab_profitability"), icon: TrendingUp },
];

// nonprofit/synagogue "products" are donation projects, not purchased inventory - the
// profitability tab reads products/orders/order_items, which are permanently empty/
// meaningless for these verticals (no "commerce" module), so it's dropped entirely.
const getDonationTabs = (t: (key: string) => string): TabDef[] => [
  { id: "customers", label: t("dash.crm.tab_donors"),    icon: Users },
  { id: "suppliers", label: t("dash.crm.tab_suppliers"), icon: Truck },
];

const DashboardCRM = ({ orders, businessId, demoMode, initialTab = "customers", hasCrmAddon = false, businessType }: DashboardCRMProps) => {
  const { t } = useLanguage();
  const isRealEstate = businessType === "realestate";
  const isDonationVertical = businessType === "nonprofit" || businessType === "synagogue";
  const defaultTab: CrmTab = isRealEstate ? "pipeline" : "customers";
  const [tab, setTab] = useState<CrmTab>(initialTab === "customers" ? defaultTab : initialTab);

  const contactsVertical = isContactsVertical(businessType);
  const contactKind: "lead" | "donation" = isRealEstate ? "lead" : "donation";
  const TABS = isRealEstate ? getRealestateTabs(t) : isDonationVertical ? getDonationTabs(t) : getBaseTabs(t);

  const customersView = contactsVertical
    ? <ContactsCustomerView businessId={businessId} kind={contactKind} hasCrmAddon={hasCrmAddon} />
    : hasCrmAddon
      ? <DashboardCustomers orders={orders} businessId={businessId} demoMode={demoMode} />
      : <FreeCustomerView orders={orders} />;

  return (
    <div className="space-y-4" dir="rtl">
      <h1 className="text-xl font-bold text-foreground">{t("dash.crm.title")}</h1>

      {/* Tab bar - always visible; ספקים/רווחיות show lock icon for free tier */}
      <div className="inline-flex items-center gap-1 rounded-xl bg-muted p-1 flex-wrap">
        {TABS.map((t) => {
          const locked = !hasCrmAddon && t.id !== "customers" && t.id !== "pipeline";
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {locked && <Lock className="w-3 h-3 opacity-55" />}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {hasCrmAddon ? (
        <>
          {tab === "pipeline"      && <DashboardLeadsPipeline businessId={businessId} />}
          {tab === "customers"     && <>{customersView}<DashboardAnalytics businessId={businessId} /></>}
          {tab === "suppliers"     && <DashboardSuppliers businessId={businessId} demoMode={demoMode} />}
          {tab === "profitability" && <DashboardProfitability businessId={businessId} demoMode={demoMode} />}
        </>
      ) : (
        <>
          {tab === "pipeline"                                 && <DashboardLeadsPipeline businessId={businessId} />}
          {tab === "customers"                               && customersView}
          {(tab === "suppliers" || tab === "profitability")  && <LockedTabView tab={tab} />}
        </>
      )}
    </div>
  );
};

export default DashboardCRM;
