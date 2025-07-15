import { Stripe, StripeElements } from '@stripe/stripe-js';

// Stripe-related types for VisionBones
export interface StripeCustomer {
  id: string;
  email?: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionId?: string;
  currentPeriodEnd?: Date;
  currentPeriodStart?: Date;
  cancelAtPeriodEnd?: boolean;
}

export type SubscriptionStatus = 
  | 'active' 
  | 'inactive' 
  | 'past_due' 
  | 'canceled' 
  | 'unpaid' 
  | 'trialing'
  | 'incomplete'
  | 'incomplete_expired';

export interface PremiumSubscription {
  id: string;
  customerId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  priceId: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
}

export interface CheckoutSessionData {
  sessionId: string;
  customerId?: string;
  priceId: string;
  mode: 'subscription' | 'payment';
  successUrl: string;
  cancelUrl: string;
}

export interface StripeContextType {
  stripe: Stripe | null;
  elements: StripeElements | null;
  customer?: StripeCustomer;
  subscription?: PremiumSubscription;
  isLoading: boolean;
  error?: string;
}

// Payment method types
export interface PaymentMethodData {
  id: string;
  type: 'card';
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  isDefault: boolean;
}

// Billing history
export interface BillingHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  created: Date;
  invoiceUrl?: string;
  description: string;
}

// Premium feature flags
export interface PremiumFeatures {
  socialLinks: boolean;
  verifiedBadge: boolean;
  advancedAnalytics: boolean;
  profileCustomization: boolean;
  priorityUpdates: boolean;
  csvExport: boolean;
}

// Checkout component props
export interface CheckoutProps {
  userId: string;
  telegramId: string;
  onSuccess?: (sessionUrl: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

// Subscription management props
export interface SubscriptionManagementProps {
  customer: StripeCustomer;
  subscription?: PremiumSubscription;
  onSubscriptionUpdate?: (subscription: PremiumSubscription) => void;
  onSubscriptionCancel?: () => void;
}
