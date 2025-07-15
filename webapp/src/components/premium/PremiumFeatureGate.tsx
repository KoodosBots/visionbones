import React, { ReactNode } from 'react';
import '../../instagram-components.css';

interface PremiumFeatureGateProps {
  children: ReactNode;
  isPremium: boolean;
  featureName: string;
  fallbackComponent?: ReactNode;
  onUpgrade?: () => void;
  showUpgradePrompt?: boolean;
}

interface FeatureConfig {
  icon: string;
  title: string;
  description: string;
  category: 'profile' | 'analytics' | 'social' | 'data' | 'priority';
}

const PREMIUM_FEATURES: Record<string, FeatureConfig> = {
  socialLinks: {
    icon: '🔗',
    title: 'Social Links',
    description: 'Add Twitter, Instagram & TikTok links to your profile',
    category: 'social'
  },
  verifiedBadge: {
    icon: '✓',
    title: 'Verified Badge',
    description: 'Get the blue checkmark on your profile',
    category: 'profile'
  },
  savedVerses: {
    icon: '💾',
    title: 'Saved Verses',
    description: 'Save and organize your favorite verses',
    category: 'data'
  },
  prayerRequests: {
    icon: '🙏',
    title: 'Prayer Requests',
    description: 'Share prayer requests with community',
    category: 'social'
  },
  prayerReminders: {
    icon: '⏰',
    title: 'Prayer Reminders',
    description: 'Set daily prayer reminders',
    category: 'priority'
  },
  notes: {
    icon: '📝',
    title: 'Notes',
    description: 'Add personal notes to verses',
    category: 'data'
  },
  advancedAnalytics: {
    icon: '📊',
    title: 'Advanced Analytics',
    description: 'View detailed statistics and trends',
    category: 'analytics'
  },
  profileCustomization: {
    icon: '🎨',
    title: 'Profile Customization',
    description: 'Custom colors, badges, and themes',
    category: 'profile'
  },
  priorityUpdates: {
    icon: '⚡',
    title: 'Priority Updates',
    description: 'Get your stats updated faster',
    category: 'priority'
  },
  dataExport: {
    icon: '📋',
    title: 'Data Export',
    description: 'Download your stats as CSV files',
    category: 'data'
  }
};

const PremiumFeatureGate: React.FC<PremiumFeatureGateProps> = ({
  children,
  isPremium,
  featureName,
  fallbackComponent,
  onUpgrade,
  showUpgradePrompt = true
}) => {
  // If user has premium, show the feature
  if (isPremium) {
    return <>{children}</>;
  }

  // If custom fallback provided, show it
  if (fallbackComponent) {
    return <>{fallbackComponent}</>;
  }

  // If upgrade prompt is disabled, show nothing
  if (!showUpgradePrompt) {
    return null;
  }

  // Show upgrade prompt
  const feature = PREMIUM_FEATURES[featureName];
  
  if (!feature) {
    console.warn(`Unknown premium feature: ${featureName}`);
    return null;
  }

  return (
    <div className="premium-feature-gate">
      <div className="gate-content">
        <div className="gate-icon-wrapper">
          <span className="gate-icon">{feature.icon}</span>
          <span className="gate-crown">👑</span>
        </div>
        <div className="gate-text">
          <h3>{feature.title}</h3>
          <p>{feature.description}</p>
        </div>
        {onUpgrade && (
          <button className="gate-upgrade-button" onClick={onUpgrade}>
            <span className="upgrade-icon">✨</span>
            Upgrade to Premium
          </button>
        )}
      </div>
    </div>
  );
};

// Hook for checking premium features
export const usePremiumFeature = (featureName: string, isPremium: boolean) => {
  const hasFeature = isPremium;
  const feature = PREMIUM_FEATURES[featureName];
  
  return {
    hasFeature,
    feature,
    requiresUpgrade: !hasFeature
  };
};

// Component for inline premium badges
interface PremiumBadgeProps {
  featureName?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'crown' | 'star' | 'pro';
}

export const PremiumBadge: React.FC<PremiumBadgeProps> = ({
  featureName,
  size = 'medium',
  variant = 'crown'
}) => {
  const getIcon = () => {
    switch (variant) {
      case 'crown': return '👑';
      case 'star': return '⭐';
      case 'pro': return '💎';
      default: return '👑';
    }
  };

  return (
    <span className={`premium-badge ${size} ${variant}`}>
      <span className="badge-icon">{getIcon()}</span>
      {featureName && (
        <span className="badge-text">
          {PREMIUM_FEATURES[featureName]?.title || 'Premium'}
        </span>
      )}
    </span>
  );
};

// Component for premium feature lists
interface PremiumFeatureListProps {
  features: string[];
  variant?: 'compact' | 'detailed';
  showIcons?: boolean;
}

export const PremiumFeatureList: React.FC<PremiumFeatureListProps> = ({
  features,
  variant = 'detailed',
  showIcons = true
}) => {
  return (
    <div className={`premium-feature-list ${variant}`}>
      {features.map((featureName) => {
        const feature = PREMIUM_FEATURES[featureName];
        if (!feature) return null;

        return (
          <div key={featureName} className="feature-list-item">
            {showIcons && (
              <span className="feature-list-icon">{feature.icon}</span>
            )}
            <div className="feature-list-content">
              <span className="feature-list-title">{feature.title}</span>
              {variant === 'detailed' && (
                <span className="feature-list-description">
                  {feature.description}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Utility function to check if feature requires premium
export const isPremiumFeature = (featureName: string): boolean => {
  return featureName in PREMIUM_FEATURES;
};

// Utility function to get feature categories
export const getPremiumFeaturesByCategory = (category: string) => {
  return Object.entries(PREMIUM_FEATURES)
    .filter(([, feature]) => feature.category === category)
    .map(([name]) => name);
};

// Component for premium upgrade CTAs
interface PremiumUpgradeCtaProps {
  variant?: 'banner' | 'card' | 'inline';
  featureName?: string;
  onUpgrade: () => void;
}

export const PremiumUpgradeCta: React.FC<PremiumUpgradeCtaProps> = ({
  variant = 'card',
  featureName,
  onUpgrade
}) => {
  const feature = featureName ? PREMIUM_FEATURES[featureName] : null;

  if (variant === 'banner') {
    return (
      <div className="premium-upgrade-banner">
        <div className="upgrade-banner-content">
          <span className="upgrade-banner-icon">👑</span>
          <div className="upgrade-banner-text">
            <span className="banner-title">
              {feature ? `Unlock ${feature.title}` : 'Upgrade to Premium'}
            </span>
            <span className="banner-subtitle">
              {feature ? feature.description : 'Get access to all premium features'}
            </span>
          </div>
          <button className="upgrade-banner-button" onClick={onUpgrade}>
            Upgrade
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <button className="premium-upgrade-inline" onClick={onUpgrade}>
        <span className="inline-icon">✨</span>
        <span>Upgrade for {feature?.title || 'Premium'}</span>
      </button>
    );
  }

  // Default card variant
  return (
    <div className="premium-upgrade-card">
      <div className="upgrade-card-header">
        <span className="upgrade-card-icon">👑</span>
        <h3>Premium Required</h3>
      </div>
      <div className="upgrade-card-content">
        {feature ? (
          <>
            <div className="upgrade-feature">
              <span className="upgrade-feature-icon">{feature.icon}</span>
              <div>
                <h4>{feature.title}</h4>
                <p>{feature.description}</p>
              </div>
            </div>
          </>
        ) : (
          <p>This feature requires a premium subscription</p>
        )}
      </div>
      <button className="upgrade-card-button" onClick={onUpgrade}>
        <span className="upgrade-button-icon">✨</span>
        Upgrade to Premium
      </button>
    </div>
  );
};

export default PremiumFeatureGate;
