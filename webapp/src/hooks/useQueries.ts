import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { supabase, Database } from '../lib/supabase';
import { queryKeys, staleTimeConfig, errorHandling, cacheUtils } from '../lib/queryClient';
import { useEffect } from 'react';

// Type definitions from the existing useSupabase hook
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

// ====================
// USER QUERIES
// ====================

/**
 * Query hook to fetch all users with pagination
 */
export const useUsers = (
  options: PaginationOptions = {},
  queryOptions?: Omit<UseQueryOptions<User[], Error>, 'queryKey' | 'queryFn'>
) => {
  const { page = 1, limit = 20 } = options;
  
  return useQuery({
    queryKey: queryKeys.users.list({ page, limit }),
    queryFn: async (): Promise<User[]> => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`Failed to fetch users: ${error.message}`);
      }

      return data || [];
    },
    staleTime: staleTimeConfig.users,
    ...queryOptions,
  });
};

/**
 * Query hook to fetch a single user by ID
 */
export const useUser = (
  userId?: string,
  queryOptions?: Omit<UseQueryOptions<User | null, Error>, 'queryKey' | 'queryFn'>
) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.users.detail(userId!),
    queryFn: async (): Promise<User | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // User not found
        }
        throw new Error(`Failed to fetch user: ${error.message}`);
      }

      return data;
    },
    enabled: !!userId,
    staleTime: staleTimeConfig.users,
    ...queryOptions,
  });

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
            queryClient.setQueryData(queryKeys.users.detail(userId), payload.new as User);
          } else if (payload.eventType === 'DELETE') {
            queryClient.setQueryData(queryKeys.users.detail(userId), null);
            queryClient.removeQueries({ queryKey: queryKeys.users.detail(userId) });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
};

/**
 * Query hook to fetch a user by Telegram ID
 */
export const useUserByTelegramId = (
  telegramId?: string,
  queryOptions?: Omit<UseQueryOptions<User | null, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.users.byTelegramId(telegramId!),
    queryFn: async (): Promise<User | null> => {
      if (!telegramId) return null;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', telegramId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // User not found
        }
        throw new Error(`Failed to fetch user: ${error.message}`);
      }

      return data;
    },
    enabled: !!telegramId,
    staleTime: staleTimeConfig.users,
    ...queryOptions,
  });
};

// ====================
// STATS QUERIES
// ====================

/**
 * Query hook to fetch user stats
 */
export const useStats = (
  userId?: string,
  queryOptions?: Omit<UseQueryOptions<Stats | null, Error>, 'queryKey' | 'queryFn'>
) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.stats.detail(userId!),
    queryFn: async (): Promise<Stats | null> => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Stats not found
        }
        throw new Error(`Failed to fetch stats: ${error.message}`);
      }

      return data;
    },
    enabled: !!userId,
    staleTime: staleTimeConfig.stats,
    ...queryOptions,
  });

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
            queryClient.setQueryData(queryKeys.stats.detail(userId), payload.new as Stats);
            // Invalidate leaderboard when stats change
            cacheUtils.invalidateLeaderboardQueries();
          } else if (payload.eventType === 'DELETE') {
            queryClient.setQueryData(queryKeys.stats.detail(userId), null);
            queryClient.removeQueries({ queryKey: queryKeys.stats.detail(userId) });
            cacheUtils.invalidateLeaderboardQueries();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
};

/**
 * Query hook to fetch stats summary
 */
export const useStatsSummary = (
  queryOptions?: Omit<UseQueryOptions<{
    totalUsers: number;
    totalGames: number;
    totalWins: number;
    totalLosses: number;
    averageWinRate: number;
  } | null, Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.stats.summary,
    queryFn: async () => {
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

      return {
        totalUsers: userCount || 0,
        totalGames: stats?.reduce((sum, stat) => sum + stat.games_played, 0) || 0,
        totalWins: stats?.reduce((sum, stat) => sum + stat.wins, 0) || 0,
        totalLosses: stats?.reduce((sum, stat) => sum + stat.losses, 0) || 0,
        averageWinRate: stats?.length ? 
          stats.reduce((sum, stat) => sum + stat.win_rate, 0) / stats.length : 0,
      };
    },
    staleTime: staleTimeConfig.stats,
    ...queryOptions,
  });
};

// ====================
// LEADERBOARD QUERIES
// ====================

/**
 * Query hook to fetch leaderboard data with real-time updates
 */
export const useLeaderboard = (
  options: LeaderboardOptions = {},
  queryOptions?: Omit<UseQueryOptions<LeaderboardUser[], Error>, 'queryKey' | 'queryFn'>
) => {
  const { platform, limit = 50, timeframe = 'all' } = options;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.leaderboard.list({ platform, limit, timeframe }),
    queryFn: async (): Promise<LeaderboardUser[]> => {
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

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch leaderboard: ${error.message}`);
      }

      // Transform data to include ranks
      const rankedData: LeaderboardUser[] = (data || []).map((user: any, index: number) => ({
        ...user,
        stats: user.stats[0], // Since we're using inner join, there should be exactly one stats record
        rank: index + 1,
      }));

      return rankedData;
    },
    staleTime: staleTimeConfig.leaderboard,
    ...queryOptions,
  });

  // Set up real-time subscription for leaderboard changes
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
          // Invalidate leaderboard queries when any stats change
          queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.all });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

// ====================
// PLATFORM QUERIES
// ====================

/**
 * Query hook to fetch available gaming platforms
 */
export const usePlatforms = (
  queryOptions?: Omit<UseQueryOptions<Platform[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.platforms.all,
    queryFn: async (): Promise<Platform[]> => {
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        throw new Error(`Failed to fetch platforms: ${error.message}`);
      }

      return data || [];
    },
    staleTime: staleTimeConfig.platforms,
    ...queryOptions,
  });
};

// ====================
// ADMIN QUERIES
// ====================

/**
 * Query hook to fetch pending verifications (for admin use)
 */
export const usePendingVerifications = (
  queryOptions?: Omit<UseQueryOptions<Array<User & { stats: Stats }>, Error>, 'queryKey' | 'queryFn'>
) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.admin.pendingVerifications,
    queryFn: async (): Promise<Array<User & { stats: Stats }>> => {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          stats!inner(*)
        `)
        .eq('stats.verification_status', 'pending')
        .order('stats.last_updated', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch pending verifications: ${error.message}`);
      }

      // Transform data to flatten stats
      const transformedData = (data || []).map((user: any) => ({
        ...user,
        stats: user.stats[0], // Get the first (and should be only) stats record
      }));

      return transformedData;
    },
    staleTime: staleTimeConfig.pendingVerifications,
    ...queryOptions,
  });

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
          queryClient.invalidateQueries({ queryKey: queryKeys.admin.pendingVerifications });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};

// ====================
// MUTATION HOOKS
// ====================

/**
 * Mutation hook to create a new user
 */
export const useCreateUser = (
  options?: UseMutationOptions<
    User,
    Error,
    Omit<Database['public']['Tables']['users']['Insert'], 'id' | 'created_at' | 'last_active'>
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData): Promise<User> => {
      const { data, error } = await supabase
        .from('users')
        .insert({
          ...userData,
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create user: ${error.message}`);
      }

      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch user queries
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      // Add the new user to the cache
      queryClient.setQueryData(queryKeys.users.detail(data.id), data);
    },
    ...options,
  });
};

/**
 * Mutation hook to update a user
 */
export const useUpdateUser = (
  options?: UseMutationOptions<
    User,
    Error,
    { id: string; updates: Database['public']['Tables']['users']['Update'] }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }): Promise<User> => {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          last_active: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update user: ${error.message}`);
      }

      return data;
    },
    onSuccess: (data) => {
      // Update the user in the cache
      queryClient.setQueryData(queryKeys.users.detail(data.id), data);
      // Invalidate user lists
      queryClient.invalidateQueries({ queryKey: queryKeys.users.lists() });
    },
    ...options,
  });
};

/**
 * Mutation hook to create or update stats
 */
export const useUpsertStats = (
  options?: UseMutationOptions<
    Stats,
    Error,
    Database['public']['Tables']['stats']['Insert']
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (statsData): Promise<Stats> => {
      const { data, error } = await supabase
        .from('stats')
        .upsert({
          ...statsData,
          last_updated: new Date().toISOString(),
          win_rate: statsData.wins && statsData.losses ? 
            statsData.wins / (statsData.wins + statsData.losses) : 0,
          games_played: (statsData.wins || 0) + (statsData.losses || 0),
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to upsert stats: ${error.message}`);
      }

      return data;
    },
    onSuccess: (data) => {
      // Update the stats in the cache
      queryClient.setQueryData(queryKeys.stats.detail(data.user_id), data);
      // Invalidate related queries
      cacheUtils.invalidateLeaderboardQueries();
      cacheUtils.invalidateAdminQueries();
    },
    ...options,
  });
};

/**
 * Mutation hook to verify stats (admin only)
 */
export const useVerifyStats = (
  options?: UseMutationOptions<
    Stats,
    Error,
    { statsId: string; verificationStatus: 'verified' | 'disputed' }
  >
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ statsId, verificationStatus }): Promise<Stats> => {
      const { data, error } = await supabase
        .from('stats')
        .update({
          verification_status: verificationStatus,
          last_updated: new Date().toISOString(),
        })
        .eq('id', statsId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to verify stats: ${error.message}`);
      }

      return data;
    },
    onSuccess: (data) => {
      // Update the stats in the cache
      queryClient.setQueryData(queryKeys.stats.detail(data.user_id), data);
      // Invalidate related queries
      cacheUtils.invalidateLeaderboardQueries();
      cacheUtils.invalidateAdminQueries();
    },
    ...options,
  });
};

// Export all types for external use
export type {
  User,
  Stats,
  Platform,
  UserWithStats,
  LeaderboardUser,
  PaginationOptions,
  LeaderboardOptions,
};