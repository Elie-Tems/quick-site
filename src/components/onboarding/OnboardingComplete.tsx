import { Button } from "@/components/ui/button";
import { OnboardingData } from "@/pages/Onboarding";
import { CheckCircle2, ExternalLink, Settings, ArrowLeft, MessageCircle, Facebook, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Confetti from "@/components/ui/confetti";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { gtm } from "@/lib/gtm";

interface OnboardingCompleteProps {
  // Optional: present when arriving fresh from the onboarding wizard. Absent when
  // arriving from a payment on an EXISTING store (e.g. renewing a lapsed
  // subscription) - in that case the business name/slug are fetched from the DB
  // below instead.
  data?: OnboardingData;
}

const OnboardingComplete = ({ data }: OnboardingCompleteProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [actualSlug, setActualSlug] = useState<string | null>(null);
  const [actualName, setActualName] = useState<string | null>(null);

  // Fetch actual slug/name from database and update user status to completed
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
      gtm.onboardingComplete();

      const { data: business } = await supabase
        .from('businesses')
        .select('slug, name')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (business?.slug) {
        setActualSlug(business.slug);
        setActualName(business.name ?? null);
      }

      // Clean up localStorage after successful onboarding
      localStorage.removeItem("onboarding_business");
      localStorage.removeItem("onboarding_email");
    }

    fetchBusinessSlugAndUpdateStatus();
  }, [user]);

  const businessName = data?.businessName || actualName || "\u05d4\u05e2\u05e1\u05e7 \u05e9\u05dc\u05da";
  const businessSlug = actualSlug || (data?.businessName
    ?.toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0590-\u05ffa-z0-9-]/g, "") ?? "");

  // Use internal store route instead of external URL
  const storeUrl = `/store/${businessSlug}`;
  const displayUrl = `https://${import.meta.env.VITE_WEBSITE_URL}/store/${businessSlug}`;
  const shareText = `\u05d4\u05d9\u05d9! \u05d4\u05d7\u05e0\u05d5\u05ea \u05e9\u05dc\u05d9 \u05e2\u05db\u05e9\u05d9\u05d5 \u05d1\u05d0\u05d5\u05d5\u05d9\u05e8 \ud83d\udecd\ufe0f\n\u05d0\u05e4\u05e9\u05e8 \u05dc\u05e8\u05d0\u05d5\u05ea \u05d5\u05dc\u05d4\u05d6\u05de\u05d9\u05df \u05db\u05d0\u05df:\n${displayUrl}`;

  const handleViewStore = () => {
    window.open(displayUrl, '_blank', 'noopener,noreferrer');
  };

  const handleManageSite = () => {
    // Use navigate instead of window.location to preserve react-query cache
    navigate('/dashboard?from_payment=true');
  };

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');
  };

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(displayUrl)}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(displayUrl);
    } catch {
      /* clipboard may be unavailable - the URL card below still shows the link */
    }
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
          מזל טוב! האתר של <span className="font-semibold text-foreground">{businessName}</span> מוכן לקבל לקוחות
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

        {/* Share row — right after the CTA buttons, while excitement is peak */}
        <div className="mt-5 p-4 rounded-2xl border border-border bg-card">
          <p className="text-sm font-medium text-foreground mb-3">שתפו את החנות עם הלקוחות הראשונים</p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25d366] text-white font-semibold py-3 px-3 text-sm hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="w-4 h-4" /> וואטסאפ
            </button>
            <button
              onClick={handleShareFacebook}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1877f2] text-white font-semibold py-3 px-3 text-sm hover:opacity-90 transition-opacity"
            >
              <Facebook className="w-4 h-4" /> פייסבוק
            </button>
            <button
              onClick={handleCopyLink}
              aria-label="העתקת קישור"
              className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border py-3 px-4 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Link2 className="w-4 h-4" /> העתק
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingComplete;
