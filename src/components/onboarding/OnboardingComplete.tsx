import { Button } from "@/components/ui/button";
import { OnboardingData } from "@/pages/Onboarding";
import { CheckCircle2, ExternalLink, Settings, ArrowLeft, MessageCircle, Facebook, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Confetti from "@/components/ui/confetti";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { gtm } from "@/lib/gtm";

interface OnboardingCompleteProps {
  // Optional: present when arriving fresh from the onboarding wizard. Absent when
  // arriving from a payment on an EXISTING store (e.g. renewing a lapsed
  // subscription) - in that case the business name/slug are fetched from the DB
  // below instead.
  data?: OnboardingData;
}

const HE_TO_LATIN: Record<string, string> = {
  'א':'a','ב':'b','ג':'g','ד':'d','ה':'h','ו':'v','ז':'z','ח':'h','ט':'t',
  'י':'y','כ':'k','ך':'k','ל':'l','מ':'m','ם':'m','נ':'n','ן':'n','ס':'s',
  'ע':'a','פ':'p','ף':'p','צ':'tz','ץ':'tz','ק':'k','ר':'r','ש':'sh','ת':'t',
};

function hebrewToSlug(name: string): string {
  return name
    .split('')
    .map(c => HE_TO_LATIN[c] ?? c)
    .join('')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 28);
}

const OnboardingComplete = ({ data }: OnboardingCompleteProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
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

  const businessName = data?.businessName || actualName || t("oc.business_fallback");
  const rawSlug = actualSlug || (data?.businessName ? hebrewToSlug(data.businessName) : "");
  const businessSlug = rawSlug || "my-store";

  // Use internal store route instead of external URL
  const storeUrl = `/${businessSlug}`;
  const displayUrl = `https://${import.meta.env.VITE_WEBSITE_URL}/${businessSlug}`;
  const shareText = `${t("oc.share_text")}\n${displayUrl}`;

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
          {t("oc.title")}
        </h1>
        <p className="text-muted-foreground mb-8">
          {t("oc.congrats_pre")} <span className="font-semibold text-foreground">{businessName}</span> {t("oc.congrats_post")}
        </p>

        {/* URL Card */}
        <div className="p-6 rounded-2xl bg-surface-1 border border-border mb-8">
          <p className="text-sm text-muted-foreground mb-2">{t("oc.url_label")}</p>
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
            {t("oc.view")}
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={handleManageSite}
          >
            <Settings className="w-4 h-4" />
            {t("oc.manage")}
          </Button>
        </div>

        {/* Share row — right after the CTA buttons, while excitement is peak */}
        <div className="mt-5 p-4 rounded-2xl border border-border bg-card">
          <p className="text-sm font-medium text-foreground mb-3">{t("oc.share_prompt")}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25d366] text-white font-semibold py-3 px-3 text-sm hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="w-4 h-4" /> {t("oc.whatsapp")}
            </button>
            <button
              onClick={handleShareFacebook}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1877f2] text-white font-semibold py-3 px-3 text-sm hover:opacity-90 transition-opacity"
            >
              <Facebook className="w-4 h-4" /> {t("oc.facebook")}
            </button>
            <button
              onClick={handleCopyLink}
              aria-label={t("oc.copy_aria")}
              className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl border border-border py-3 px-4 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Link2 className="w-4 h-4" /> {t("oc.copy")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingComplete;
