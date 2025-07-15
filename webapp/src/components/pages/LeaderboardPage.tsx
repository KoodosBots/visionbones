import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

interface LeaderboardPageProps {
  userId: string
}

interface LeaderboardEntry {
  username: string
  platform_username: string
  selected_platform: string
  is_premium: boolean
  verified_badge: boolean
  social_links: any
  wins: number
  losses: number
  games_played: number
  win_rate: number
  last_updated: string
  rank: number
  platform_display_name?: string
  platform_rank?: number
}

interface Platform {
  id: string
  name: string
  display_name: string
}

const LeaderboardPage: React.FC<LeaderboardPageProps> = ({ userId }) => {
  const [view, setView] = useState<'overall' | 'platform'>('overall')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')

  // Fetch platforms for filter
  const { data: platforms } = useQuery({
    queryKey: ['platforms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .eq('is_active', true)
        .order('display_name')
      
      if (error) throw error
      return data as Platform[]
    }
  })

  // Fetch leaderboard data
  const { data: leaderboard, isLoading, error } = useQuery({
    queryKey: ['leaderboard', view, selectedPlatform],
    queryFn: async () => {
      if (view === 'overall') {
        const { data, error } = await supabase
          .from('leaderboard_overall')
          .select('*')
          .limit(100)
        
        if (error) throw error
        return data as LeaderboardEntry[]
      } else {
        const { data, error } = await supabase
          .from('leaderboard_by_platform')
          .select('*')
          .eq(selectedPlatform !== 'all' ? 'selected_platform' : 'selected_platform', 
              selectedPlatform !== 'all' ? selectedPlatform : undefined)
          .limit(100)
        
        if (error) throw error
        return data as LeaderboardEntry[]
      }
    }
  })

  const getRankDisplay = (entry: LeaderboardEntry) => {
    if (view === 'platform' && entry.platform_rank) {
      return entry.platform_rank
    }
    return entry.rank
  }

  const formatWinRate = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`
  }

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
    return `${Math.ceil(diffDays / 30)} months ago`
  }

  if (isLoading) {
    return (
      <div className="leaderboard-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="leaderboard-page">
        <div className="error-state">
          <h2>Unable to load leaderboard</h2>
          <p>Please try again later</p>
        </div>
      </div>
    )
  }

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <h1>🏆 Leaderboard</h1>
        <p>Compete with the best domino players</p>
      </div>

      <div className="leaderboard-controls">
        <div className="view-toggle">
          <button
            className={`toggle-btn ${view === 'overall' ? 'active' : ''}`}
            onClick={() => setView('overall')}
          >
            Overall
          </button>
          <button
            className={`toggle-btn ${view === 'platform' ? 'active' : ''}`}
            onClick={() => setView('platform')}
          >
            By Platform
          </button>
        </div>

        {view === 'platform' && platforms && (
          <div className="platform-filter">
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="platform-select"
            >
              <option value="all">All Platforms</option>
              {platforms.map((platform) => (
                <option key={platform.id} value={platform.name}>
                  {platform.display_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {leaderboard && leaderboard.length > 0 ? (
        <div className="leaderboard-list">
          {leaderboard.map((entry, index) => (
            <div key={`${entry.username}-${entry.selected_platform}`} className="leaderboard-entry">
              <div className="rank">
                <span className="rank-number">#{getRankDisplay(entry)}</span>
                {getRankDisplay(entry) <= 3 && (
                  <span className="rank-medal">
                    {getRankDisplay(entry) === 1 ? '🥇' : 
                     getRankDisplay(entry) === 2 ? '🥈' : '🥉'}
                  </span>
                )}
              </div>

              <div className="player-info">
                <div className="player-name">
                  <span className="username">
                    {entry.username}
                    {entry.verified_badge && <span className="verified-badge">✓</span>}
                    {entry.is_premium && <span className="premium-badge">👑</span>}
                  </span>
                  <span className="platform-username">
                    @{entry.platform_username}
                  </span>
                </div>
                
                <div className="platform-info">
                  <span className="platform-name">
                    {view === 'platform' && entry.platform_display_name 
                      ? entry.platform_display_name 
                      : entry.selected_platform}
                  </span>
                  <span className="last-updated">
                    Updated {formatLastUpdated(entry.last_updated)}
                  </span>
                </div>

                {entry.is_premium && entry.social_links && Object.keys(entry.social_links).length > 0 && (
                  <div className="social-links">
                    {entry.social_links.twitter && (
                      <a href={`https://twitter.com/${entry.social_links.twitter}`} 
                         target="_blank" rel="noopener noreferrer" className="social-link">
                        🐦
                      </a>
                    )}
                    {entry.social_links.instagram && (
                      <a href={`https://instagram.com/${entry.social_links.instagram}`} 
                         target="_blank" rel="noopener noreferrer" className="social-link">
                        📷
                      </a>
                    )}
                    {entry.social_links.tiktok && (
                      <a href={`https://tiktok.com/@${entry.social_links.tiktok}`} 
                         target="_blank" rel="noopener noreferrer" className="social-link">
                        🎵
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="player-stats">
                <div className="stat-group">
                  <span className="stat-label">Win Rate</span>
                  <span className="stat-value win-rate">{formatWinRate(entry.win_rate)}</span>
                </div>
                <div className="stat-group">
                  <span className="stat-label">Record</span>
                  <span className="stat-value record">{entry.wins}W - {entry.losses}L</span>
                </div>
                <div className="stat-group">
                  <span className="stat-label">Games</span>
                  <span className="stat-value games">{entry.games_played}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No stats available yet</h2>
          <p>Be the first to get your domino stats verified!</p>
        </div>
      )}

      <div className="leaderboard-footer">
        <p className="text-center">
          <small>
            🔄 Stats are manually verified by admins<br/>
            👑 Premium users get verified badges and social links
          </small>
        </p>
      </div>
    </div>
  )
}

export default LeaderboardPage