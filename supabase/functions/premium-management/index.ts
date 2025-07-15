/*
 * PREMIUM MANAGEMENT FUNCTIONS - Supabase Edge Function
 * 
 * CONVERSION STRATEGY:
 * - All Convex premium.ts queries → Supabase client calls or Edge Functions
 * - Premium validation logic preserved
 * - Feature gating logic maintained
 * 
 * ORIGINAL CONVEX FUNCTIONS CONVERTED:
 * - isPremiumUser (query) → Direct client call or Edge Function
 * - getPremiumFeatures (query) → Edge Function (business logic)
 * - validatePremiumFeature (query) → Edge Function (validation logic)
 * - getPremiumStatus (query) → Edge Function (complex query with subscription data)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          telegram_id: string
          username: string
          is_premium: boolean
          premium_expiry: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string
          last_active: string
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
      }
    }
  }
}

const PREMIUM_FEATURES = [
  'socialLinks',
  'verifiedBadge',
  'advancedAnalytics',
  'profileCustomization',
  'priorityStatUpdates',
  'exportStats',
  'customBadges',
  'profileColors',
]

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient&lt;Database&gt;(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { method } = req
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    switch (`${method}:${path}`) {
      case 'GET:is-premium':
        return await isPremiumUser(req, supabaseClient)
      
      case 'GET:features':
        return await getPremiumFeatures(req, supabaseClient)
      
      case 'GET:validate-feature':
        return await validatePremiumFeature(req, supabaseClient)
      
      case 'GET:status':
        return await getPremiumStatus(req, supabaseClient)

      default:
        return new Response('Not Found', { status: 404, headers: corsHeaders })
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/*
 * CONVERTED FROM: isPremiumUser (Convex query)
 * USAGE: GET /premium-management/is-premium?userId=123
 * 
 * CONVERSION NOTES:
 * - Simple premium check logic preserved
 * - Date comparison for expiry validation
 * - Could be replaced with direct client call for simple cases
 */
async function isPremiumUser(req: Request, supabaseClient: any) {
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')

  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'userId parameter required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: user, error } = await supabaseClient
    .from('users')
    .select('is_premium, premium_expiry')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      return new Response(
        JSON.stringify({ isPremium: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    throw new Error(`Error finding user: ${error.message}`)
  }

  // Check if user has premium flag and it hasn't expired
  if (!user.is_premium) {
    return new Response(
      JSON.stringify({ isPremium: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // If premium expiry is set, check if it's still valid
  if (user.premium_expiry && new Date(user.premium_expiry) < new Date()) {
    return new Response(
      JSON.stringify({ isPremium: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ isPremium: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CONVERTED FROM: getPremiumFeatures (Convex query)
 * USAGE: GET /premium-management/features?userId=123
 * 
 * CONVERSION NOTES:
 * - Reuses isPremiumUser logic internally
 * - Returns feature availability map
 * - Business logic for feature definitions preserved
 */
async function getPremiumFeatures(req: Request, supabaseClient: any) {
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')

  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'userId parameter required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Reuse the premium check logic
  const premiumResponse = await isPremiumUser(req, supabaseClient)
  const premiumData = await premiumResponse.json()
  const isPremium = premiumData.isPremium

  const features = {
    socialLinks: isPremium,
    verifiedBadge: isPremium,
    advancedAnalytics: isPremium,
    profileCustomization: isPremium,
    priorityStatUpdates: isPremium,
    exportStats: isPremium,
    customBadges: isPremium,
    profileColors: isPremium,
  }

  return new Response(
    JSON.stringify({
      isPremium,
      features
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CONVERTED FROM: validatePremiumFeature (Convex query)
 * USAGE: GET /premium-management/validate-feature?userId=123&feature=socialLinks
 * 
 * CONVERSION NOTES:
 * - Feature validation logic preserved
 * - Premium feature list maintained as constant
 * - Free features return true regardless of premium status
 */
async function validatePremiumFeature(req: Request, supabaseClient: any) {
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')
  const feature = url.searchParams.get('feature')

  if (!userId || !feature) {
    return new Response(
      JSON.stringify({ error: 'userId and feature parameters required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (PREMIUM_FEATURES.includes(feature)) {
    // This is a premium feature, check premium status
    const premiumResponse = await isPremiumUser(req, supabaseClient)
    const premiumData = await premiumResponse.json()
    
    return new Response(
      JSON.stringify({ hasAccess: premiumData.isPremium }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Free features are always accessible
  return new Response(
    JSON.stringify({ hasAccess: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CONVERTED FROM: getPremiumStatus (Convex query)
 * USAGE: GET /premium-management/status?userId=123
 * 
 * CONVERSION NOTES:
 * - Complex query joining users and subscriptions tables
 * - Calculates days until expiry
 * - Checks for active subscription status
 * - Returns comprehensive premium status information
 */
async function getPremiumStatus(req: Request, supabaseClient: any) {
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')

  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'userId parameter required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: user, error: userError } = await supabaseClient
    .from('users')
    .select('is_premium, premium_expiry')
    .eq('id', userId)
    .single()

  if (userError) {
    if (userError.code === 'PGRST116') { // No rows returned
      return new Response(
        JSON.stringify({
          isPremium: false,
          premiumExpiry: null,
          daysUntilExpiry: null,
          hasActiveSubscription: false,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    throw new Error(`Error finding user: ${userError.message}`)
  }

  const isPremium = user.is_premium && (!user.premium_expiry || new Date(user.premium_expiry) > new Date())
  const daysUntilExpiry = user.premium_expiry 
    ? Math.ceil((new Date(user.premium_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Check for active subscription
  const { data: subscription, error: subError } = await supabaseClient
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (subError && subError.code !== 'PGRST116') {
    throw new Error(`Error finding subscription: ${subError.message}`)
  }

  return new Response(
    JSON.stringify({
      isPremium,
      premiumExpiry: user.premium_expiry,
      daysUntilExpiry,
      hasActiveSubscription: !!subscription,
      subscriptionStatus: subscription?.status || null,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CLIENT-SIDE USAGE EXAMPLES:
 * 
 * // Simple premium check (could be direct client call):
 * const { data } = await supabase
 *   .from('users')
 *   .select('is_premium, premium_expiry')
 *   .eq('id', userId)
 *   .single()
 * 
 * const isPremium = data.is_premium && (!data.premium_expiry || new Date(data.premium_expiry) > new Date())
 * 
 * // For complex premium features, call Edge Function:
 * const response = await fetch('/functions/v1/premium-management/features?userId=' + userId)
 * const { isPremium, features } = await response.json()
 * 
 * // Feature validation:
 * const response = await fetch(`/functions/v1/premium-management/validate-feature?userId=${userId}&feature=socialLinks`)
 * const { hasAccess } = await response.json()
 */