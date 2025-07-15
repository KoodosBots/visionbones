import React, { useState } from 'react';
import { getPremiumPriceDisplay } from '../../utils/stripe';
import { CheckoutProps } from '../../types/stripe';

const PremiumCheckout: React.FC<CheckoutProps> = ({
  userId,
  telegramId,
  onSuccess,
  onError,
  onCancel,
}) => {
  const createCheckoutSession = useMutation(api.checkout.createCheckoutSession);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    setIsLoading(true);
    setError('');

    try {
      const currentUrl = window.location.origin;
      const result = await createCheckoutSession({
        userId: userId as Id<"users">,
        telegramId: telegramId,
        successUrl: `${currentUrl}/premium/success`,
        cancelUrl: `${currentUrl}/premium`,
      });

      if (result.url) {
        window.location.href = result.url;
        if (onSuccess) {
          onSuccess(result.url);
        }
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Upgrade to Premium
        </h2>
        <div className="text-3xl font-bold text-blue-600 mb-1">
          {getPremiumPriceDisplay()}/month
        </div>
        <p className="text-gray-600">Unlock all premium features</p>
      </div>

      {/* Premium Features List */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Premium Features:</h3>
        <ul className="space-y-2">
          <li className="flex items-center text-sm text-gray-700">
            <span className="text-green-500 mr-2">✓</span>
            Social media links on profile
          </li>
          <li className="flex items-center text-sm text-gray-700">
            <span className="text-green-500 mr-2">✓</span>
            Verified badge
          </li>
          <li className="flex items-center text-sm text-gray-700">
            <span className="text-green-500 mr-2">✓</span>
            Advanced analytics & trends
          </li>
          <li className="flex items-center text-sm text-gray-700">
            <span className="text-green-500 mr-2">✓</span>
            Profile customization
          </li>
          <li className="flex items-center text-sm text-gray-700">
            <span className="text-green-500 mr-2">✓</span>
            Priority stat updates
          </li>
          <li className="flex items-center text-sm text-gray-700">
            <span className="text-green-500 mr-2">✓</span>
            Export stats to CSV
          </li>
        </ul>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            `Subscribe ${getPremiumPriceDisplay()}/month`
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 text-center mt-4">
        Cancel anytime. Secure payment powered by Stripe.
      </p>
    </div>
  );
};

export default PremiumCheckout;
