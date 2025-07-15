import React from 'react';
import '../../instagram-components.css';

interface PaymentSuccessProps {
  onContinue: () => void;
  subscriptionDetails?: {
    planName: string;
    amount: number;
    nextBilling: Date;
  };
}

interface PaymentFailureProps {
  onRetry: () => void;
  onCancel: () => void;
  errorMessage?: string;
}

export const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ 
  onContinue, 
  subscriptionDetails 
}) => {
  return (
    <div className="payment-feedback payment-success">
      <div className="payment-success-content">
        {/* Success Animation */}
        <div className="success-animation">
          <div className="success-circle">
            <span className="success-checkmark">✓</span>
          </div>
        </div>

        {/* Success Message */}
        <div className="success-message">
          <h2>Welcome to Premium!</h2>
          <p>Your subscription has been activated successfully</p>
        </div>

        {/* Subscription Details */}
        {subscriptionDetails && (
          <div className="subscription-summary">
            <div className="summary-item">
              <span className="summary-label">Plan:</span>
              <span className="summary-value">{subscriptionDetails.planName}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Amount:</span>
              <span className="summary-value">${subscriptionDetails.amount}/month</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Next billing:</span>
              <span className="summary-value">
                {subscriptionDetails.nextBilling.toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {/* Premium Features Unlocked */}
        <div className="features-unlocked">
          <h3>🎉 Premium Features Unlocked!</h3>
          <div className="unlocked-features-grid">
            <div className="unlocked-feature">
              <span className="feature-icon">🔗</span>
              <span>Social Links</span>
            </div>
            <div className="unlocked-feature">
              <span className="feature-icon">✓</span>
              <span>Verified Badge</span>
            </div>
            <div className="unlocked-feature">
              <span className="feature-icon">📊</span>
              <span>Analytics</span>
            </div>
            <div className="unlocked-feature">
              <span className="feature-icon">🎨</span>
              <span>Customization</span>
            </div>
            <div className="unlocked-feature">
              <span className="feature-icon">⚡</span>
              <span>Priority Updates</span>
            </div>
            <div className="unlocked-feature">
              <span className="feature-icon">📋</span>
              <span>Data Export</span>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <button className="success-continue-button" onClick={onContinue}>
          <span className="continue-icon">🚀</span>
          Start Using Premium
        </button>

        {/* Receipt Notice */}
        <div className="receipt-notice">
          <span className="receipt-icon">📧</span>
          <span>Receipt sent to your email</span>
        </div>
      </div>
    </div>
  );
};

export const PaymentFailure: React.FC<PaymentFailureProps> = ({ 
  onRetry, 
  onCancel, 
  errorMessage 
}) => {
  const getErrorDisplay = () => {
    if (errorMessage?.includes('card_declined')) {
      return {
        icon: '💳',
        title: 'Card Declined',
        message: 'Your card was declined. Please try a different payment method.',
        suggestions: [
          'Check your card details are correct',
          'Try a different card',
          'Contact your bank'
        ]
      };
    } else if (errorMessage?.includes('insufficient_funds')) {
      return {
        icon: '💸',
        title: 'Insufficient Funds',
        message: 'Your card doesn\'t have enough funds for this purchase.',
        suggestions: [
          'Add funds to your account',
          'Try a different card',
          'Contact your bank'
        ]
      };
    } else if (errorMessage?.includes('expired_card')) {
      return {
        icon: '📅',
        title: 'Card Expired',
        message: 'Your card has expired. Please use a different card.',
        suggestions: [
          'Check the expiry date',
          'Use a different card',
          'Request a new card from your bank'
        ]
      };
    } else {
      return {
        icon: '❌',
        title: 'Payment Failed',
        message: 'We couldn\'t process your payment. Please try again.',
        suggestions: [
          'Check your internet connection',
          'Try again in a few minutes',
          'Contact support if the problem persists'
        ]
      };
    }
  };

  const errorDisplay = getErrorDisplay();

  return (
    <div className="payment-feedback payment-failure">
      <div className="payment-failure-content">
        {/* Failure Animation */}
        <div className="failure-animation">
          <div className="failure-circle">
            <span className="failure-icon">{errorDisplay.icon}</span>
          </div>
        </div>

        {/* Error Message */}
        <div className="failure-message">
          <h2>{errorDisplay.title}</h2>
          <p>{errorDisplay.message}</p>
        </div>

        {/* Error Details */}
        {errorMessage && (
          <div className="error-details">
            <details>
              <summary>Technical Details</summary>
              <code>{errorMessage}</code>
            </details>
          </div>
        )}

        {/* Suggestions */}
        <div className="failure-suggestions">
          <h3>What you can try:</h3>
          <ul>
            {errorDisplay.suggestions.map((suggestion, index) => (
              <li key={index}>
                <span className="suggestion-bullet">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="failure-actions">
          <button className="retry-payment-button" onClick={onRetry}>
            <span className="retry-icon">🔄</span>
            Try Again
          </button>
          <button className="cancel-payment-button" onClick={onCancel}>
            Cancel
          </button>
        </div>

        {/* Support Notice */}
        <div className="support-notice">
          <span className="support-icon">💬</span>
          <span>Need help? Contact our support team</span>
        </div>
      </div>
    </div>
  );
};

// Generic Payment Processing Component
interface PaymentProcessingProps {
  message?: string;
}

export const PaymentProcessing: React.FC<PaymentProcessingProps> = ({ 
  message = "Processing your payment..." 
}) => {
  return (
    <div className="payment-feedback payment-processing">
      <div className="payment-processing-content">
        {/* Processing Animation */}
        <div className="processing-animation">
          <div className="processing-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
        </div>

        {/* Processing Message */}
        <div className="processing-message">
          <h2>Almost there...</h2>
          <p>{message}</p>
        </div>

        {/* Security Notice */}
        <div className="security-notice">
          <div className="security-icons">
            <span className="security-icon">🔒</span>
            <span className="security-icon">💳</span>
          </div>
          <span>Secured by Stripe</span>
        </div>

        {/* Progress Indicator */}
        <div className="payment-progress">
          <div className="progress-bar">
            <div className="progress-fill processing"></div>
          </div>
          <span className="progress-text">Please don't close this window</span>
        </div>
      </div>
    </div>
  );
};

export default {
  PaymentSuccess,
  PaymentFailure,
  PaymentProcessing
};
