import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingData, BusinessCategory } from "@/pages/Onboarding";
import { businessCategoryList } from "@/lib/categoryConfig";
import {
  Store, Utensils, Coffee, Shirt, Gem, Smartphone, Sparkles, Dumbbell, Car, PawPrint,
  Flower2, BookOpen, Home, ShoppingBasket, Wine, Plus, Gamepad2, Palette, Baby, Gift,
  Pill, Sofa, Refrigerator, Scissors, Search, Check, Upload,
} from "lucide-react";
import { StepNavigation } from "./StepNavigation";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

const categoryIcons: Record<BusinessCategory, React.ComponentType<any>> = {
  bakery: Store, restaurant: Utensils, cafe: Coffee, clothing: Shirt, jewelry: Gem,
  electronics: Smartphone, beauty: Sparkles, fitness: Dumbbell, automotive: Car, pets: PawPrint,
  flowers: Flower2, books: BookOpen, home: Home, grocery: ShoppingBasket, wine_alcohol: Wine,
  toys: Gamepad2, art: Palette, baby: Baby, gifts: Gift, pharmacy: Pill,
  furniture: Sofa, appliances: Refrigerator, handmade: Scissors, other: Plus,
};

const StepIdentity = ({ data, updateData, onNext, onBack }: Props) => {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [query, setQuery] = useState(() => {
    return businessCategoryList.find(c => c.id === data.businessCategory && c.id !== "other")?.label
      || data.customCategoryName || "";
  });
  const [focused, setFocused] = useState(false);

  const matches = query.trim()
    ? businessCategoryList.filter(c => c.id !== "other" && c.label.includes(query.trim())).slice(0, 5)
    : [];
  const showSuggestions = focused && query.trim().length > 0 &&
    !businessCategoryList.find(c => c.label === query.trim());

  const pickCategory = (id: BusinessCategory, label: string) => {
    updateData({ businessCategory: id, customCategoryName: undefined });
    setQuery(label);
    setFocused(false);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateData({ logo: file });
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const categoryValid = !!data.businessCategory && (data.businessCategory !== "other" || !!data.customCategoryName);
  const isValid = !!data.businessName.trim() && categoryValid;

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

      {/* Category */}
      <div className="space-y-2">
        <Label className="font-medium">תחום העסק *</Label>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="הקלידו תחום — פרחים, תכשיטים, בגדים..."
            className="h-12 rounded-xl pr-10"
          />
          {showSuggestions && (
            <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
              {matches.map(({ id, label }) => {
                const Icon = categoryIcons[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => pickCategory(id, label)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-right hover:bg-primary/5 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm">{label}</span>
                  </button>
                );
              })}
              {query.trim() && (
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => { updateData({ businessCategory: "other", customCategoryName: query.trim() }); setFocused(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-right hover:bg-primary/5 transition-colors border-t border-border"
                >
                  <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">תחום אחר: <span className="font-medium">"{query.trim()}"</span></span>
                </button>
              )}
            </div>
          )}
        </div>
        {categoryValid && (
          <div className="flex items-center gap-1.5 text-xs text-primary">
            <Check className="w-3.5 h-3.5" />
            {businessCategoryList.find(c => c.id === data.businessCategory)?.label || data.customCategoryName}
          </div>
        )}
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
      />
    </div>
  );
};

export default StepIdentity;
