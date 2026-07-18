// src/components/dashboard/WowStrip.tsx
import type { DashboardView } from "./DashboardNav";
import type { BusinessType } from "@/lib/businessModules";

interface WowFeature {
  emoji: string;
  label: string;
  view: DashboardView;
}

// Base 8 features for all types
const BASE_FEATURES: WowFeature[] = [
  { emoji: "🛍️", label: "ניהול מוצרים", view: "products" },
  { emoji: "👥", label: "לקוחות & CRM", view: "customers" },
  { emoji: "📊", label: "אנליטיקס", view: "home" },
  { emoji: "✍️", label: "תוכן AI", view: "content" },
  { emoji: "🎨", label: "עיצוב ותבניות", view: "design" },
  { emoji: "📄", label: "תקנון ומדיניות", view: "legal" },
  { emoji: "🌐", label: "דומיין מותאם", view: "domains" },
  { emoji: "📸", label: "תמונות AI", view: "ai-images" },
];

// Per-type label overrides (first N items)
const TYPE_LABEL_OVERRIDES: Partial<Record<BusinessType, Array<{ label?: string; view?: DashboardView }>>> = {
  services:   [{ label: "ניהול שירותים" }],
  realestate: [{ label: "ניהול נכסים" }, { label: "לידים & CRM" }],
  nonprofit:  [{ label: "ניהול פרויקטים" }, { label: "תורמים & CRM" }],
  synagogue:  [{ label: "ניהול פרויקטים" }, { label: "קהל & CRM" }],
  vacation:   [
    { label: "חדרים ויחידות" },
    { label: "אורחים & CRM" },
    { label: "אנליטיקס" },
    { label: "תוכן AI" },
    { label: "עיצוב ותבניות" },
    { label: "תקנון ומדיניות" },
    { label: "דומיין מותאם" },
    { label: "יומן זמינות", view: "availability" as DashboardView },
  ],
};

interface WowStripProps {
  businessType?: BusinessType;
  onNavigate: (view: DashboardView) => void;
}

export default function WowStrip({ businessType = "products", onNavigate }: WowStripProps) {
  const overrides = TYPE_LABEL_OVERRIDES[businessType] ?? [];
  const features = BASE_FEATURES.map((f, i) => ({
    ...f,
    ...(overrides[i] ?? {}),
  }));

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground mb-3">מה כלול בדשבורד שלך</p>
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
