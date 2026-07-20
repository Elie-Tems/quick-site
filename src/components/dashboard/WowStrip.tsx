// src/components/dashboard/WowStrip.tsx
import type { DashboardView } from "./DashboardNav";
import type { BusinessType } from "@/lib/businessModules";
import { useLanguage } from "@/contexts/LanguageContext";

interface WowFeature {
  emoji: string;
  label: string;
  view: DashboardView;
}

// Base 8 features for all types
const getBaseFeatures = (t: (key: string) => string): WowFeature[] => [
  { emoji: "🛍️", label: t("dash.wowstrip.products"), view: "products" },
  { emoji: "👥", label: t("dash.wowstrip.customers"), view: "customers" },
  { emoji: "📊", label: t("dash.wowstrip.analytics"), view: "home" },
  { emoji: "✍️", label: t("dash.wowstrip.content_ai"), view: "content" },
  { emoji: "🎨", label: t("dash.wowstrip.design"), view: "design" },
  { emoji: "📄", label: t("dash.wowstrip.legal"), view: "legal" },
  { emoji: "🌐", label: t("dash.wowstrip.domain"), view: "domains" },
  { emoji: "📸", label: t("dash.wowstrip.ai_images"), view: "ai-images" },
];

// Per-type label overrides (first N items)
const getTypeLabelOverrides = (
  t: (key: string) => string
): Partial<Record<BusinessType, Array<{ label?: string; view?: DashboardView }>>> => ({
  services:   [{ label: t("dash.wowstrip.services_management") }],
  realestate: [{ label: t("dash.wowstrip.properties_management") }, { label: t("dash.wowstrip.leads_crm") }],
  nonprofit:  [{ label: t("dash.wowstrip.projects_management") }, { label: t("dash.wowstrip.donors_crm") }],
  synagogue:  [{ label: t("dash.wowstrip.projects_management") }, { label: t("dash.wowstrip.community_crm") }],
  vacation:   [
    { label: t("dash.wowstrip.rooms_units") },
    { label: t("dash.wowstrip.guests_crm") },
    { label: t("dash.wowstrip.analytics") },
    { label: t("dash.wowstrip.content_ai") },
    { label: t("dash.wowstrip.design") },
    { label: t("dash.wowstrip.legal") },
    { label: t("dash.wowstrip.domain") },
    { label: t("dash.wowstrip.availability_calendar"), view: "availability" as DashboardView },
  ],
});

interface WowStripProps {
  businessType?: BusinessType;
  onNavigate: (view: DashboardView) => void;
}

export default function WowStrip({ businessType = "products", onNavigate }: WowStripProps) {
  const { t } = useLanguage();
  const overrides = getTypeLabelOverrides(t)[businessType] ?? [];
  const features = getBaseFeatures(t).map((f, i) => ({
    ...f,
    ...(overrides[i] ?? {}),
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground mb-3">{t("dash.wowstrip.title")}</p>
      <div className="grid grid-cols-4 gap-2">
        {features.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => onNavigate(f.view)}
            className="flex flex-col items-center gap-1.5 rounded-xl p-2 hover:bg-muted/60 transition-colors group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform inline-block">{f.emoji}</span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">{f.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
