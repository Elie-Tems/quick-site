import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingData } from "@/pages/Onboarding";
import { Upload } from "lucide-react";
import { StepNavigation } from "./StepNavigation";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

// Per business-type label sets, as i18n keys resolved with t() at render.
const LABELS = {
  nonprofit: { headingKey: "ob.id.np.heading", nameKey: "ob.id.np.name", namePhKey: "ob.id.np.name_ph", logoKey: "ob.id.np.logo", reassureKey: "ob.id.np.reassure" },
  services:  { headingKey: "ob.id.biz.heading", nameKey: "ob.id.biz.name", namePhKey: "ob.id.services.name_ph", logoKey: "ob.id.biz.logo", reassureKey: "ob.id.biz.reassure" },
  default:   { headingKey: "ob.id.biz.heading", nameKey: "ob.id.biz.name", namePhKey: "", logoKey: "ob.id.biz.logo", reassureKey: "ob.id.biz.reassure" },
};

const StepIdentity = ({ data, updateData, onNext, onBack }: Props) => {
  const { t } = useLanguage();
  const labels = data.businessType === 'nonprofit'
    ? LABELS.nonprofit
    : data.businessType === 'services'
    ? LABELS.services
    : LABELS.default;
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateData({ logo: file });
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const isValid = !!data.businessName.trim();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold pv-strong mb-1">{t(labels.headingKey)}</h2>
        <p className="text-sm pv-muted">{t("ob.id.subtitle")}</p>
      </div>

      {/* Business name */}
      <div className="space-y-2">
        <Label htmlFor="businessName" className="font-medium pv-text">{t(labels.nameKey)}</Label>
        <Input
          id="businessName"
          placeholder={labels.namePhKey ? t(labels.namePhKey) : ""}
          value={data.businessName}
          onChange={e => updateData({ businessName: e.target.value })}
          className="h-12 text-base rounded-xl bg-[var(--pv-surface2)] border-[var(--pv-border)] text-[var(--pv-text)] placeholder:text-[var(--pv-faint)] focus-visible:ring-primary/40"
        />
      </div>

      {/* Logo — optional */}
      <div className="space-y-2">
        <Label className="font-medium pv-text">{t(labels.logoKey)}</Label>
        <label className="flex items-center gap-4 p-4 rounded-xl border border-dashed cursor-pointer transition-colors hover:border-primary/50" style={{ borderColor: "var(--pv-border)", background: "var(--pv-surface2)" }}>
          {logoPreview ? (
            <img src={logoPreview} alt="logo" className="w-16 h-16 object-contain rounded-lg" />
          ) : (
            <div className="w-16 h-16 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--pv-surface)" }}>
              <Upload className="w-6 h-6 text-primary/60" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium pv-text">{logoPreview ? t("ob.id.logo_uploaded") : t("ob.id.logo_upload")}</p>
            <p className="text-xs pv-faint">PNG, JPG, SVG</p>
          </div>
          <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
        </label>
      </div>

      <StepNavigation
        onNext={onNext}
        onBack={onBack}
        nextLabel={t("ob.common.next")}
        nextDisabled={!isValid}
        showPreview={true}
        showSave={false}
        reassurance={t(labels.reassureKey)}
      />
    </div>
  );
};

export default StepIdentity;
