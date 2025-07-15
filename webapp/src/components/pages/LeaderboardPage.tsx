import React, { useState } from 'react'
import { useLeaderboard, usePlatforms, LeaderboardUser } from '../../hooks/useQueries'

type TimeframeType = 'all' | 'week' | 'month'

interface LeaderboardPageProps {
  userId?: string;
}

const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ userId }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframeType>('all')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('')
  const [verifiedOnly, setVerifiedOnly] = useState(false)

  // Fetch leaderboard data using React Query
  const { 
    data: leaderboardData = [], 
    isLoading: isLeaderboardLoading, 
    error: leaderboardError 
  } = useLeaderboard({
    timeframe: selectedTimeframe,
    platform: selectedPlatform || undefined,
    limit: 50
  })

  // Fetch platforms for filtering
  const { data: platforms = [] } = usePlatforms()

  // Filter data based on verification status if needed
  const filteredUsers = verifiedOnly 
    ? leaderboardData.filter(user => user.verified_badge)
    : leaderboardData

  // Loading state
  if (isLeaderboardLoading) {
    return (
      <div className="leaderboard-page">
        <div className="page-header">
          <h1 className="page-title">Leaderboard</h1>
          <p className="page-subtitle">Top domino players across all platforms</p>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (leaderboardError) {
    return (
      <div className="leaderboard-page">
        <div className="page-header">
          <h1 className="page-title">Leaderboard</h1>
          <p className="page-subtitle">Top domino players across all platforms</p>
        </div>
        <div className="error-state">
          <p>Error loading leaderboard: {leaderboardError.message}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="leaderboard-page">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Leaderboard</h1>
        <p className="page-subtitle">Top domino players across all platforms</p>
      </div>

      {/* Filter/Sort Section */}
      <div className="filter-section">
        <div className="filter-pills">
          <button 
            className={`filter-pill ${selectedTimeframe === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedTimeframe('all')}
          >
            All Time
          </button>
          <button 
            className={`filter-pill ${selectedTimeframe === 'week' ? 'active' : ''}`}
            onClick={() => setSelectedTimeframe('week')}
          >
            This Week
          </button>
          <button 
            className={`filter-pill ${selectedTimeframe === 'month' ? 'active' : ''}`}
            onClick={() => setSelectedTimeframe('month')}
          >
            This Month
          </button>
          {platforms.length > 0 && (
            <select 
              className="filter-select"
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
            >
              <option value="">All Platforms</option>
              {platforms.map(platform => (
                <option key={platform.id} value={platform.name}>
                  {platform.name}
                </option>
              ))}
            </select>
          )}
          <button 
            className={`filter-pill ${verifiedOnly ? 'active' : ''}`}
            onClick={() => setVerifiedOnly(!verifiedOnly)}
          >
            Verified Only
          </button>
        </div>
      </div>

      {/* Instagram-style User List */}
      <div className="user-list">
        {filteredUsers.length === 0 ? (
          <div className="empty-state">
            <p>No players found for the selected filters.</p>
            <button onClick={() => {
              setSelectedTimeframe('all')
              setSelectedPlatform('')
              setVerifiedOnly(false)
            }}>
              Reset Filters
            </button>
          </div>
        ) : (
          filteredUsers.map((user, index) => (
            <div key={user.id} className="user-row">
              {/* Rank */}
              <div className="rank-section">
                {user.rank === 1 && <span className="rank-medal gold">🥇</span>}
                {user.rank === 2 && <span className="rank-medal silver">🥈</span>}
                {user.rank === 3 && <span className="rank-medal bronze">🥉</span>}
                {user.rank > 3 && <span className="rank-number">#{user.rank}</span>}
              </div>

              {/* User Avatar */}
              <div className="user-avatar">
                <div className="avatar-circle">
                  <span className="avatar-initial">
                    {user.username.charAt(0)}
                  </span>
                </div>
                {user.verified_badge && (
                  <div className="verified-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#0095f6">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="user-info">
                <div className="username">{user.username}</div>
                <div className="platform">{user.stats.platform}</div>
              </div>

              {/* Stats */}
              <div className="user-stats">
                <div className="win-rate">{(user.stats.win_rate * 100).toFixed(1)}%</div>
                <div className="record">{user.stats.wins}W - {user.stats.losses}L</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More Button - Could be enhanced with infinite query */}
      {filteredUsers.length > 0 && filteredUsers.length >= 50 && (
        <div className="load-more-section">
          <button className="load-more-btn">
            Load More
          </button>
        </div>
      )}
    </div>
  )
}

export default LeaderboardPage