import React from 'react';
import { useLeaderboard, useStatsSummary } from '../../hooks/useQueries';

/**
 * Test component to demonstrate React Query integration
 * This component shows how to use React Query hooks with Supabase
 */
const ReactQueryTest: React.FC = () => {
  // Test leaderboard query
  const { 
    data: leaderboardData, 
    isLoading: isLeaderboardLoading, 
    error: leaderboardError 
  } = useLeaderboard({ limit: 5 });

  // Test stats summary query
  const { 
    data: statsData, 
    isLoading: isStatsLoading, 
    error: statsError 
  } = useStatsSummary();

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px', borderRadius: '8px' }}>
      <h2>React Query Integration Test</h2>
      
      {/* Leaderboard Test */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Leaderboard Query Test</h3>
        {isLeaderboardLoading && <p>Loading leaderboard...</p>}
        {leaderboardError && <p>Error: {leaderboardError.message}</p>}
        {leaderboardData && (
          <div>
            <p>✅ Successfully loaded {leaderboardData.length} users</p>
            <ul>
              {leaderboardData.slice(0, 3).map(user => (
                <li key={user.id}>
                  {user.username} - {(user.stats.win_rate * 100).toFixed(1)}% win rate
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Stats Summary Test */}
      <div>
        <h3>Stats Summary Query Test</h3>
        {isStatsLoading && <p>Loading stats...</p>}
        {statsError && <p>Error: {statsError.message}</p>}
        {statsData && (
          <div>
            <p>✅ Successfully loaded stats summary</p>
            <ul>
              <li>Total Users: {statsData.totalUsers}</li>
              <li>Total Games: {statsData.totalGames}</li>
              <li>Average Win Rate: {(statsData.averageWinRate * 100).toFixed(1)}%</li>
            </ul>
          </div>
        )}
      </div>

      {/* React Query DevTools info */}
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        <p><strong>React Query DevTools:</strong> Available in development mode (F12 → React Query tab)</p>
        <p><strong>Cache Management:</strong> Automatic background refetching, stale-while-revalidate pattern</p>
        <p><strong>Real-time Updates:</strong> Supabase subscriptions integrated with React Query cache</p>
      </div>
    </div>
  );
};

export default ReactQueryTest;