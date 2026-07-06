import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingData } from "@/pages/Onboarding";
import { Upload } from "lucide-react";
import { StepNavigation } from "./StepNavigation";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

const StepIdentity = ({ data, updateData, onNext, onBack }: Props) => {
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
    <div className="space-y-8" dir="rtl">
      <div className="text-center">
        <h1 className="text-2xl font-medium text-foreground mb-1">ספרו לנו על העסק</h1>
        <p className="text-sm text-muted-foreground">פרטים בסיסיים — אפשר לשנות בכל עת</p>
      </div>

      {/* Business name */}
      <div className="space-y-2">
        <Label htmlFor="businessName" className="font-medium">שם העסק *</Label>
        <Input
          id="businessName"
          placeholder="למשל: פרחי שושנה, מאפיית אמא, גאדג׳טס"
          value={data.businessName}
          onChange={e => updateData({ businessName: e.target.value })}
          className="h-12 text-base rounded-xl"
        />
      </div>

      {/* Logo — optional */}
      <div className="space-y-2">
        <Label className="font-medium">לוגו</Label>
        <label className="flex items-center gap-4 p-4 rounded-xl border border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
          {logoPreview ? (
            <img src={logoPreview} alt="logo" className="w-16 h-16 object-contain rounded-lg" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{logoPreview ? "לוגו הועלה" : "העלו לוגו"}</p>
            <p className="text-xs text-muted-foreground">PNG, JPG, SVG</p>
          </div>
          <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
        </label>
      </div>

      <StepNavigation
        onNext={onNext}
        onBack={onBack}
        nextLabel="הבא"
        nextDisabled={!isValid}
        showPreview={true}
        showSave={false}
        reassurance="אלו רק הפרטים הבסיסיים - תמיד אפשר לערוך ולהרחיב הכל אחר כך מלוח הניהול שלכם."
      />
    </div>
  );
};

export default StepIdentity;
