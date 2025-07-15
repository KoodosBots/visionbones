/*
 * SHARED UTILITIES - Common functions for Supabase Edge Functions
 * 
 * This file contains common utilities that are used across multiple Edge Functions
 * to reduce code duplication and maintain consistency.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Common CORS headers for all Edge Functions
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Database type definitions (shared across functions)
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          telegram_id: string
          username: string
          selected_platform: string
          platform_username: string
          is_premium: boolean
          premium_expiry: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          social_links: Record<string, string> | null
          verified_badge: boolean
          created_at: string
          last_active: string
        }
        Insert: {
          telegram_id: string
          username: string
          selected_platform: string
          platform_username: string
          is_premium?: boolean
          premium_expiry?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          social_links?: Record<string, string> | null
          verified_badge?: boolean
        }
        Update: {
          username?: string
          selected_platform?: string
          platform_username?: string
          is_premium?: boolean
          premium_expiry?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          social_links?: Record<string, string> | null
          verified_badge?: boolean
          last_active?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          stripe_subscription_id: string
          stripe_customer_id: string
          status: string
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          stripe_subscription_id: string
          stripe_customer_id: string
          status: string
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          canceled_at?: string | null
        }
        Update: {
          status?: string
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          updated_at?: string
        }
      }
      webhook_events: {
        Row: {
          id: string
          stripe_event_id: string
          event_type: string
          processed: boolean
          processed_at: string | null
          error: string | null
          created_at: string
        }
        Insert: {
          stripe_event_id: string
          event_type: string
          processed?: boolean
          processed_at?: string | null
          error?: string | null
        }
        Update: {
          processed?: boolean
          processed_at?: string | null
          error?: string | null
        }
      }
    }
  }
}

/*
 * Create Supabase client with proper configuration
 * Use service role for internal operations, anon key for user operations
 */
export function createSupabaseClient(useServiceRole = false) {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const key = useServiceRole 
    ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    : Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  return createClient&lt;Database&gt;(url, key)
}

/*
 * Create authenticated Supabase client from request headers
 */
export function createAuthenticatedClient(req: Request) {
  return createClient&lt;Database&gt;(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  )
}

/*
 * Standard error response helper
 */
export function errorResponse(message: string, status = 500) {
  return new Response(
    JSON.stringify({ error: message }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

/*
 * Standard success response helper
 */
export function successResponse(data: any, status = 200) {
  return new Response(
    JSON.stringify(data),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}

/*
 * Handle CORS preflight requests
 */
export function handleCors(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}

/*
 * Premium feature validation constants
 */
export const PREMIUM_FEATURES = [
  'socialLinks',
  'verifiedBadge',
  'advancedAnalytics',
  'profileCustomization',
  'priorityStatUpdates',
  'exportStats',
  'customBadges',
  'profileColors',
] as const

export type PremiumFeature = typeof PREMIUM_FEATURES[number]

/*
 * Check if user has premium access
 * Reusable across multiple functions
 */
export async function checkPremiumStatus(
  supabaseClient: any, 
  userId: string
): Promise<boolean> {
  const { data: user, error } = await supabaseClient
    .from('users')
    .select('is_premium, premium_expiry')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(`Error checking premium status: ${error.message}`)
  }

  if (!user?.is_premium) {
    return false
  }

  // Check if premium has expired
  if (user.premium_expiry && new Date(user.premium_expiry) < new Date()) {
    return false
  }

  return true
}

/*
 * Validate premium feature access
 */
export async function validatePremiumFeature(
  supabaseClient: any,
  userId: string,
  feature: string
): Promise<boolean> {
  if (PREMIUM_FEATURES.includes(feature as PremiumFeature)) {
    return await checkPremiumStatus(supabaseClient, userId)
  }
  
  // Free features are always accessible
  return true
}

/*
 * Get user by Telegram ID (commonly used across functions)
 */
export async function getUserByTelegramId(
  supabaseClient: any,
  telegramId: string
) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Error finding user: ${error.message}`)
  }

  return data
}

/*
 * Get user by Stripe customer ID (used in webhooks)
 */
export async function getUserByStripeCustomerId(
  supabaseClient: any,
  customerId: string
) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error finding user by Stripe customer ID: ${error.message}`)
  }

  return data
}

/*
 * Log function execution for debugging
 */
export function logFunction(functionName: string, params: any) {
  console.log(`[${functionName}] Called with:`, JSON.stringify(params, null, 2))
}

/*
 * Validate required parameters
 */
export function validateParams(params: Record<string, any>, required: string[]): string | null {
  for (const param of required) {
    if (!params[param]) {
      return `Missing required parameter: ${param}`
    }
  }
  return null
}

/*
 * Parse URL parameters safely
 */
export function getUrlParams(req: Request, required: string[] = []): Record<string, string> {
  const url = new URL(req.url)
  const params: Record<string, string> = {}
  
  for (const [key, value] of url.searchParams.entries()) {
    params[key] = value
  }
  
  // Validate required params
  const missing = required.filter(param => !params[param])
  if (missing.length > 0) {
    throw new Error(`Missing required parameters: ${missing.join(', ')}`)
  }
  
  return params
}

/*
 * Parse JSON body safely
 */
export async function parseJsonBody(req: Request, required: string[] = []): Promise<Record<string, any>> {
  try {
    const body = await req.json()
    
    // Validate required fields
    const missing = required.filter(field => !body[field])
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`)
    }
    
    return body
  } catch (error) {
    throw new Error(`Invalid JSON body: ${error.message}`)
  }
}

/*
 * Call another Edge Function (for function composition)
 */
export async function callEdgeFunction(
  functionName: string,
  method: string = 'GET',
  body?: any,
  params?: Record<string, string>
) {
  const baseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  let url = `${baseUrl}/functions/v1/${functionName}`
  
  if (params) {
    const searchParams = new URLSearchParams(params)
    url += `?${searchParams.toString()}`
  }
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  
  if (!response.ok) {
    throw new Error(`Edge function call failed: ${response.statusText}`)
  }
  
  return await response.json()
}

/*
 * Conversion helpers for Convex to Supabase migration
 */
export const ConvexToSupabase = {
  /*
   * Convert Convex timestamp (number) to PostgreSQL timestamp
   */
  timestampToDate: (timestamp: number): string => {
    return new Date(timestamp).toISOString()
  },

  /*
   * Convert PostgreSQL timestamp to Convex timestamp (number)
   */
  dateToTimestamp: (date: string): number => {
    return new Date(date).getTime()
  },

  /*
   * Convert Convex query patterns to Supabase
   */
  buildQuery: (table: string, filters: Record<string, any>) => {
    // This would build a Supabase query based on Convex-style filters
    // Implementation depends on specific use cases
    return { table, filters }
  }
}

/*
 * Environment validation
 */
export function validateEnvironment() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  const missing = required.filter(env => !Deno.env.get(env))
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`)
  }
}