import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  rewardedReferrals: number;
  totalMonthsEarned: number;
  paidUntil: string | null;
}

export interface ReferralLog {
  id: string;
  referredUserEmail: string;
  rewardGiven: boolean;
  createdAt: string;
  rewardedAt: string | null;
}

export const useReferralStats = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['referral-stats', user?.id],
    queryFn: async (): Promise<ReferralStats> => {
      if (!user) throw new Error('Not authenticated');
      
      // Get profile with referral code
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .single();
      
      if (profileError) throw profileError;
      
      // Get referral logs
      const { data: referralLogs, error: logsError } = await supabase
        .from('referral_logs')
        .select('*')
        .eq('referrer_user_id', user.id);
      
      if (logsError) throw logsError;
      
      // Get subscription (an account can own several sites/subscriptions - take the
      // most recent; .single() would throw on multiple rows).
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('paid_until')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      // Don't throw if no subscription - it's optional
      
      const rewardedReferrals = referralLogs?.filter(r => r.reward_given).length || 0;
      
      return {
        referralCode: profile?.referral_code || '',
        totalReferrals: referralLogs?.length || 0,
        rewardedReferrals,
        totalMonthsEarned: rewardedReferrals, // Each referral = 1 month
        paidUntil: subscription?.paid_until || null,
      };
    },
    enabled: !!user,
  });
};

export const useReferralLogs = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['referral-logs', user?.id],
    queryFn: async (): Promise<ReferralLog[]> => {
      if (!user) throw new Error('Not authenticated');
      
      // Get referral logs with referred user details
      const { data: logs, error } = await supabase
        .from('referral_logs')
        .select(`
          id,
          reward_given,
          created_at,
          rewarded_at,
          referred_user_id
        `)
        .eq('referrer_user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Get emails for referred users (we need to get them from profiles)
      const referredUserIds = logs?.map(l => l.referred_user_id) || [];
      
      if (referredUserIds.length === 0) return [];
      
      // This won't work with RLS, so we'll just show placeholder
      // In production, you'd use a server function or view
      return logs?.map(log => ({
        id: log.id,
        referredUserEmail: 'משתמש מופנה', // Placeholder due to RLS
        rewardGiven: log.reward_given,
        createdAt: log.created_at,
        rewardedAt: log.rewarded_at,
      })) || [];
    },
    enabled: !!user,
  });
};

export const useCopyReferralLink = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (referralCode: string) => {
      const baseUrl = window.location.origin;
      const referralLink = `${baseUrl}/register?ref=${referralCode}`;
      
      await navigator.clipboard.writeText(referralLink);
      
      return referralLink;
    },
  });
};
