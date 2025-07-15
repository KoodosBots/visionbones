import React, { useState } from 'react'
import { useUser, useStats, usePlatforms, useUpdateUser, useUpsertStats } from '../../hooks/useQueries'
import { usePremium } from '../../hooks/usePremium'
import PremiumGate from '../common/PremiumGate'
import PremiumFeatureGate from '../premium/PremiumFeatureGate'

interface ProfilePageProps {
  userId?: string;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ userId }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ username: '', platform_username: '', selected_platform: '' })
  
  // Fetch user data
  const { data: user, isLoading: userLoading, error: userError } = useUser(userId)
  const { data: stats, isLoading: statsLoading } = useStats(userId)
  const { data: platforms, isLoading: platformsLoading } = usePlatforms()
  const { isPremium, isLoading: premiumLoading } = usePremium(userId)
  
  // Mutations
  const updateUserMutation = useUpdateUser()
  const upsertStatsMutation = useUpsertStats()
  
  // Loading state
  if (userLoading || statsLoading || platformsLoading || premiumLoading) {
    return (
      <div className="profile-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }
  
  // Error state
  if (userError) {
    return (
      <div className="profile-page">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Error loading profile</h3>
          <p>{userError.message}</p>
        </div>
      </div>
    )
  }
  
  // No user state
  if (!user) {
    return (
      <div className="profile-page">
        <div className="no-user-state">
          <div className="no-user-icon">👤</div>
          <h3>User not found</h3>
          <p>The profile you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }
  
  // Calculate derived values
  const winRate = stats ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100) || 0 : 0
  const gamesPlayed = stats ? stats.games_played : 0
  const currentPlatform = platforms?.find(p => p.name === user.selected_platform)
  
  const handleEditProfile = () => {
    setEditData({
      username: user.username || '',
      platform_username: user.platform_username || '',
      selected_platform: user.selected_platform || ''
    })
    setIsEditing(true)
  }
  
  const handleSaveProfile = async () => {
    try {
      await updateUserMutation.mutateAsync({
        id: user.id,
        updates: {
          username: editData.username,
          platform_username: editData.platform_username,
          selected_platform: editData.selected_platform
        }
      })
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating profile:', error)
    }
  }
  
  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditData({ username: '', platform_username: '', selected_platform: '' })
  }

  return (
    <div className="profile-page">
      {/* Profile Header Section */}
      <div className="profile-header-section">
        <div className="profile-main-info">
          {/* Avatar */}
          <div className="profile-avatar-container">
            <div className="profile-avatar large">
              <span className="avatar-initial">
                {user.username?.charAt(0) || '?'}
              </span>
            </div>
            {isPremium && user.verified_badge && (
              <div className="profile-verified-badge">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#1DA1F2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
          </div>

          {/* User Info */}
          <div className="profile-info">
            {isEditing ? (
              <div className="profile-edit-form">
                <input
                  type="text"
                  value={editData.username}
                  onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                  placeholder="Username"
                  className="edit-input"
                />
                <select
                  value={editData.selected_platform}
                  onChange={(e) => setEditData({ ...editData, selected_platform: e.target.value })}
                  className="edit-select"
                >
                  <option value="">Select Platform</option>
                  {platforms?.map(platform => (
                    <option key={platform.id} value={platform.name}>{platform.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={editData.platform_username}
                  onChange={(e) => setEditData({ ...editData, platform_username: e.target.value })}
                  placeholder="Platform Username"
                  className="edit-input"
                />
              </div>
            ) : (
              <>
                <h1 className="profile-username">@{user.username}</h1>
                <p className="profile-platform">{user.selected_platform}</p>
                <div className="profile-rank">
                  <span className="rank-badge">#{stats?.rank || 'N/A'}</span>
                  <span className="rank-text">Global Rank</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons - Instagram Style */}
        <div className="profile-actions">
          {isEditing ? (
            <>
              <button 
                className="action-btn primary"
                onClick={handleSaveProfile}
                disabled={updateUserMutation.isPending}
              >
                {updateUserMutation.isPending ? 'Saving...' : 'Save'}
              </button>
              <button 
                className="action-btn secondary"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className="action-btn primary" onClick={handleEditProfile}>
                Edit Profile
              </button>
              {!isPremium && (
                <button 
                  className="action-btn secondary"
                  onClick={() => window.location.href = '/premium'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  Premium
                </button>
              )}
              <button className="action-btn icon-only">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="19" cy="12" r="1" />
                  <circle cx="5" cy="12" r="1" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Grid - Instagram Style */}
      <div className="stats-grid-section">
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-number">{gamesPlayed}</div>
            <div className="stat-label">games</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats?.wins || 0}</div>
            <div className="stat-label">wins</div>
          </div>
          <div className="stat-item">
            <div className="stat-number">{stats?.losses || 0}</div>
            <div className="stat-label">losses</div>
          </div>
        </div>
        
        {/* Win Rate Display */}
        <div className="win-rate-section">
          <div className="win-rate-container">
            <div className="win-rate-circle">
              <svg className="win-rate-progress" viewBox="0 0 36 36">
                <path
                  className="circle-bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="circle"
                  strokeDasharray={`${winRate}, 100`}
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="win-rate-text">
                <span className="win-rate-number">{winRate}%</span>
                <span className="win-rate-label">win rate</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity Section - Instagram Feed Style */}
      <div className="activity-section">
        <div className="section-header">
          <h2 className="section-title">Recent Activity</h2>
        </div>
        
        <div className="activity-feed">
          <div className="activity-item">
            <div className="activity-avatar">
              <div className="avatar-circle win">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="activity-content">
              <div className="activity-main">
                <span className="activity-text">
                  <strong>You</strong> won against <strong>@TilesMaster</strong>
                </span>
                <div className="activity-meta">
                  <span className="activity-time">2h</span>
                  <span className="activity-separator">•</span>
                  <span className="activity-platform">Domino! by Flyclops</span>
                </div>
              </div>
              <div className="activity-badge win">+1</div>
            </div>
          </div>

          <div className="activity-item">
            <div className="activity-avatar">
              <div className="avatar-circle loss">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <div className="activity-content">
              <div className="activity-main">
                <span className="activity-text">
                  <strong>You</strong> lost to <strong>@DominoKing</strong>
                </span>
                <div className="activity-meta">
                  <span className="activity-time">5h</span>
                  <span className="activity-separator">•</span>
                  <span className="activity-platform">Domino! by Flyclops</span>
                </div>
              </div>
              <div className="activity-badge loss">-1</div>
            </div>
          </div>

          <div className="activity-item">
            <div className="activity-avatar">
              <div className="avatar-circle rank">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </div>
            </div>
            <div className="activity-content">
              <div className="activity-main">
                <span className="activity-text">
                  <strong>Rank improved</strong> to #{stats?.rank || 'N/A'}
                </span>
                <div className="activity-meta">
                  <span className="activity-time">1d</span>
                  <span className="activity-separator">•</span>
                  <span className="activity-achievement">New personal best!</span>
                </div>
              </div>
              <div className="activity-badge rank">↑3</div>
            </div>
          </div>

          <div className="activity-item">
            <div className="activity-avatar">
              <div className="avatar-circle achievement">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
            </div>
            <div className="activity-content">
              <div className="activity-main">
                <span className="activity-text">
                  <strong>Achievement unlocked:</strong> 10 Win Streak
                </span>
                <div className="activity-meta">
                  <span className="activity-time">2d</span>
                  <span className="activity-separator">•</span>
                  <span className="activity-achievement">Keep it up!</span>
                </div>
              </div>
              <div className="activity-badge achievement">🔥</div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Section */}
      <div className="achievements-section">
        <div className="section-header">
          <h2 className="section-title">Achievements</h2>
          <button className="see-all-btn">See All</button>
        </div>
        
        <div className="achievements-grid">
          <div className="achievement-card earned">
            <div className="achievement-icon">🎯</div>
            <div className="achievement-name">First Victory</div>
          </div>
          <div className="achievement-card earned">
            <div className="achievement-icon">🔥</div>
            <div className="achievement-name">10 Win Streak</div>
          </div>
          <div className="achievement-card locked">
            <div className="achievement-icon">👑</div>
            <div className="achievement-name">Top 10</div>
          </div>
          <div className="achievement-card locked">
            <div className="achievement-icon">💎</div>
            <div className="achievement-name">100 Wins</div>
          </div>
        </div>
      </div>

      {/* Settings Section */}
      <div className="settings-section">
        <div className="section-header">
          <h2 className="section-title">Settings</h2>
        </div>
        
        <div className="settings-list">
          <PremiumFeatureGate
            isPremium={isPremium}
            featureName="socialLinks"
            showUpgradePrompt={false}
          >
            <button className="setting-item">
              <div className="setting-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="setting-content">
                <div className="setting-title">Social Links</div>
                <div className="setting-subtitle">Connect your social media</div>
              </div>
              <div className="setting-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </button>
          </PremiumFeatureGate>
          
          {!isPremium && (
            <PremiumGate userId={userId || ''} feature="social links" showUpgrade={false}>
              <div className="setting-item premium-locked">
                <div className="setting-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="setting-content">
                  <div className="setting-title">Social Links <span className="premium-badge">👑</span></div>
                  <div className="setting-subtitle">Connect your social media</div>
                </div>
              </div>
            </PremiumGate>
          )}

          <button className="setting-item">
            <div className="setting-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <div className="setting-content">
              <div className="setting-title">Notifications</div>
              <div className="setting-subtitle">Manage your alerts</div>
            </div>
            <div className="setting-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>

          <button className="setting-item">
            <div className="setting-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6" />
                <path d="M21 12h-6m-6 0H3" />
              </svg>
            </div>
            <div className="setting-content">
              <div className="setting-title">Privacy</div>
              <div className="setting-subtitle">Control your data</div>
            </div>
            <div className="setting-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage