import React, { useState } from 'react';
import '../../instagram-components.css';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}

const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, onSubscribe }) => {
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  if (!isOpen) return null;

  const premiumFeatures = [
    {
      icon: '🔗',
      title: 'Social Links',
      description: 'Add Twitter, Instagram & TikTok links to your profile'
    },
    {
      icon: '✓',
      title: 'Verified Badge',
      description: 'Get the blue checkmark on your profile'
    },
    {
      icon: '📊',
      title: 'Advanced Analytics',
      description: 'View trends, graphs, and detailed statistics'
    },
    {
      icon: '🎨',
      title: 'Profile Customization',
      description: 'Custom colors, badges, and profile themes'
    },
    {
      icon: '⚡',
      title: 'Priority Updates',
      description: 'Get your stats updated faster than free users'
    },
    {
      icon: '📋',
      title: 'Export Stats',
      description: 'Download your data as CSV files'
    }
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content premium-modal">
        {/* Header */}
        <div className="premium-modal-header">
          <button className="modal-close-button" onClick={onClose}>
            ✕
          </button>
          <div className="premium-modal-title">
            <span className="premium-crown">👑</span>
            <h2>VisionBones Premium</h2>
            <p>Elevate your domino game tracking</p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="premium-features-grid">
          {premiumFeatures.map((feature, index) => (
            <div key={index} className="premium-feature-card">
              <div className="premium-feature-icon">{feature.icon}</div>
              <div className="premium-feature-content">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="premium-pricing-section">
          <div className="premium-price-display">
            <span className="premium-price">$4.99</span>
            <span className="premium-period">/month</span>
          </div>
          <p className="premium-price-note">Cancel anytime • No hidden fees</p>
        </div>

        {/* Benefits Banner */}
        <div className="premium-benefits-banner">
          <div className="premium-benefit-item">
            <span className="benefit-icon">⭐</span>
            <span>Premium Features</span>
          </div>
          <div className="premium-benefit-item">
            <span className="benefit-icon">🚀</span>
            <span>Priority Support</span>
          </div>
          <div className="premium-benefit-item">
            <span className="benefit-icon">📈</span>
            <span>Advanced Stats</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="premium-modal-actions">
          <button 
            className="premium-subscribe-button"
            onClick={onSubscribe}
          >
            <span className="subscribe-icon">👑</span>
            Start Premium Trial
          </button>
          <button className="premium-cancel-button" onClick={onClose}>
            Maybe Later
          </button>
        </div>

        {/* Trust Indicators */}
        <div className="premium-trust-indicators">
          <div className="trust-item">
            <span className="trust-icon">🔒</span>
            <span>Secure Payment</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">💳</span>
            <span>Stripe Protected</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">⏰</span>
            <span>Cancel Anytime</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumModal;
