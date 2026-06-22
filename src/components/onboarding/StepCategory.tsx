import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingData, BusinessCategory } from "@/pages/Onboarding";
import { businessCategoryList } from "@/lib/categoryConfig";
import { ArrowLeft, Store, Utensils, Coffee, Shirt, Gem, Smartphone, Sparkles, Dumbbell, Car, PawPrint, Flower2, BookOpen, Home, ShoppingBasket, Wine, Plus, Gamepad2, Palette, Baby, Gift, Pill, Sofa, Refrigerator, Scissors } from "lucide-react";
import { motion } from "framer-motion";
import { StepNavigation } from "./StepNavigation";

interface StepCategoryProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

const categoryExtras: Record<BusinessCategory, { icon: React.ComponentType<any>; gradient: string; emoji: string }> = {
  bakery: { icon: Store, gradient: "from-amber-500 to-orange-600", emoji: "🥐" },
  restaurant: { icon: Utensils, gradient: "from-red-500 to-rose-600", emoji: "🍽️" },
  cafe: { icon: Coffee, gradient: "from-amber-700 to-yellow-800", emoji: "☕" },
  clothing: { icon: Shirt, gradient: "from-pink-500 to-purple-600", emoji: "👗" },
  jewelry: { icon: Gem, gradient: "from-cyan-400 to-blue-500", emoji: "💎" },
  electronics: { icon: Smartphone, gradient: "from-slate-400 to-slate-600", emoji: "📱" },
  beauty: { icon: Sparkles, gradient: "from-fuchsia-400 to-pink-500", emoji: "✨" },
  fitness: { icon: Dumbbell, gradient: "from-lime-500 to-green-600", emoji: "💪" },
  automotive: { icon: Car, gradient: "from-blue-500 to-indigo-600", emoji: "🚗" },
  pets: { icon: PawPrint, gradient: "from-orange-400 to-amber-500", emoji: "🐾" },
  flowers: { icon: Flower2, gradient: "from-rose-400 to-pink-500", emoji: "🌸" },
  books: { icon: BookOpen, gradient: "from-emerald-500 to-teal-600", emoji: "📚" },
  home: { icon: Home, gradient: "from-violet-500 to-purple-600", emoji: "🏠" },
  grocery: { icon: ShoppingBasket, gradient: "from-green-500 to-emerald-600", emoji: "🛒" },
  wine_alcohol: { icon: Wine, gradient: "from-purple-600 to-rose-600", emoji: "🍷" },
  toys: { icon: Gamepad2, gradient: "from-yellow-400 to-orange-500", emoji: "🧸" },
  art: { icon: Palette, gradient: "from-indigo-400 to-purple-500", emoji: "🎨" },
  baby: { icon: Baby, gradient: "from-pink-300 to-rose-400", emoji: "👶" },
  gifts: { icon: Gift, gradient: "from-red-400 to-pink-500", emoji: "🎁" },
  pharmacy: { icon: Pill, gradient: "from-teal-400 to-cyan-500", emoji: "💊" },
  furniture: { icon: Sofa, gradient: "from-amber-600 to-yellow-700", emoji: "🛋️" },
  appliances: { icon: Refrigerator, gradient: "from-sky-400 to-blue-500", emoji: "🔌" },
  handmade: { icon: Scissors, gradient: "from-rose-500 to-orange-500", emoji: "✂️" },
  other: { icon: Plus, gradient: "from-primary to-primary", emoji: "➕" },
};

const categories = businessCategoryList.map(({ id, label }) => ({
  id,
  label,
  ...categoryExtras[id],
}));

const StepCategory = ({ data, updateData, onNext, onBack }: StepCategoryProps) => {
  const handleCategoryChange = (categoryId: BusinessCategory) => {
    updateData({ businessCategory: categoryId });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateData({ [e.target.name]: e.target.value });
  };

  const isValid = data.businessCategory && 
    (data.businessCategory !== "other" || data.customCategoryName);

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
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          באיזה תחום העסק שלך? 🎯
        </h1>
        <p className="text-muted-foreground">
          בחר קטגוריה ונתאים את האתר בדיוק בשבילך
        </p>
      </div>

      {/* Vibrant Category Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {categories.map((cat, index) => {
          const isSelected = data.businessCategory === cat.id;
          const isOther = cat.id === 'other';
          
          return (
            <motion.button
              key={cat.id}
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03, type: "spring", stiffness: 200 }}
              whileHover={{ scale: 1.08, y: -4, rotate: isSelected ? 0 : [0, -1, 1, 0] }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCategoryChange(cat.id)}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300 overflow-hidden group cursor-pointer ${
                isOther ? 'border-2 border-dashed border-primary/40' : ''
              }`}
              style={{
                background: isSelected 
                  ? `linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.05))`
                  : 'rgba(20, 20, 20, 0.8)',
                border: isSelected 
                  ? '2px solid hsl(var(--primary))' 
                  : isOther 
                  ? undefined
                  : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isSelected 
                  ? '0 0 30px hsl(var(--primary) / 0.5), 0 8px 32px rgba(0,0,0,0.4)' 
                  : '0 4px 16px rgba(0,0,0,0.3)',
              }}
            >
              {/* Colorful gradient background on hover */}
              <div 
                className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-2xl`}
              />
              
              {/* Shine effect on hover */}
              <motion.div
                initial={{ x: '-100%', opacity: 0 }}
                whileHover={{ x: '100%', opacity: 0.3 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent skew-x-12"
              />

              {/* Selected glow animation */}
              {isSelected && (
                <motion.div
                  animate={{ 
                    boxShadow: [
                      '0 0 20px hsl(var(--primary) / 0.3)',
                      '0 0 40px hsl(var(--primary) / 0.5)',
                      '0 0 20px hsl(var(--primary) / 0.3)'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-2xl"
                />
              )}

              {/* Emoji Icon - Big and Expressive */}
              <motion.div 
                className="relative z-10 text-3xl mb-1"
                animate={isSelected ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.5, repeat: isSelected ? Infinity : 0, repeatDelay: 2 }}
              >
                {cat.emoji}
              </motion.div>
              
              {/* Gradient colored icon circle for selected state */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={`absolute top-2 left-2 w-6 h-6 rounded-full bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-lg`}
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
              
              {/* Label with gradient on hover */}
              <span className={`relative z-10 text-xs sm:text-sm font-bold text-center transition-all duration-300 ${
                isSelected 
                  ? "text-primary" 
                  : "text-foreground/70 group-hover:text-foreground"
              }`}>
                {cat.label}
              </span>

              {/* Bottom accent bar */}
              <motion.div 
                initial={{ scaleX: 0 }}
                animate={{ scaleX: isSelected ? 1 : 0 }}
                className={`absolute bottom-0 left-2 right-2 h-1 rounded-full bg-gradient-to-r ${cat.gradient}`}
              />
            </motion.button>
          );
        })}
      </div>

      {/* Custom Category Name - shown only when "other" is selected */}
      {data.businessCategory === "other" && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-2"
        >
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
            className="h-12 bg-[#1a1a1a] border-[#333] focus:border-primary focus:ring-primary/20 rounded-xl"
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
            }}
            required
          />
          <p className="text-xs text-muted-foreground">
            הקטגוריה תשמש לזיהוי העסק במערכת ותוצג ללקוחות
          </p>
        </motion.div>
      )}

      {/* Navigation */}
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
