
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UsePremiumReturn {
  isPremium: boolean;
  premiumExpiry?: number;
  daysUntilExpiry?: number;
  hasActiveSubscription: boolean;
  subscriptionStatus?: string;
  isLoading: boolean;
  checkFeatureAccess: (feature: string) => boolean;
  upgradeRequired: boolean;
}

interface PremiumStatus {
  isPremium: boolean;
  premiumExpiry?: number;
  daysUntilExpiry?: number;
  hasActiveSubscription: boolean;
  subscriptionStatus?: string;
}

export const usePremium = (userId?: string): UsePremiumReturn => {
  const [premiumStatus, setPremiumStatus] = useState<PremiumStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchPremiumStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('is_premium, premium_expiry')
          .eq('id', userId)
          .single();

        if (userError) {
          throw new Error(`Failed to fetch user data: ${userError.message}`);
        }

        if (!userData) {
          throw new Error('User not found');
        }

        const now = new Date();
        const premiumExpiry = userData.premium_expiry ? new Date(userData.premium_expiry) : null;
        const isPremiumActive = userData.is_premium && (!premiumExpiry || premiumExpiry > now);
        
        let daysUntilExpiry: number | undefined;
        if (premiumExpiry && isPremiumActive) {
          const timeDiff = premiumExpiry.getTime() - now.getTime();
          daysUntilExpiry = Math.ceil(timeDiff / (1000 * 3600 * 24));
        }

        const status: PremiumStatus = {
          isPremium: isPremiumActive,
          premiumExpiry: premiumExpiry?.getTime(),
          daysUntilExpiry,
          hasActiveSubscription: isPremiumActive,
          subscriptionStatus: isPremiumActive ? 'active' : 'inactive'
        };

        setPremiumStatus(status);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setPremiumStatus({
          isPremium: false,
          hasActiveSubscription: false,
          subscriptionStatus: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPremiumStatus();
  }, [userId]);

  const checkFeatureAccess = (feature: string): boolean => {
    if (!premiumStatus) return false;
    
    const premiumFeatures = [
      "socialLinks",
      "verifiedBadge", 
      "advancedAnalytics",
      "profileCustomization",
      "priorityStatUpdates",
      "exportStats",
      "customBadges",
      "profileColors",
    ];

    return premiumFeatures.includes(feature) ? premiumStatus.isPremium : true;
  };

  return {
    isPremium: premiumStatus?.isPremium || false,
    premiumExpiry: premiumStatus?.premiumExpiry,
    daysUntilExpiry: premiumStatus?.daysUntilExpiry || undefined,
    hasActiveSubscription: premiumStatus?.hasActiveSubscription || false,
    subscriptionStatus: premiumStatus?.subscriptionStatus,
    isLoading,
    checkFeatureAccess,
    upgradeRequired: !premiumStatus?.isPremium,
  };
};

export default usePremium;
