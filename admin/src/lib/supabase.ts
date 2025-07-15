import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Telegram authentication helper
export async function authenticateWithTelegram(initData: string) {
  const { data, error } = await supabase.functions.invoke('telegram-auth', {
    body: { initData }
  })

  if (error) {
    throw new Error(`Authentication failed: ${error.message}`)
  }

  return data
}

// Type definitions for better TypeScript support
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          telegram_id: string
          username: string
          selected_platform: string | null
          platform_username: string | null
          is_premium: boolean
          premium_expiry: string | null
          social_links: Record<string, any>
          verified_badge: boolean
          created_at: string
          last_active: string
        }
        Insert: {
          id?: string
          telegram_id: string
          username: string
          selected_platform?: string | null
          platform_username?: string | null
          is_premium?: boolean
          premium_expiry?: string | null
          social_links?: Record<string, any>
          verified_badge?: boolean
          created_at?: string
          last_active?: string
        }
        Update: {
          id?: string
          telegram_id?: string
          username?: string
          selected_platform?: string | null
          platform_username?: string | null
          is_premium?: boolean
          premium_expiry?: string | null
          social_links?: Record<string, any>
          verified_badge?: boolean
          created_at?: string
          last_active?: string
        }
      }
      stats: {
        Row: {
          id: string
          user_id: string
          wins: number
          losses: number
          win_rate: number
          games_played: number
          last_updated: string
          updated_by: string | null
          platform: string
          verification_status: 'pending' | 'verified' | 'disputed'
        }
        Insert: {
          id?: string
          user_id: string
          wins?: number
          losses?: number
          last_updated?: string
          updated_by?: string | null
          platform: string
          verification_status?: 'pending' | 'verified' | 'disputed'
        }
        Update: {
          id?: string
          user_id?: string
          wins?: number
          losses?: number
          last_updated?: string
          updated_by?: string | null
          platform?: string
          verification_status?: 'pending' | 'verified' | 'disputed'
        }
      }
      platforms: {
        Row: {
          id: string
          name: string
          icon_url: string | null
          description: string | null
          is_active: boolean
          added_at: string
        }
        Insert: {
          id?: string
          name: string
          icon_url?: string | null
          description?: string | null
          is_active?: boolean
          added_at?: string
        }
        Update: {
          id?: string
          name?: string
          icon_url?: string | null
          description?: string | null
          is_active?: boolean
          added_at?: string
        }
      }
    }
  }
}