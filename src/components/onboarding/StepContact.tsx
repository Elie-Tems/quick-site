import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingData } from "@/pages/Onboarding";
import { Phone, Mail, MapPin } from "lucide-react";
import { StepNavigation } from "./StepNavigation";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const StepContact = ({ data, updateData, onNext, onBack }: Props) => {
  const isValid = !!data.orderEmail;

  const inputCls = "h-12 rounded-xl [background:var(--pv-surface2)] [border-color:var(--pv-border)] [color:var(--pv-text)] placeholder:[color:var(--pv-faint)] focus-visible:ring-primary/40";
  const labelCls = "font-medium pv-text flex items-center gap-2";

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-display font-bold pv-strong mb-1">פרטי יצירת קשר</h2>
        <p className="text-sm pv-muted">יופיעו באתר וישמשו לקבלת הזמנות</p>
      </div>

      {/* Email — required */}
      <div className="space-y-2">
        <Label htmlFor="orderEmail" className={labelCls}>
          <Mail className="w-4 h-4 text-primary/60" />
          אימייל לקבלת הזמנות *
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
        <p className="text-xs pv-faint">לכאן ישלחו ההזמנות וההודעות מלקוחות</p>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone" className={labelCls}>
          <Phone className="w-4 h-4 text-primary/60" />
          טלפון
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
          כתובת
        </Label>
        <Input
          id="address"
          placeholder="רחוב הראשי 1, תל אביב"
          value={data.address}
          onChange={e => updateData({ address: e.target.value })}
          className={inputCls}
        />
      </div>

      <StepNavigation
        onNext={onNext}
        onBack={onBack}
        nextLabel="הבא"
        nextDisabled={!isValid}
        showPreview={true}
        showSave={false}
      />
    </div>
  );
};

export default StepContact;
