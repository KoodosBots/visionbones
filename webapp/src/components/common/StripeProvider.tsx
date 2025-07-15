import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { Stripe, StripeElements } from '@stripe/stripe-js';
import { getStripe } from '../../utils/stripe';
import { StripeContextType, StripeCustomer, PremiumSubscription } from '../../types/stripe';

// Stripe Context
const StripeContext = createContext<StripeContextType | null>(null);

// Hook to use Stripe context
export const useStripe = (): StripeContextType => {
  const context = useContext(StripeContext);
  if (!context) {
    throw new Error('useStripe must be used within a StripeProvider');
  }
  return context;
};

interface StripeProviderProps {
  children: ReactNode;
}

// Stripe Provider component
export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [customer, setCustomer] = useState<StripeCustomer | undefined>();
  const [subscription, setSubscription] = useState<PremiumSubscription | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        setIsLoading(true);
        const stripeInstance = await getStripe();
        setStripe(stripeInstance);
        
        if (!stripeInstance) {
          setError('Failed to initialize Stripe. Please check your configuration.');
        }
      } catch (err) {
        setError('Failed to load Stripe');
        console.error('Stripe initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeStripe();
  }, []);

  // Stripe Elements options
  const stripeOptions = {
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0570de',
        colorBackground: '#ffffff',
        colorText: '#30313d',
        colorDanger: '#df1b41',
        borderRadius: '8px',
      },
    },
  };

  const contextValue: StripeContextType = {
    stripe,
    elements,
    customer,
    subscription,
    isLoading,
    error,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading payment system...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 mb-2">⚠️</div>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <StripeContext.Provider value={contextValue}>
      {stripe ? (
        <Elements stripe={stripe} options={stripeOptions}>
          {children}
        </Elements>
      ) : (
        children
      )}
    </StripeContext.Provider>
  );
};

export default StripeProvider;
