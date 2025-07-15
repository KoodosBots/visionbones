import React, { useState } from 'react';
import { usePremium } from '../../hooks/usePremium';
import { useUpdateUser } from '../../hooks/useQueries';
import '../../instagram-components.css';

interface SubscriptionData {
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  currentPeriodEnd: Date;
  planName: string;
  amount: number;
  cancelAtPeriodEnd: boolean;
}

interface SubscriptionManagerProps {
  userId: string;
  subscription?: SubscriptionData | null;
  onCancelSubscription?: () => void;
  onReactivateSubscription?: () => void;
  onUpdatePaymentMethod?: () => void;
  onDownloadInvoices?: () => void;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  userId,
  subscription,
  onCancelSubscription,
  onReactivateSubscription,
  onUpdatePaymentMethod,
  onDownloadInvoices
}) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const { isPremium, premiumExpiry, daysUntilExpiry, isLoading } = usePremium(userId);
  const updateUserMutation = useUpdateUser();
  
  if (isLoading) {
    return (
      <div className="subscription-manager loading">
        <div className="loading-spinner"></div>
        <p>Loading subscription...</p>
      </div>
    );
  }
  
  // Create subscription data from premium status if not provided
  const subscriptionData = subscription || (isPremium ? {
    status: 'active' as const,
    currentPeriodEnd: premiumExpiry ? new Date(premiumExpiry) : new Date(),
    planName: 'VisionBones Premium',
    amount: 4.99,
    cancelAtPeriodEnd: false
  } : null);

  if (!subscriptionData) {
    return (
      <div className="subscription-manager no-subscription">
        <div className="no-sub-header">
          <span className="no-sub-icon">👑</span>
          <h3>No Premium Subscription</h3>
          <p>You don't have an active premium subscription</p>
        </div>
        <div className="no-sub-benefits">
          <h4>Premium Benefits Include:</h4>
          <ul>
            <li>🔗 Social media links</li>
            <li>✓ Verified badge</li>
            <li>📊 Advanced analytics</li>
            <li>🎨 Profile customization</li>
            <li>⚡ Priority updates</li>
            <li>📋 Export data as CSV</li>
          </ul>
        </div>
      </div>
    );
  }

  const getStatusDisplay = () => {
    switch (subscriptionData.status) {
      case 'active':
        return {
          text: 'Active',
          icon: '✅',
          color: 'var(--instagram-green)'
        };
      case 'trialing':
        return {
          text: 'Free Trial',
          icon: '🎁',
          color: 'var(--instagram-blue)'
        };
      case 'cancelled':
        return {
          text: 'Cancelled',
          icon: '❌',
          color: 'var(--instagram-red)'
        };
      case 'past_due':
        return {
          text: 'Payment Failed',
          icon: '⚠️',
          color: 'var(--instagram-orange)'
        };
      default:
        return {
          text: 'Unknown',
          icon: '❓',
          color: 'var(--instagram-text-secondary)'
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const renewalDate = subscriptionData.currentPeriodEnd.toLocaleDateString();

  return (
    <div className="subscription-manager">
      {/* Subscription Status */}
      <div className="subscription-status-card">
        <div className="sub-status-header">
          <div className="sub-status-info">
            <span 
              className="sub-status-icon"
              style={{ color: statusDisplay.color }}
            >
              {statusDisplay.icon}
            </span>
            <div>
              <h3>Premium Subscription</h3>
              <span 
                className="sub-status-text"
                style={{ color: statusDisplay.color }}
              >
                {statusDisplay.text}
              </span>
            </div>
          </div>
          <div className="sub-price">
            <span className="price-amount">${subscriptionData.amount}</span>
            <span className="price-period">/month</span>
          </div>
        </div>

        <div className="sub-details">
          <div className="sub-detail-item">
            <span className="detail-label">Next billing date:</span>
            <span className="detail-value">{renewalDate}</span>
          </div>
          <div className="sub-detail-item">
            <span className="detail-label">Plan:</span>
            <span className="detail-value">{subscriptionData.planName}</span>
          </div>
          {subscriptionData.cancelAtPeriodEnd && (
            <div className="sub-detail-item cancellation-notice">
              <span className="detail-label">⚠️ Cancellation:</span>
              <span className="detail-value">Ends on {renewalDate}</span>
            </div>
          )}
        </div>
      </div>

      {/* Premium Features Status */}
      <div className="premium-features-status">
        <h4>Active Premium Features</h4>
        <div className="features-status-grid">
          <div className="feature-status-item active">
            <span className="feature-icon">🔗</span>
            <span>Social Links</span>
            <span className="feature-check">✓</span>
          </div>
          <div className="feature-status-item active">
            <span className="feature-icon">✓</span>
            <span>Verified Badge</span>
            <span className="feature-check">✓</span>
          </div>
          <div className="feature-status-item active">
            <span className="feature-icon">📊</span>
            <span>Analytics</span>
            <span className="feature-check">✓</span>
          </div>
          <div className="feature-status-item active">
            <span className="feature-icon">🎨</span>
            <span>Customization</span>
            <span className="feature-check">✓</span>
          </div>
          <div className="feature-status-item active">
            <span className="feature-icon">⚡</span>
            <span>Priority Updates</span>
            <span className="feature-check">✓</span>
          </div>
          <div className="feature-status-item active">
            <span className="feature-icon">📋</span>
            <span>Data Export</span>
            <span className="feature-check">✓</span>
          </div>
        </div>
      </div>

      {/* Management Actions */}
      <div className="subscription-actions">
        <h4>Manage Subscription</h4>
        
        <button 
          className="sub-action-button payment-method"
          onClick={onUpdatePaymentMethod}
        >
          <span className="action-icon">💳</span>
          <div className="action-content">
            <span className="action-title">Update Payment Method</span>
            <span className="action-desc">Change your card details</span>
          </div>
          <span className="action-arrow">›</span>
        </button>

        <button 
          className="sub-action-button download-invoices"
          onClick={onDownloadInvoices}
        >
          <span className="action-icon">📄</span>
          <div className="action-content">
            <span className="action-title">Download Invoices</span>
            <span className="action-desc">Get receipts for tax purposes</span>
          </div>
          <span className="action-arrow">›</span>
        </button>

        {!subscriptionData.cancelAtPeriodEnd ? (
          <button 
            className="sub-action-button cancel-subscription"
            onClick={() => setShowCancelConfirm(true)}
          >
            <span className="action-icon">❌</span>
            <div className="action-content">
              <span className="action-title">Cancel Subscription</span>
              <span className="action-desc">You'll keep premium until {renewalDate}</span>
            </div>
            <span className="action-arrow">›</span>
          </button>
        ) : (
          <button 
            className="sub-action-button reactivate-subscription"
            onClick={onReactivateSubscription}
          >
            <span className="action-icon">🔄</span>
            <div className="action-content">
              <span className="action-title">Reactivate Subscription</span>
              <span className="action-desc">Continue your premium membership</span>
            </div>
            <span className="action-arrow">›</span>
          </button>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="modal-overlay">
          <div className="modal-content cancel-confirm-modal">
            <div className="cancel-confirm-header">
              <span className="cancel-icon">😢</span>
              <h3>Cancel Premium?</h3>
              <p>You'll lose access to all premium features</p>
            </div>

            <div className="cancel-features-lost">
              <h4>What you'll lose:</h4>
              <ul>
                <li>🔗 Social media links</li>
                <li>✓ Verified badge</li>
                <li>📊 Advanced analytics</li>
                <li>🎨 Profile customization</li>
                <li>⚡ Priority stat updates</li>
                <li>📋 Data export</li>
              </ul>
            </div>

            <div className="cancel-confirm-actions">
              <button 
                className="cancel-confirm-button"
                onClick={() => {
                  onCancelSubscription();
                  setShowCancelConfirm(false);
                }}
              >
                Yes, Cancel
              </button>
              <button 
                className="cancel-keep-button"
                onClick={() => setShowCancelConfirm(false)}
              >
                Keep Premium
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager;
