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

  return (
    <div className="space-y-6" dir="rtl">
      <div className="text-center">
        <h1 className="text-2xl font-medium text-foreground mb-1">פרטי יצירת קשר</h1>
        <p className="text-sm text-muted-foreground">יופיעו באתר וישמשו לקבלת הזמנות</p>
      </div>

      {/* Email — required */}
      <div className="space-y-2">
        <Label htmlFor="orderEmail" className="font-medium flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground" />
          אימייל לקבלת הזמנות *
        </Label>
        <Input
          id="orderEmail"
          type="email"
          placeholder="orders@mybusiness.com"
          value={data.orderEmail}
          onChange={e => updateData({ orderEmail: e.target.value })}
          className="h-12 rounded-xl"
          dir="ltr"
        />
        <p className="text-xs text-muted-foreground">לכאן ישלחו ההזמנות וההודעות מלקוחות</p>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="font-medium flex items-center gap-2">
          <Phone className="w-4 h-4 text-muted-foreground" />
          טלפון
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="050-1234567"
          value={data.phone}
          onChange={e => updateData({ phone: e.target.value })}
          className="h-12 rounded-xl"
          dir="ltr"
        />
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address" className="font-medium flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          כתובת
        </Label>
        <Input
          id="address"
          placeholder="רחוב הראשי 1, תל אביב"
          value={data.address}
          onChange={e => updateData({ address: e.target.value })}
          className="h-12 rounded-xl"
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
