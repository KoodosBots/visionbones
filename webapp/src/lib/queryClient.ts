import { QueryClient, DefaultOptions } from '@tanstack/react-query';

/**
 * Default options for React Query optimized for Supabase integration
 */
const defaultOptions: DefaultOptions = {
  queries: {
    // Stale time configuration - how long data is considered fresh
    staleTime: 1000 * 60 * 5, // 5 minutes for most data
    
    // Cache time - how long data stays in cache when unused
    gcTime: 1000 * 60 * 30, // 30 minutes
    
    // Retry configuration
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    
    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    
    // Refetch on window focus for real-time data
    refetchOnWindowFocus: true,
    
    // Refetch on reconnect
    refetchOnReconnect: true,
    
    // Don't refetch on mount if data is fresh
    refetchOnMount: true,
  },
  mutations: {
    // Retry mutations once on failure
    retry: 1,
    
    // Mutation retry delay
    retryDelay: 1000,
  },
};

/**
 * Create and configure the React Query client
 */
export const queryClient = new QueryClient({
  defaultOptions,
});

/**
 * Query keys factory for consistent cache key management
 */
export const queryKeys = {
  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (options: any) => [...queryKeys.users.lists(), options] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    byTelegramId: (telegramId: string) => [...queryKeys.users.all, 'telegram', telegramId] as const,
  },
  
  // Stats
  stats: {
    all: ['stats'] as const,
    lists: () => [...queryKeys.stats.all, 'list'] as const,
    list: (options: any) => [...queryKeys.stats.lists(), options] as const,
    details: () => [...queryKeys.stats.all, 'detail'] as const,
    detail: (userId: string) => [...queryKeys.stats.details(), userId] as const,
    summary: ['stats', 'summary'] as const,
  },
  
  // Leaderboard
  leaderboard: {
    all: ['leaderboard'] as const,
    lists: () => [...queryKeys.leaderboard.all, 'list'] as const,
    list: (options: any) => [...queryKeys.leaderboard.lists(), options] as const,
  },
  
  // Platforms
  platforms: {
    all: ['platforms'] as const,
    lists: () => [...queryKeys.platforms.all, 'list'] as const,
    list: (options: any) => [...queryKeys.platforms.lists(), options] as const,
  },
  
  // Admin
  admin: {
    all: ['admin'] as const,
    pendingVerifications: ['admin', 'pending-verifications'] as const,
  },
  
  // Bible
  bible: {
    all: ['bible'] as const,
    verse: (reference?: string) => [...queryKeys.bible.all, 'verse', reference] as const,
    plan: (planId?: string) => [...queryKeys.bible.all, 'plan', planId] as const,
  },
};

/**
 * Custom stale times for different data types
 */
export const staleTimeConfig = {
  // Real-time data - very short stale time
  leaderboard: 1000 * 60 * 1, // 1 minute
  stats: 1000 * 60 * 2, // 2 minutes
  pendingVerifications: 1000 * 60 * 1, // 1 minute
  
  // Semi-static data - medium stale time
  users: 1000 * 60 * 5, // 5 minutes
  platforms: 1000 * 60 * 10, // 10 minutes
  
  // Static data - long stale time
  bible: 1000 * 60 * 60, // 1 hour
};

/**
 * Error handling utilities for React Query
 */
export const errorHandling = {
  /**
   * Check if error is a Supabase error
   */
  isSupabaseError: (error: any): boolean => {
    return error?.message && typeof error.message === 'string';
  },
  
  /**
   * Extract error message from various error types
   */
  getErrorMessage: (error: any): string => {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error?.message) return error.error.message;
    return 'An unknown error occurred';
  },
  
  /**
   * Check if error is a network error
   */
  isNetworkError: (error: any): boolean => {
    return error?.code === 'NETWORK_ERROR' || 
           error?.message?.includes('network') ||
           error?.message?.includes('fetch');
  },
  
  /**
   * Check if error is an authentication error
   */
  isAuthError: (error: any): boolean => {
    return error?.status === 401 || 
           error?.message?.includes('authentication') ||
           error?.message?.includes('unauthorized');
  },
};

/**
 * Cache invalidation utilities
 */
export const cacheUtils = {
  /**
   * Invalidate all user-related queries
   */
  invalidateUserQueries: async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.stats.all });
    await queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.all });
  },
  
  /**
   * Invalidate leaderboard queries
   */
  invalidateLeaderboardQueries: async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.all });
  },
  
  /**
   * Invalidate admin queries
   */
  invalidateAdminQueries: async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.admin.all });
  },
  
  /**
   * Clear all cache
   */
  clearAll: () => {
    queryClient.clear();
  },
};

/**
 * Development helpers
 */
export const devHelpers = {
  /**
   * Log cache contents (development only)
   */
  logCache: () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Query Cache:', queryClient.getQueryCache());
    }
  },
  
  /**
   * Get query data by key (development only)
   */
  getQueryData: (key: any) => {
    if (process.env.NODE_ENV === 'development') {
      return queryClient.getQueryData(key);
    }
  },
};

export default queryClient;