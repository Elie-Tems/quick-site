import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingData } from "@/pages/Onboarding";
import { Phone, Mail, MapPin, Facebook, Instagram } from "lucide-react";
import { StepNavigation } from "./StepNavigation";
import BusinessHoursPicker from "./BusinessHoursPicker";

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

      {/* Business hours */}
      <div className="space-y-2">
        <Label className="font-medium">שעות פעילות</Label>
        <BusinessHoursPicker
          value={data.businessHours}
          onChange={v => updateData({ businessHours: v })}
        />
      </div>

      {/* Social links */}
      <div className="space-y-2">
        <Label className="font-medium">רשתות חברתיות</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Facebook className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1877F2] pointer-events-none" />
            <Input
              type="url"
              placeholder="קישור לפייסבוק"
              value={data.socialLinks?.facebook || ""}
              onChange={e => updateData({ socialLinks: { ...data.socialLinks, facebook: e.target.value } })}
              className="h-12 rounded-xl pr-10"
              dir="ltr"
            />
          </div>
          <div className="relative">
            <Instagram className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#E4405F] pointer-events-none" />
            <Input
              type="url"
              placeholder="קישור לאינסטגרם"
              value={data.socialLinks?.instagram || ""}
              onChange={e => updateData({ socialLinks: { ...data.socialLinks, instagram: e.target.value } })}
              className="h-12 rounded-xl pr-10"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      <StepNavigation
        onNext={onNext}
        onSaveAndContinue={onNext}
        onBack={onBack}
        nextLabel="הבא"
        saveLabel="שמור והמשך"
        nextDisabled={!isValid}
        saveDisabled={!isValid}
        showPreview={false}
        showSave={false}
      />
    </div>
  );
};

export default StepContact;
