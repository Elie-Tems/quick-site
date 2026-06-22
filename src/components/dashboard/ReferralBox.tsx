import { useState } from "react";
import { Gift, Copy, Check, Share2, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useReferralStats, useCopyReferralLink } from "@/hooks/useReferrals";
import { toast } from "sonner";
import { motion } from "framer-motion";

const ReferralBox = () => {
  const { data: stats, isLoading } = useReferralStats();
  const copyLink = useCopyReferralLink();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (!stats?.referralCode) return;
    
    try {
      await copyLink.mutateAsync(stats.referralCode);
      setCopied(true);
      toast.success("הלינק הועתק! שתפו עם חברים 🎉");
      
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast.error("שגיאה בהעתקת הלינק");
    }
  };

  const handleShare = async () => {
    if (!stats?.referralCode) return;
    
    const baseUrl = window.location.origin;
    const referralLink = `${baseUrl}/register?ref=${stats.referralCode}`;
    const shareText = `הצטרפו לקוויקסייט וצרו את האתר המכירתי שלכם תוך 5 דקות! 🚀`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "הזמנה לקוויקסייט",
          text: shareText,
          url: referralLink,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      // Fallback to WhatsApp
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + "\n" + referralLink)}`;
      window.open(whatsappUrl, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4" />
        <div className="h-4 bg-muted rounded w-2/3 mb-4" />
        <div className="h-10 bg-muted rounded w-full" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/10 via-card to-card rounded-xl border border-primary/20 p-5 shadow-soft"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Gift className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-lg">
            🎁 רוצה חודש חינם?
          </h3>
        </div>
      </div>

      {/* Description */}
      <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
        כל עסק שמצטרף דרכך והופך למנוי משלם – נותן לך <span className="font-semibold text-foreground">חודש שימוש ללא עלות</span>.
      </p>

      {/* Stats - Show if user has referrals */}
      {stats && stats.totalReferrals > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-background/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs mb-1">
              <Users className="h-3.5 w-3.5" />
              <span>עסקים שהבאת</span>
            </div>
            <p className="text-xl font-bold text-foreground">{stats.totalReferrals}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs mb-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>חודשים שהרווחת</span>
            </div>
            <p className="text-xl font-bold text-primary">{stats.rewardedReferrals}</p>
          </div>
        </div>
      )}

      {stats && stats.rewardedReferrals > 0 && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3 mb-5">
          <p className="text-sm text-green-700 dark:text-green-300 text-center">
            🎉 הבאת כבר {stats.totalReferrals} עסקים – הרווחת {stats.rewardedReferrals} חודשי שימוש!
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button 
          onClick={handleCopyLink}
          className="flex-1 gap-2"
          variant={copied ? "default" : "default"}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              הועתק!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              🔗 העתק לינק שיתוף
            </>
          )}
        </Button>
        <Button 
          onClick={handleShare}
          variant="outline"
          className="gap-2"
        >
          <Share2 className="h-4 w-4" />
          שתף
        </Button>
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground text-center mt-4">
        אפשר לשתף בוואטסאפ, מייל או בכל מקום שתרצה.
      </p>
    </motion.div>
  );
};

export default ReferralBox;
