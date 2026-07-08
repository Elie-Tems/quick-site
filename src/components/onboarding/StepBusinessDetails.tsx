import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingData } from "@/pages/Onboarding";
import { ArrowLeft, ArrowRight, Upload, Facebook, Instagram, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { StepNavigation } from "./StepNavigation";
import BusinessHoursPicker from "./BusinessHoursPicker";

interface StepBusinessDetailsProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const StepBusinessDetails = ({ data, updateData, onNext, onBack }: StepBusinessDetailsProps) => {
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateData({ [e.target.name]: e.target.value });
  };

  const handleSocialLinkChange = (platform: 'facebook' | 'instagram', value: string) => {
    updateData({
      socialLinks: {
        ...data.socialLinks,
        [platform]: value,
      }
    });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateData({ logo: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const isValid = data.businessName && data.orderEmail;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <span className="inline-block text-sm font-semibold text-primary mb-3 px-3 py-1 rounded-full bg-primary/10">
          שלב 5
        </span>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          פרטי העסק
        </h1>
        <p className="text-muted-foreground">
          המידע הבסיסי שיופיע באתר שלך
        </p>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Business Name - High-tech input with dramatic glow */}
        <div className="space-y-3">
          <Label htmlFor="businessName" className="text-foreground font-semibold text-lg">שם העסק <span className="text-red-500">*</span></Label>
          <div className="relative group">
            <Input
              id="businessName"
              name="businessName"
              type="text"
              placeholder="העסק שלי"
              value={data.businessName}
              onChange={handleChange}
              className="h-16 text-xl font-medium bg-[#1a1a1a] border-2 border-[#333] focus:border-primary focus:ring-0 rounded-2xl placeholder:text-muted-foreground/40 transition-all duration-300"
              style={{
                boxShadow: data.businessName 
                  ? '0 0 40px hsl(var(--primary) / 0.25), 0 0 80px hsl(var(--primary) / 0.1), inset 0 2px 0 rgba(255,255,255,0.05)' 
                  : '0 4px 20px rgba(0,0,0,0.3), inset 0 2px 0 rgba(255,255,255,0.05)'
              }}
              required
            />
            {/* Animated border glow */}
            {data.businessName && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  border: '2px solid hsl(var(--primary))',
                  boxShadow: '0 0 20px hsl(var(--primary) / 0.3), inset 0 0 20px hsl(var(--primary) / 0.05)'
                }}
              />
            )}
            {/* Corner accent lights */}
            <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary/50 blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-primary/50 blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Logo Upload Zone */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <Label className="text-foreground font-semibold text-lg block text-center">לוגו העסק</Label>
          
          <motion.label 
            className="block cursor-pointer group mx-auto max-w-[200px]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div 
              className="w-40 h-40 mx-auto rounded-2xl flex flex-col items-center justify-center overflow-hidden relative"
              animate={!logoPreview ? {
                boxShadow: [
                  '0 0 20px hsl(var(--primary) / 0.2), 0 10px 40px rgba(0,0,0,0.5)',
                  '0 0 40px hsl(var(--primary) / 0.4), 0 10px 40px rgba(0,0,0,0.5)',
                  '0 0 20px hsl(var(--primary) / 0.2), 0 10px 40px rgba(0,0,0,0.5)',
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                background: logoPreview 
                  ? 'linear-gradient(145deg, rgba(15, 15, 15, 0.98), rgba(5, 5, 5, 0.98))'
                  : 'linear-gradient(145deg, rgba(20, 20, 20, 0.95), rgba(10, 10, 10, 0.98))',
                border: logoPreview 
                  ? '3px solid hsl(var(--primary))'
                  : '2px dashed hsl(var(--primary) / 0.5)',
                backdropFilter: 'blur(20px)',
                boxShadow: logoPreview 
                  ? '0 0 50px hsl(var(--primary) / 0.5), 0 15px 40px rgba(0,0,0,0.6)'
                  : undefined,
              }}
            >
              {/* Corner accents for logo */}
              {!logoPreview && (
                <>
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/60 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/60 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary/60 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary/60 rounded-br-lg" />
                </>
              )}
              
              {logoPreview ? (
                <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain p-3" />
              ) : (
                <>
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Upload className="w-10 h-10 text-primary/70 mb-3" />
                  </motion.div>
                  <span className="text-sm font-semibold text-muted-foreground">העלו לוגו</span>
                  <span className="text-xs text-muted-foreground/50 mt-1">PNG, JPG, SVG</span>
                </>
              )}
              
              {/* Hover glow */}
              <div 
                className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.2), transparent 70%)',
                }}
              />
            </motion.div>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="hidden"
            />
          </motion.label>
          <p className="text-xs text-muted-foreground text-center">
            הלוגו יופיע בכותרת האתר ובאזורים נוספים
          </p>
        </motion.div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-foreground font-medium">טלפון</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            placeholder="050-1234567"
            value={data.phone}
            onChange={handleChange}
            className="h-12 bg-[#1a1a1a] border-[#333] focus:border-primary focus:ring-primary/20 rounded-xl"
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
            }}
            dir="ltr"
          />
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address" className="text-foreground font-medium">כתובת</Label>
          <Input
            id="address"
            name="address"
            type="text"
            placeholder="רחוב הראשי 1, תל אביב"
            value={data.address}
            onChange={handleChange}
            className="h-12 bg-[#1a1a1a] border-[#333] focus:border-primary focus:ring-primary/20 rounded-xl"
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
            }}
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="orderEmail" className="text-foreground font-medium">
            אימייל לקבלת הזמנות ותגובות <span className="text-red-500">*</span>
          </Label>
          <Input
            id="orderEmail"
            name="orderEmail"
            type="email"
            placeholder="orders@mybusiness.com"
            value={data.orderEmail}
            onChange={handleChange}
            className="h-12 bg-[#1a1a1a] border-[#333] focus:border-primary focus:ring-primary/20 rounded-xl"
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
            }}
            dir="ltr"
            required
          />
          <p className="text-xs text-muted-foreground">
            לכאן ישלחו ההזמנות והודעות מלקוחות
          </p>
        </div>

        {/* Business Hours */}
        <div className="space-y-2">
          <Label htmlFor="businessHours" className="text-foreground font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            שעות פעילות
          </Label>
          <BusinessHoursPicker
            value={data.businessHours}
            onChange={(v) => updateData({ businessHours: v })}
          />
        </div>

        {/* Religious Audience Question */}
        <div className="space-y-3">
          <Label className="text-foreground font-medium text-lg">קהל יעד</Label>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">האם האתר מיועד לקהל שומרי מסורת?</p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant={data.isReligiousAudience ? "default" : "outline"}
                onClick={() => updateData({ isReligiousAudience: true })}
                className="flex-1 h-12"
              >
                כן
              </Button>
              <Button
                type="button"
                variant={!data.isReligiousAudience ? "default" : "outline"}
                onClick={() => updateData({ isReligiousAudience: false })}
                className="flex-1 h-12"
              >
                לא
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              מידע זה יעזור לנו להתאים את האתר לקהל היעד שלך
            </p>
          </div>
        </div>

        {/* Social Links */}
        <div className="space-y-3">
          <Label className="text-foreground font-medium">רשתות חברתיות</Label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Facebook */}
            <div className="relative">
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Facebook className="w-5 h-5 text-[#1877F2]" />
              </div>
              <Input
                type="url"
                placeholder="קישור לפייסבוק"
                value={data.socialLinks?.facebook || ""}
                onChange={(e) => handleSocialLinkChange('facebook', e.target.value)}
                className="h-12 pr-11 bg-[#1a1a1a] border-[#333] focus:border-primary focus:ring-primary/20 rounded-xl"
                style={{
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
                }}
                dir="ltr"
              />
            </div>

            {/* Instagram */}
            <div className="relative">
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Instagram className="w-5 h-5 text-[#E4405F]" />
              </div>
              <Input
                type="url"
                placeholder="קישור לאינסטגרם"
                value={data.socialLinks?.instagram || ""}
                onChange={(e) => handleSocialLinkChange('instagram', e.target.value)}
                className="h-12 pr-11 bg-[#1a1a1a] border-[#333] focus:border-primary focus:ring-primary/20 rounded-xl"
                style={{
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)'
                }}
                dir="ltr"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            הקישורים יופיעו בפוטר של האתר
          </p>
        </div>
      </div>

      {/* Navigation */}
      <StepNavigation
        onNext={onNext}
        onSaveAndContinue={onNext}
        onBack={onBack}
        nextLabel="הבא"
        saveLabel="שמרו והמשיכו"
        nextDisabled={!isValid}
        saveDisabled={!isValid}
        showPreview={true}
        showSave={true}
      />
    </div>
  );
};

export default StepBusinessDetails;
