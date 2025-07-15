import React, { ReactNode } from 'react';
import { usePremium } from '../../hooks/usePremium';
import { getPremiumPriceDisplay } from '../../utils/stripe';

interface PremiumGateProps {
  children: ReactNode;
  userId: string;
  feature?: string;
  fallback?: ReactNode;
  showUpgrade?: boolean;
}

const PremiumGate: React.FC<PremiumGateProps> = ({
  children,
  userId,
  feature = 'premium feature',
  fallback,
  showUpgrade = true,
}) => {
  const { isPremium, isLoading, checkFeatureAccess } = usePremium(userId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isPremium) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgrade) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-dashed border-blue-300 rounded-lg p-6 text-center">
      <div className="mb-4">
        <div className="text-blue-600 text-2xl mb-2">🔒</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Premium Feature
        </h3>
        <p className="text-gray-600 mb-4">
          Upgrade to Premium to access {feature} and unlock all advanced features.
        </p>
      </div>
      
      <div className="space-y-3">
        <div className="text-2xl font-bold text-blue-600">
          {getPremiumPriceDisplay()}/month
        </div>
        
        <div className="text-sm text-gray-600 space-y-1">
          <div>✓ Social media links</div>
          <div>✓ Verified badge</div>
          <div>✓ Advanced analytics</div>
          <div>✓ Priority updates</div>
        </div>
        
        <button
          onClick={() => {
            // Navigate to premium page
            window.location.href = '/premium';
          }}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Upgrade to Premium
        </button>
      </div>
    </div>
  );
};

export default PremiumGate;
