import { loadStripe, Stripe } from '@stripe/stripe-js';

// Stripe configuration
export const STRIPE_CONFIG = {
  // Premium subscription price in cents ($4.99)
  PREMIUM_PRICE: 499,
  PREMIUM_PRICE_ID: 'price_premium_monthly', // This will be set from Stripe dashboard
  CURRENCY: 'usd',
  BILLING_INTERVAL: 'month' as const,
} as const;

// Premium features configuration
export const PREMIUM_FEATURES = {
  socialLinks: true,
  verifiedBadge: true,
  advancedAnalytics: true,
  profileCustomization: true,
  priorityUpdates: true,
  csvExport: true,
} as const;

// Initialize Stripe
let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      console.error('Stripe publishable key is not configured');
      return Promise.resolve(null);
    }
    
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

// Subscription status types
export type SubscriptionStatus = 'active' | 'inactive' | 'past_due' | 'canceled' | 'unpaid';

// Stripe customer data interface
export interface StripeCustomer {
  id: string;
  email?: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionId?: string;
  currentPeriodEnd?: Date;
}

// Helper function to check if user has active premium subscription
export const hasActivePremium = (customer?: StripeCustomer): boolean => {
  if (!customer) return false;
  return customer.subscriptionStatus === 'active';
};

// Helper function to format price for display
export const formatPrice = (priceInCents: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(priceInCents / 100);
};

// Get formatted premium price
export const getPremiumPriceDisplay = (): string => {
  return formatPrice(STRIPE_CONFIG.PREMIUM_PRICE);
};
