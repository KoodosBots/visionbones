import React, { useState } from 'react';
import PremiumCheckout from '../common/PremiumCheckout';
import { STRIPE_CONFIG } from '../../utils/stripe';
import { useTelegram } from '../../hooks/useTelegram';

const PremiumPage: React.FC = () => {
  const [showCheckout, setShowCheckout] = useState(false);
  const [userId] = useState('current-user-id'); // This would come from your auth system
  const { user: telegramUser } = useTelegram();

  const handleUpgradeClick = () => {
    setShowCheckout(true);
  };

  const handleCheckoutSuccess = (sessionId: string) => {
    console.log('Subscription successful:', sessionId);
    // Handle successful subscription
    // Redirect to profile or show success message
    setShowCheckout(false);
  };

  const handleCheckoutError = (error: string) => {
    console.error('Subscription error:', error);
    // Handle subscription error
  };

  const handleCheckoutCancel = () => {
    setShowCheckout(false);
  };

  if (showCheckout) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <PremiumCheckout
          userId={userId}
          telegramId={telegramUser?.id.toString() || ''}
          onSuccess={handleCheckoutSuccess}
          onError={handleCheckoutError}
          onCancel={handleCheckoutCancel}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Upgrade to VisionBones Premium
          </h1>
          <p className="text-xl text-gray-600">
            Unlock advanced features and take your domino game to the next level
          </p>
        </div>

        {/* Feature Comparison */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Free Tier */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Free</h3>
            <div className="text-3xl font-bold text-gray-600 mb-6">$0/month</div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <span className="text-green-500 mr-3">✓</span>
                Basic stat tracking
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-3">✓</span>
                View all leaderboards
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-3">✓</span>
                Bible verses & reading plans
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-3">✓</span>
                Basic profile
              </li>
            </ul>
          </div>

          {/* Premium Tier */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-blue-500 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                Most Popular
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Premium</h3>
            <div className="text-3xl font-bold text-blue-600 mb-6">$4.99/month</div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center">
                <span className="text-green-500 mr-3">✓</span>
                Everything in Free
              </li>
              <li className="flex items-center">
                <span className="text-blue-500 mr-3">✓</span>
                Social media links on profile
              </li>
              <li className="flex items-center">
                <span className="text-blue-500 mr-3">✓</span>
                Verified badge
              </li>
              <li className="flex items-center">
                <span className="text-blue-500 mr-3">✓</span>
                Advanced analytics & trends
              </li>
              <li className="flex items-center">
                <span className="text-blue-500 mr-3">✓</span>
                Profile customization
              </li>
              <li className="flex items-center">
                <span className="text-blue-500 mr-3">✓</span>
                Priority stat updates
              </li>
              <li className="flex items-center">
                <span className="text-blue-500 mr-3">✓</span>
                Export stats to CSV
              </li>
            </ul>
            <button
              onClick={handleUpgradeClick}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Upgrade to Premium
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Cancel anytime. No long-term contracts. Secure payment powered by Stripe.
          </p>
          <div className="flex justify-center items-center space-x-4 text-sm text-gray-500">
            <span>🔒 Secure</span>
            <span>💳 All major cards accepted</span>
            <span>🔄 Cancel anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumPage;
