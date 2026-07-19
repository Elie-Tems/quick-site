import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OnboardingData, BusinessCategory } from "@/pages/Onboarding";
import { businessCategoryList } from "@/lib/categoryConfig";
import {
  Store, Utensils, Coffee, Shirt, Gem, Smartphone, Flower2, Dumbbell, Car, PawPrint,
  Flower2, BookOpen, Home, ShoppingBasket, Wine, Plus, Gamepad2, Palette, Baby, Gift,
  Pill, Sofa, Refrigerator, Scissors, Search, Check, ChevronDown,
} from "lucide-react";
import { StepNavigation } from "./StepNavigation";
import { useLanguage } from "@/contexts/LanguageContext";

interface StepCategoryProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

const categoryIcons: Record<BusinessCategory, React.ComponentType<any>> = {
  bakery: Store, restaurant: Utensils, cafe: Coffee, clothing: Shirt, jewelry: Gem,
  electronics: Smartphone, beauty: Flower2, fitness: Dumbbell, automotive: Car, pets: PawPrint,
  flowers: Flower2, books: BookOpen, home: Home, grocery: ShoppingBasket, wine_alcohol: Wine,
  toys: Gamepad2, art: Palette, baby: Baby, gifts: Gift, pharmacy: Pill,
  furniture: Sofa, appliances: Refrigerator, handmade: Scissors, other: Plus,
};

const StepCategory = ({ data, updateData, onNext, onBack }: StepCategoryProps) => {
  const { t } = useLanguage();
  const selectedLabel = businessCategoryList.find(
    (c) => c.id === data.businessCategory && c.id !== "other",
  )?.label;

  const [query, setQuery] = useState(selectedLabel || data.customCategoryName || "");
  const [showAll, setShowAll] = useState(false);
  const [focused, setFocused] = useState(false);

  const q = query.trim();
  const matches = q
    ? businessCategoryList.filter((c) => c.id !== "other" && c.label.includes(q)).slice(0, 6)
    : [];
  const showSuggestions = focused && q.length > 0 && selectedLabel !== q;

  const pickCategory = (id: BusinessCategory, label: string) => {
    updateData({ businessCategory: id, customCategoryName: undefined });
    setQuery(label);
    setFocused(false);
  };
  const useCustom = () => {
    updateData({ businessCategory: "other", customCategoryName: q });
    setFocused(false);
  };

  const isValid =
    !!data.businessCategory && (data.businessCategory !== "other" || !!data.customCategoryName);
  const selectionText = selectedLabel || (data.businessCategory === "other" ? data.customCategoryName : "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="inline-block text-sm font-semibold text-primary px-3 py-1 rounded-full bg-primary/10">
            {t("ob.cat.step2")}
          </span>
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground hover:text-foreground">
              {t("ob.common.back")}
            </Button>
          )}
        </div>
        <h1 className="text-xl md:text-2xl font-medium text-foreground mb-1.5">{t("ob.cat.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("ob.cat.hint")}</p>
      </div>

      {/* Search with autocomplete */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={t("ob.cat.placeholder")}
          className="h-12 rounded-xl pr-11"
          autoComplete="off"
        />

        {showSuggestions && (
          <div className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            {matches.map(({ id, label }) => {
              const Icon = categoryIcons[id];
              return (
                <button
                  key={id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickCategory(id, label)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-right hover:bg-primary/5 transition-colors"
                >
                  <Icon className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-sm text-foreground">{label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={useCustom}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-right hover:bg-primary/5 transition-colors border-t border-border"
            >
              <Plus className="w-5 h-5 text-muted-foreground shrink-0" />
              <span className="text-sm text-foreground">
                {t("ob.cat.use")} <span className="font-medium">"{q}"</span> {t("ob.cat.other_field")}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Selected confirmation */}
      {isValid && (
        <div className="flex items-center gap-2 text-sm text-primary">
          <Check className="w-4 h-4" />
          {t("ob.cat.selected")} <span className="font-medium">{selectionText}</span>
        </div>
      )}

      {/* Optional: browse all */}
      <div>
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? "rotate-180" : ""}`} />
          {showAll ? t("ob.cat.hide") : t("ob.cat.browse_all")}
        </button>

        {showAll && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mt-3">
            {businessCategoryList.map(({ id, label }) => {
              const isSelected = data.businessCategory === id;
              const Icon = categoryIcons[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => pickCategory(id, id === "other" ? "" : label)}
                  className={`flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-xl border transition-colors ${
                    isSelected ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <Icon className={`h-6 w-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-xs text-center leading-tight ${isSelected ? "text-primary font-medium" : "text-foreground/80"}`}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom name field when "other" with no name yet */}
      {data.businessCategory === "other" && !data.customCategoryName && (
        <Input
          type="text"
          placeholder={t("ob.cat.custom_placeholder")}
          value={data.customCategoryName || ""}
          onChange={(e) => updateData({ customCategoryName: e.target.value })}
          className="h-12 rounded-xl"
        />
      )}

      <StepNavigation
        onNext={onNext}
        onSaveAndContinue={onNext}
        onBack={onBack}
        nextLabel={t("ob.common.next")}
        saveLabel={t("ob.common.save")}
        nextDisabled={!isValid}
        saveDisabled={!isValid}
        showPreview={true}
        showSave={true}
      />
    </div>
  );
};

export default StepCategory;
