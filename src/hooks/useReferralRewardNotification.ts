import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const SHOWN_REWARDS_KEY = 'shown_referral_rewards';

export const useReferralRewardNotification = () => {
  const { user } = useAuth();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!user || hasChecked.current) return;
    hasChecked.current = true;

    const checkNewRewards = async () => {
      try {
        // Get rewards that were granted to this user as referrer
        const { data: rewards, error } = await supabase
          .from('referral_logs')
          .select('id, rewarded_at')
          .eq('referrer_user_id', user.id)
          .eq('reward_given', true)
          .not('rewarded_at', 'is', null);

        if (error || !rewards?.length) return;

        // Get previously shown rewards from localStorage
        const shownRewardsStr = localStorage.getItem(SHOWN_REWARDS_KEY);
        const shownRewards: string[] = shownRewardsStr ? JSON.parse(shownRewardsStr) : [];

        // Find new rewards that haven't been shown
        const newRewards = rewards.filter(r => !shownRewards.includes(r.id));

        if (newRewards.length > 0) {
          // Show toast for new rewards
          toast({
            title: "🎉 קיבלת תגמול!",
            description: newRewards.length === 1 
              ? "חבר שהזמנת הפך למנוי משלם - הרווחת חודש שימוש חינם!"
              : `${newRewards.length} חברים שהזמנת הפכו למנויים משלמים - הרווחת ${newRewards.length} חודשי שימוש חינם!`,
            duration: 8000,
          });

          // Mark these rewards as shown
          const updatedShownRewards = [...shownRewards, ...newRewards.map(r => r.id)];
          localStorage.setItem(SHOWN_REWARDS_KEY, JSON.stringify(updatedShownRewards));
        }
      } catch (error) {
        console.error('Error checking referral rewards:', error);
      }
    };

    checkNewRewards();
  }, [user]);

  // Also subscribe to realtime updates for new rewards
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('referral_rewards')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'referral_logs',
          filter: `referrer_user_id=eq.${user.id}`,
        },
        (payload) => {
          const newRecord = payload.new as { id: string; reward_given: boolean; rewarded_at: string | null };
          
          if (newRecord.reward_given && newRecord.rewarded_at) {
            const shownRewardsStr = localStorage.getItem(SHOWN_REWARDS_KEY);
            const shownRewards: string[] = shownRewardsStr ? JSON.parse(shownRewardsStr) : [];

            if (!shownRewards.includes(newRecord.id)) {
              toast({
                title: "🎉 קיבלת תגמול!",
                description: "חבר שהזמנת הפך למנוי משלם - הרווחת חודש שימוש חינם!",
                duration: 8000,
              });

              localStorage.setItem(
                SHOWN_REWARDS_KEY, 
                JSON.stringify([...shownRewards, newRecord.id])
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
};
