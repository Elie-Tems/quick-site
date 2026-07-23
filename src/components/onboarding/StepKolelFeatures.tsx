import { useState } from "react";
import { BookOpen, Image, Newspaper, Calendar, MessageCircle, ScrollText, ChevronDown, ChevronUp } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";

interface Props {
  data: OnboardingData;
  updateData: (u: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface FeatureDef {
  key: keyof NonNullable<OnboardingData["kolelFeatures"]>;
  label: string;
  desc: string;
  icon: React.ElementType;
  extra?: { field: keyof NonNullable<OnboardingData["kolelFeatures"]>; label: string; placeholder: string };
}

const FEATURES: FeatureDef[] = [
  {
    key: "rosh_message",
    label: "דבר ראש הישיבה / הכולל",
    desc: "קטע אישי מהרב — מי אנחנו ולאן אנחנו הולכים",
    icon: ScrollText,
  },
  {
    key: "gallery",
    label: "גלריית תמונות / סרטונים",
    desc: "תמונות בית המדרש, לומדים, אירועים",
    icon: Image,
  },
  {
    key: "shiurim",
    label: "שיעורי תורה",
    desc: "שיעורים מוקלטים מסודרים לפי נושא / רב",
    icon: BookOpen,
    extra: { field: "youtube_url", label: "ערוץ YouTube (אופציונלי)", placeholder: "https://youtube.com/@..." },
  },
  {
    key: "parasha",
    label: "פרשת השבוע",
    desc: "שיעור שבועי על פרשת השבוע",
    icon: ScrollText,
  },
  {
    key: "newsletter",
    label: "ניוזלטר שבועי",
    desc: "הרשמה לעלון / פרשה במייל",
    icon: Newspaper,
    extra: { field: "newsletter_name", label: "שם העלון", placeholder: "למשל: עלון שבת קודש" },
  },
  {
    key: "events",
    label: "חדשות ואירועים",
    desc: "ימי עיון, כנסים, שמחות בוגרים",
    icon: Calendar,
  },
  {
    key: "ask_rabbi",
    label: "שאל את הרב",
    desc: "שאלות הלכה ויצירת קשר ישיר עם הרב",
    icon: MessageCircle,
  },
];

const DEFAULT_FEATURES: NonNullable<OnboardingData["kolelFeatures"]> = {
  rosh_message: false,
  gallery: false,
  shiurim: false,
  youtube_url: "",
  parasha: false,
  newsletter: false,
  newsletter_name: "",
  events: false,
  ask_rabbi: false,
};

const StepKolelFeatures = ({ data, updateData, onNext, onBack }: Props) => {
  const [features, setFeatures] = useState<NonNullable<OnboardingData["kolelFeatures"]>>(
    data.kolelFeatures ?? DEFAULT_FEATURES
  );

  const toggle = (key: keyof typeof DEFAULT_FEATURES) => {
    setFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const setExtra = (field: keyof typeof DEFAULT_FEATURES, value: string) => {
    setFeatures(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    updateData({ kolelFeatures: features });
    onNext();
  };

  const isRoshYeshiva = data.businessType === "synagogue" || data.businessSubType === "synagogue";
  const institutionLabel = isRoshYeshiva ? "הכנסת" : "הישיבה / הכולל";

  return (
    <div className="space-y-6" dir="rtl">
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold pv-strong mb-1">מה תרצה שיהיה באתר?</h2>
        <p className="text-sm pv-muted">אודות {institutionLabel} כלול תמיד. סמן מה רלוונטי עבורך — אפשר לשנות אחר כך</p>
      </div>

      {/* Always-on */}
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3.5 border"
        style={{ background: "var(--pv-surface2)", borderColor: "var(--pv-border)", opacity: 0.7 }}
      >
        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <ScrollText className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold pv-strong">אודות המוסד</p>
          <p className="text-xs pv-faint">היסטוריה, ראשי ישיבה, ערכים — תמיד מופיע</p>
        </div>
        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>

      {/* Toggleable features */}
      <div className="space-y-2">
        {FEATURES.map((f) => {
          const on = !!features[f.key as keyof typeof features];
          const Icon = f.icon;
          return (
            <div key={f.key} className="rounded-xl border overflow-hidden transition-colors"
              style={{
                borderColor: on ? "var(--color-primary, #22c55e)" : "var(--pv-border)",
                background: on ? "color-mix(in srgb, var(--color-primary, #22c55e) 8%, var(--pv-surface2))" : "var(--pv-surface2)",
              }}
            >
              <button
                type="button"
                onClick={() => toggle(f.key as keyof typeof DEFAULT_FEATURES)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-right"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${on ? "bg-primary/20" : "bg-black/5"}`}>
                  <Icon className={`w-4 h-4 ${on ? "text-primary" : "pv-muted"}`} />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-sm font-semibold pv-strong">{f.label}</p>
                  <p className="text-xs pv-faint">{f.desc}</p>
                </div>
                {/* Toggle pill */}
                <div className={`w-10 h-6 rounded-full transition-colors shrink-0 relative ${on ? "bg-primary" : "bg-black/20"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? "right-1" : "right-5"}`} />
                </div>
              </button>

              {/* Inline extra field */}
              {on && f.extra && (
                <div className="px-4 pb-3.5 pt-0">
                  <label className="block text-xs pv-muted mb-1">{f.extra.label}</label>
                  <input
                    type="text"
                    value={(features[f.extra.field as keyof typeof features] as string) || ""}
                    onChange={e => setExtra(f.extra!.field as keyof typeof DEFAULT_FEATURES, e.target.value)}
                    placeholder={f.extra.placeholder}
                    dir="ltr"
                    className="w-full h-9 px-3 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                    style={{ background: "var(--pv-surface)", border: "1px solid var(--pv-border)", color: "var(--pv-text)" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleNext}
        className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-shadow"
      >
        המשך
      </button>
      <button type="button" onClick={onBack} className="w-full text-center text-sm pv-faint hover:pv-muted py-1">
        חזרה
      </button>
    </div>
  );
};

export default StepKolelFeatures;
