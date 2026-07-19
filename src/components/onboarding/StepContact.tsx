import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingData } from "@/pages/Onboarding";
import { Phone, Mail, MapPin } from "lucide-react";
import { StepNavigation } from "./StepNavigation";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const StepContact = ({ data, updateData, onNext, onBack }: Props) => {
  const { t } = useLanguage();
  const isValid = !!data.orderEmail;

  const inputCls = "h-12 rounded-xl bg-[var(--pv-surface2)] border-[var(--pv-border)] text-[var(--pv-text)] placeholder:text-[var(--pv-faint)] focus-visible:ring-primary/40";
  const labelCls = "font-medium pv-text flex items-center gap-2";

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold pv-strong mb-1">{t("ob.contact.title")}</h2>
        <p className="text-sm pv-muted">{t("ob.contact.subtitle")}</p>
      </div>

      {/* Email — required */}
      <div className="space-y-2">
        <Label htmlFor="orderEmail" className={labelCls}>
          <Mail className="w-4 h-4 text-primary/60" />
          {t("ob.contact.email_label")}
        </Label>
        <Input
          id="orderEmail"
          type="email"
          placeholder="orders@mybusiness.com"
          value={data.orderEmail}
          onChange={e => updateData({ orderEmail: e.target.value })}
          className={inputCls}
          dir="ltr"
        />
        <p className="text-xs pv-faint">{t("ob.contact.email_hint")}</p>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone" className={labelCls}>
          <Phone className="w-4 h-4 text-primary/60" />
          {t("ob.contact.phone")}
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="050-1234567"
          value={data.phone}
          onChange={e => updateData({ phone: e.target.value })}
          className={inputCls}
          dir="ltr"
        />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address" className={labelCls}>
          <MapPin className="w-4 h-4 text-primary/60" />
          {t("ob.contact.address")}
        </Label>
        <Input
          id="address"
          placeholder={t("ob.contact.address_placeholder")}
          value={data.address}
          onChange={e => updateData({ address: e.target.value })}
          className={inputCls}
        />
      </div>

      <StepNavigation
        onNext={onNext}
        onBack={onBack}
        nextLabel={t("ob.common.next")}
        nextDisabled={!isValid}
        showPreview={true}
        showSave={false}
      />
    </div>
  );
};

export default StepContact;
