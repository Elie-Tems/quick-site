import { Button } from "@/components/ui/button";
import { OnboardingData } from "@/pages/Onboarding";
import { CheckCircle2, ExternalLink, Settings, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Confetti from "@/components/ui/confetti";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ReferralBox from "@/components/dashboard/ReferralBox";

interface OnboardingCompleteProps {
  data: OnboardingData;
}

const OnboardingComplete = ({ data }: OnboardingCompleteProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [actualSlug, setActualSlug] = useState<string | null>(null);
  
  // Fetch actual slug from database and update user status to completed
  useEffect(() => {
    async function fetchBusinessSlugAndUpdateStatus() {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (!profile) return;
      
      // Update user status to onboarding_completed
      await supabase
        .from('profiles')
        .update({ 
          status: 'onboarding_completed',
          onboarding_completed_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      const { data: business } = await supabase
        .from('businesses')
        .select('slug')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (business?.slug) {
        setActualSlug(business.slug);
      }
      
      // Clean up localStorage after successful onboarding
      localStorage.removeItem("onboarding_business");
      localStorage.removeItem("onboarding_email");
    }
    
    fetchBusinessSlugAndUpdateStatus();
  }, [user]);
  
  const businessSlug = actualSlug || data.businessName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0590-\u05ffa-z0-9-]/g, "");
  
  // Use internal store route instead of external URL
  const storeUrl = `/store/${businessSlug}`;
  const displayUrl = `https://${import.meta.env.VITE_WEBSITE_URL}/store/${businessSlug}`;

  const handleViewStore = () => {
    window.open(displayUrl, '_blank', 'noopener,noreferrer');
  };

  const handleManageSite = () => {
    // Use navigate instead of window.location to preserve react-query cache
    navigate('/dashboard?from_payment=true');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Confetti />
      
      <div className="max-w-md w-full text-center">
        {/* Success icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-[hsl(280_60%_50%)] flex items-center justify-center mx-auto shadow-glow">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <div className="absolute inset-0 w-24 h-24 rounded-full bg-primary/20 animate-ping mx-auto" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-foreground mb-3">
          האתר שלך באוויר! 🎉
        </h1>
        <p className="text-muted-foreground mb-8">
          מזל טוב! האתר של <span className="font-semibold text-foreground">{data.businessName}</span> מוכן לקבל לקוחות
        </p>

        {/* URL Card */}
        <div className="p-6 rounded-2xl bg-surface-1 border border-border mb-8">
          <p className="text-sm text-muted-foreground mb-2">כתובת האתר שלך</p>
          <button 
            onClick={handleViewStore}
            className="text-primary font-medium hover:underline break-all"
            dir="ltr"
          >
            {displayUrl}
          </button>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <Button
            variant="hero"
            size="xl"
            className="w-full"
            onClick={handleViewStore}
          >
            <ExternalLink className="w-4 h-4" />
            צפה באתר שלך
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleManageSite}
          >
            <Settings className="w-4 h-4" />
            ניהול האתר
          </Button>
        </div>

        {/* Next steps */}
        <div className="mt-12 p-6 rounded-xl bg-card border border-border text-right">
          <h3 className="font-semibold text-foreground mb-4">מה עכשיו?</h3>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>שתף את הלינק עם לקוחות ברשתות החברתיות</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>הוסף עוד מוצרים דרך לוח הניהול</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>חבר דומיין מותאם אישית</span>
            </li>
          </ul>
        </div>

        {/* Referral - peak excitement moment to ask for a share */}
        <div className="mt-6">
          <ReferralBox />
        </div>
      </div>
    </div>
  );
};

export default OnboardingComplete;
