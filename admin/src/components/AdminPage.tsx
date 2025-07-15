import React, { useState } from 'react'
import { usePendingVerifications, useVerifyStats, useUpsertStats } from '../hooks/useQueries'
import { User, Stats } from '../hooks/useQueries'

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'users' | 'stats'>('pending')
  const [editingStats, setEditingStats] = useState<string | null>(null)
  const [statsForm, setStatsForm] = useState({ wins: 0, losses: 0 })
  
  // Queries
  const { 
    data: pendingVerifications, 
    isLoading: pendingLoading, 
    error: pendingError 
  } = usePendingVerifications()
  
  // Mutations
  const verifyStatsMutation = useVerifyStats()
  const upsertStatsMutation = useUpsertStats()
  
  // Loading state
  if (pendingLoading) {
    return (
      <div className="admin-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading admin panel...</p>
        </div>
      </div>
    )
  }
  
  // Error state
  if (pendingError) {
    return (
      <div className="admin-page">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Error loading admin panel</h3>
          <p>{pendingError.message}</p>
        </div>
      </div>
    )
  }
  
  const handleVerifyStats = async (statsId: string, status: 'verified' | 'disputed') => {
    try {
      await verifyStatsMutation.mutateAsync({
        statsId,
        verificationStatus: status
      })
    } catch (error) {
      console.error('Error verifying stats:', error)
    }
  }
  
  const handleUpdateStats = async (userId: string, stats: { wins: number; losses: number }) => {
    try {
      await upsertStatsMutation.mutateAsync({
        user_id: userId,
        wins: stats.wins,
        losses: stats.losses,
        verification_status: 'verified',
        updated_by: userId, // Should be admin user ID
        platform_id: 'domino-flyclops-id' // This should be fetched from platforms table
      } as any)
      setEditingStats(null)
      setStatsForm({ wins: 0, losses: 0 })
    } catch (error) {
      console.error('Error updating stats:', error)
    }
  }
  
  const startEditingStats = (user: User & { stats: Stats }) => {
    setEditingStats(user.id)
    setStatsForm({
      wins: user.stats.wins,
      losses: user.stats.losses
    })
  }
  
  return (
    <div className="admin-page">
      {/* Admin Header */}
      <div className="admin-header">
        <div className="admin-title">
          <h1>VisionBones Admin Panel</h1>
          <div className="admin-badge">
            <span className="badge-icon">👑</span>
            <span>Admin</span>
          </div>
        </div>
        
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-number">{pendingVerifications?.length || 0}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          <span className="tab-icon">⏳</span>
          Pending Verifications
          {pendingVerifications && pendingVerifications.length > 0 && (
            <span className="tab-badge">{pendingVerifications.length}</span>
          )}
        </button>
        <button 
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <span className="tab-icon">👥</span>
          Users
        </button>
        <button 
          className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <span className="tab-icon">📊</span>
          Stats
        </button>
      </div>
      
      {/* Tab Content */}
      <div className="admin-content">
        {activeTab === 'pending' && (
          <div className="pending-verifications">
            <div className="section-header">
              <h2>Pending Verifications</h2>
              <p>Review and verify user stats</p>
            </div>
            
            {pendingVerifications && pendingVerifications.length > 0 ? (
              <div className="verification-list">
                {pendingVerifications.map((user) => (
                  <div key={user.id} className="verification-card">
                    <div className="verification-header">
                      <div className="user-info">
                        <div className="user-avatar">
                          <span className="avatar-initial">
                            {user.username?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div className="user-details">
                          <h3 className="user-name">@{user.username}</h3>
                          <p className="user-platform">{user.selected_platform}</p>
                          <p className="platform-username">
                            Platform: @{user.platform_username}
                          </p>
                        </div>
                      </div>
                      <div className="verification-status">
                        <span className="status-badge pending">
                          <span className="status-icon">⏳</span>
                          Pending
                        </span>
                      </div>
                    </div>
                    
                    <div className="verification-stats">
                      {editingStats === user.id ? (
                        <div className="stats-edit-form">
                          <div className="form-group">
                            <label>Wins:</label>
                            <input
                              type="number"
                              value={statsForm.wins}
                              onChange={(e) => setStatsForm({
                                ...statsForm,
                                wins: parseInt(e.target.value) || 0
                              })}
                              className="stats-input"
                              min="0"
                            />
                          </div>
                          <div className="form-group">
                            <label>Losses:</label>
                            <input
                              type="number"
                              value={statsForm.losses}
                              onChange={(e) => setStatsForm({
                                ...statsForm,
                                losses: parseInt(e.target.value) || 0
                              })}
                              className="stats-input"
                              min="0"
                            />
                          </div>
                          <div className="form-actions">
                            <button 
                              className="save-btn"
                              onClick={() => handleUpdateStats(user.id, statsForm)}
                              disabled={upsertStatsMutation.isPending}
                            >
                              {upsertStatsMutation.isPending ? 'Saving...' : 'Save'}
                            </button>
                            <button 
                              className="cancel-btn"
                              onClick={() => setEditingStats(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="stats-display">
                          <div className="stat-item">
                            <span className="stat-label">Wins:</span>
                            <span className="stat-value">{user.stats.wins}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Losses:</span>
                            <span className="stat-value">{user.stats.losses}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Games:</span>
                            <span className="stat-value">{user.stats.games_played}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Win Rate:</span>
                            <span className="stat-value">
                              {Math.round(user.stats.win_rate * 100)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="verification-actions">
                      {editingStats !== user.id && (
                        <>
                          <button 
                            className="action-btn edit"
                            onClick={() => startEditingStats(user)}
                          >
                            <span className="btn-icon">✏️</span>
                            Edit Stats
                          </button>
                          <button 
                            className="action-btn verify"
                            onClick={() => handleVerifyStats(user.stats.id, 'verified')}
                            disabled={verifyStatsMutation.isPending}
                          >
                            <span className="btn-icon">✅</span>
                            Verify
                          </button>
                          <button 
                            className="action-btn dispute"
                            onClick={() => handleVerifyStats(user.stats.id, 'disputed')}
                            disabled={verifyStatsMutation.isPending}
                          >
                            <span className="btn-icon">❌</span>
                            Dispute
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">🎉</div>
                <h3>No pending verifications</h3>
                <p>All user stats are up to date!</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'users' && (
          <div className="users-management">
            <div className="section-header">
              <h2>User Management</h2>
              <p>Manage user accounts and settings</p>
            </div>
            
            <div className="coming-soon">
              <div className="coming-soon-icon">🚧</div>
              <h3>Coming Soon</h3>
              <p>User management features will be available in a future update.</p>
            </div>
          </div>
        )}
        
        {activeTab === 'stats' && (
          <div className="stats-management">
            <div className="section-header">
              <h2>Statistics Overview</h2>
              <p>View platform-wide statistics</p>
            </div>
            
            <div className="coming-soon">
              <div className="coming-soon-icon">📊</div>
              <h3>Coming Soon</h3>
              <p>Statistics dashboard will be available in a future update.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPage