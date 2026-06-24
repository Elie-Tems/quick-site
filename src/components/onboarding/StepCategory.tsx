import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingData, BusinessCategory } from "@/pages/Onboarding";
import { businessCategoryList } from "@/lib/categoryConfig";
import {
  Store, Utensils, Coffee, Shirt, Gem, Smartphone, Sparkles, Dumbbell, Car, PawPrint,
  Flower2, BookOpen, Home, ShoppingBasket, Wine, Plus, Gamepad2, Palette, Baby, Gift,
  Pill, Sofa, Refrigerator, Scissors,
} from "lucide-react";
import { StepNavigation } from "./StepNavigation";

interface StepCategoryProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

// One consistent line icon per category (single accent color, no emoji/gradients).
const categoryIcons: Record<BusinessCategory, React.ComponentType<any>> = {
  bakery: Store, restaurant: Utensils, cafe: Coffee, clothing: Shirt, jewelry: Gem,
  electronics: Smartphone, beauty: Sparkles, fitness: Dumbbell, automotive: Car, pets: PawPrint,
  flowers: Flower2, books: BookOpen, home: Home, grocery: ShoppingBasket, wine_alcohol: Wine,
  toys: Gamepad2, art: Palette, baby: Baby, gifts: Gift, pharmacy: Pill,
  furniture: Sofa, appliances: Refrigerator, handmade: Scissors, other: Plus,
};

const StepCategory = ({ data, updateData, onNext, onBack }: StepCategoryProps) => {
  const handleCategoryChange = (categoryId: BusinessCategory) => {
    updateData({ businessCategory: categoryId });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateData({ [e.target.name]: e.target.value });
  };

  const isValid =
    data.businessCategory && (data.businessCategory !== "other" || data.customCategoryName);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="inline-block text-sm font-semibold text-primary px-3 py-1 rounded-full bg-primary/10">
            שלב 2
          </span>
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
              חזרה
            </Button>
          )}
        </div>
        <h1 className="text-xl md:text-2xl font-medium text-foreground mb-1.5">
          באיזה תחום העסק שלך?
        </h1>
        <p className="text-sm text-muted-foreground">
          בחרו קטגוריה ונתאים את האתר בשבילכם
        </p>
      </div>

      {/* Clean category grid - line icons, single accent, flat tiles */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
        {businessCategoryList.map(({ id, label }) => {
          const isSelected = data.businessCategory === id;
          const isOther = id === "other";
          const Icon = categoryIcons[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleCategoryChange(id)}
              aria-pressed={isSelected}
              className={`flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border transition-colors ${
                isOther ? "border-dashed" : ""
              } ${
                isSelected
                  ? "border-primary ring-1 ring-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <Icon className={`h-6 w-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
              <span
                className={`text-xs text-center leading-tight ${
                  isSelected ? "text-primary font-medium" : "text-foreground/80"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Custom category name - only when "other" is selected */}
      {data.businessCategory === "other" && (
        <div className="space-y-2">
          <Label htmlFor="customCategoryName" className="text-foreground font-medium">
            שם הקטגוריה המותאמת אישית <span className="text-red-500">*</span>
          </Label>
          <Input
            id="customCategoryName"
            name="customCategoryName"
            type="text"
            placeholder="לדוגמה: סטודיו צילום, שירותי ניקיון, מוצרי טבע..."
            value={data.customCategoryName || ""}
            onChange={handleChange}
            className="h-12 rounded-xl"
            required
          />
          <p className="text-xs text-muted-foreground">
            הקטגוריה תשמש לזיהוי העסק במערכת ותוצג ללקוחות
          </p>
        </div>
      )}

      <StepNavigation
        onNext={onNext}
        onSaveAndContinue={onNext}
        onBack={onBack}
        nextLabel="הבא"
        saveLabel="שמור והמשך"
        nextDisabled={!isValid}
        saveDisabled={!isValid}
        showPreview={true}
        showSave={true}
      />
    </div>
  );
};

export default StepCategory;
