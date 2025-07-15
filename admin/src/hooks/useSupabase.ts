import { useState, useEffect, useCallback } from 'react';
import { supabase, Database } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// Type definitions
type User = Database['public']['Tables']['users']['Row'];
type Stats = Database['public']['Tables']['stats']['Row'];
type Platform = Database['public']['Tables']['platforms']['Row'];

export interface UserWithStats extends User {
  stats?: Stats;
}

export interface LeaderboardUser extends User {
  stats: Stats;
  rank: number;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

interface LeaderboardOptions extends PaginationOptions {
  platform?: string;
  timeframe?: 'week' | 'month' | 'all';
}

// Generic hook return type
interface UseSupabaseReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface UseSupabaseListReturn<T> extends UseSupabaseReturn<T[]> {
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

/**
 * Hook to fetch all users with pagination
 */
export const useUsers = (options: PaginationOptions = {}): UseSupabaseListReturn<User> => {
  const { page = 1, limit = 20 } = options;
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(page);

  const fetchUsers = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const from = reset ? 0 : (currentPage - 1) * limit;
      const to = from + limit - 1;

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (usersError) {
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }

      if (reset) {
        setData(users || []);
        setCurrentPage(1);
      } else {
        setData(prev => [...prev, ...(users || [])]);
      }

      setHasMore((users || []).length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setCurrentPage(prev => prev + 1);
  }, [hasMore, loading]);

  const refresh = useCallback(async () => {
    await fetchUsers(true);
  }, [fetchUsers]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (currentPage > 1) {
      fetchUsers();
    }
  }, [currentPage, fetchUsers]);

  return { data, loading, error, hasMore, loadMore, refresh };
};

/**
 * Hook to fetch a single user by ID
 */
export const useUser = (userId?: string): UseSupabaseReturn<User> => {
  const [data, setData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        throw new Error(`Failed to fetch user: ${userError.message}`);
      }

      setData(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Set up real-time subscription for user changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setData(payload.new as User);
          } else if (payload.eventType === 'DELETE') {
            setData(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { data, loading, error, refresh };
};

/**
 * Hook to fetch a user by Telegram ID
 */
export const useUserByTelegramId = (telegramId?: string): UseSupabaseReturn<User> => {
  const [data, setData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!telegramId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      if (userError) {
        if (userError.code === 'PGRST116') {
          // User not found
          setData(null);
        } else {
          throw new Error(`Failed to fetch user: ${userError.message}`);
        }
      } else {
        setData(user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [telegramId]);

  const refresh = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { data, loading, error, refresh };
};

/**
 * Hook to fetch user stats
 */
export const useStats = (userId?: string): UseSupabaseReturn<Stats> => {
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data: stats, error: statsError } = await supabase
        .from('stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (statsError) {
        if (statsError.code === 'PGRST116') {
          // Stats not found
          setData(null);
        } else {
          throw new Error(`Failed to fetch stats: ${statsError.message}`);
        }
      } else {
        setData(stats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    await fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Set up real-time subscription for stats changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`stats_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stats',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setData(payload.new as Stats);
          } else if (payload.eventType === 'DELETE') {
            setData(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { data, loading, error, refresh };
};

/**
 * Hook to fetch leaderboard data with real-time updates
 */
export const useLeaderboard = (options: LeaderboardOptions = {}): UseSupabaseListReturn<LeaderboardUser> => {
  const { platform, limit = 50, timeframe = 'all' } = options;
  const [data, setData] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('users')
        .select(`
          *,
          stats!inner(*)
        `)
        .eq('stats.verification_status', 'verified')
        .order('stats.win_rate', { ascending: false })
        .limit(limit);

      if (platform) {
        query = query.eq('stats.platform', platform);
      }

      // Add timeframe filtering if needed
      if (timeframe !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        if (timeframe === 'week') {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (timeframe === 'month') {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else {
          startDate = new Date(0);
        }
        
        query = query.gte('stats.last_updated', startDate.toISOString());
      }

      const { data: leaderboardData, error: leaderboardError } = await query;

      if (leaderboardError) {
        throw new Error(`Failed to fetch leaderboard: ${leaderboardError.message}`);
      }

      // Transform data to include ranks
      const rankedData: LeaderboardUser[] = (leaderboardData || []).map((user: any, index: number) => ({
        ...user,
        stats: user.stats[0], // Since we're using inner join, there should be exactly one stats record
        rank: index + 1,
      }));

      setData(rankedData);
      setHasMore(rankedData.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [platform, limit, timeframe]);

  const loadMore = useCallback(async () => {
    // For leaderboard, we typically don't need pagination
    // This could be extended if needed
    return Promise.resolve();
  }, []);

  const refresh = useCallback(async () => {
    await fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Set up real-time subscription for stats changes
  useEffect(() => {
    const channel = supabase
      .channel('leaderboard_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stats',
        },
        () => {
          // Refresh leaderboard when any stats change
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeaderboard]);

  return { data, loading, error, hasMore, loadMore, refresh };
};

/**
 * Hook to fetch available gaming platforms
 */
export const usePlatforms = (): UseSupabaseReturn<Platform[]> => {
  const [data, setData] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlatforms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: platforms, error: platformsError } = await supabase
        .from('platforms')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (platformsError) {
        throw new Error(`Failed to fetch platforms: ${platformsError.message}`);
      }

      setData(platforms || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchPlatforms();
  }, [fetchPlatforms]);

  useEffect(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  return { data, loading, error, refresh };
};

/**
 * Hook to fetch pending verifications (for admin use)
 */
export const usePendingVerifications = (): UseSupabaseReturn<Array<User & { stats: Stats }>> => {
  const [data, setData] = useState<Array<User & { stats: Stats }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingVerifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: pendingData, error: pendingError } = await supabase
        .from('users')
        .select(`
          *,
          stats!inner(*)
        `)
        .eq('stats.verification_status', 'pending')
        .order('stats.last_updated', { ascending: true });

      if (pendingError) {
        throw new Error(`Failed to fetch pending verifications: ${pendingError.message}`);
      }

      // Transform data to flatten stats
      const transformedData = (pendingData || []).map((user: any) => ({
        ...user,
        stats: user.stats[0], // Get the first (and should be only) stats record
      }));

      setData(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchPendingVerifications();
  }, [fetchPendingVerifications]);

  useEffect(() => {
    fetchPendingVerifications();
  }, [fetchPendingVerifications]);

  // Set up real-time subscription for pending verifications
  useEffect(() => {
    const channel = supabase
      .channel('pending_verifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stats',
          filter: 'verification_status=eq.pending',
        },
        () => {
          fetchPendingVerifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPendingVerifications]);

  return { data, loading, error, refresh };
};

/**
 * Hook to get user stats summary (total users, games played, etc.)
 */
export const useStatsSummary = (): UseSupabaseReturn<{
  totalUsers: number;
  totalGames: number;
  totalWins: number;
  totalLosses: number;
  averageWinRate: number;
}> => {
  const [data, setData] = useState<{
    totalUsers: number;
    totalGames: number;
    totalWins: number;
    totalLosses: number;
    averageWinRate: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatsSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: stats, error: statsError } = await supabase
        .from('stats')
        .select('wins, losses, games_played, win_rate')
        .eq('verification_status', 'verified');

      if (statsError) {
        throw new Error(`Failed to fetch stats summary: ${statsError.message}`);
      }

      const { count: userCount, error: userCountError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (userCountError) {
        throw new Error(`Failed to fetch user count: ${userCountError.message}`);
      }

      const summary = {
        totalUsers: userCount || 0,
        totalGames: stats?.reduce((sum, stat) => sum + stat.games_played, 0) || 0,
        totalWins: stats?.reduce((sum, stat) => sum + stat.wins, 0) || 0,
        totalLosses: stats?.reduce((sum, stat) => sum + stat.losses, 0) || 0,
        averageWinRate: stats?.length ? 
          stats.reduce((sum, stat) => sum + stat.win_rate, 0) / stats.length : 0,
      };

      setData(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchStatsSummary();
  }, [fetchStatsSummary]);

  useEffect(() => {
    fetchStatsSummary();
  }, [fetchStatsSummary]);

  return { data, loading, error, refresh };
};

// Main hook types exported inline above
export type {
  UseSupabaseReturn,
  UseSupabaseListReturn,
};