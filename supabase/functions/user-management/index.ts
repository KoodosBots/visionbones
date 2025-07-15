/*
 * USER MANAGEMENT FUNCTIONS - Supabase Edge Function
 * 
 * CONVERSION STRATEGY:
 * - Convex queries → Direct Supabase client calls (no Edge Function needed for simple reads)
 * - Convex mutations → Supabase client calls or Edge Functions (for complex validation)
 * - Convex internal functions → Edge Functions (for server-side operations)
 * 
 * ORIGINAL CONVEX FUNCTIONS CONVERTED:
 * - createOrUpdateUser (mutation) → Edge Function (needs validation/business logic)
 * - getUserByTelegramId (query) → Direct client call (simple read)
 * - updateSocialLinks (mutation) → Edge Function (needs premium validation)
 * - getUserByStripeCustomerId (internal query) → Edge Function (internal use)
 * - updatePremiumStatus (internal mutation) → Edge Function (internal use)
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
    }
  }
}

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
      case 'POST:create-or-update':
        return await createOrUpdateUser(req, supabaseClient)
      
      case 'GET:by-telegram-id':
        return await getUserByTelegramId(req, supabaseClient)
      
      case 'PUT:social-links':
        return await updateSocialLinks(req, supabaseClient)
      
      case 'GET:by-stripe-customer':
        return await getUserByStripeCustomerId(req, supabaseClient)
      
      case 'PUT:premium-status':
        return await updatePremiumStatus(req, supabaseClient)

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
 * CONVERTED FROM: createOrUpdateUser (Convex mutation)
 * USAGE: POST /user-management/create-or-update
 * 
 * CONVERSION NOTES:
 * - Convex used ctx.db.query().withIndex() - converted to Supabase select with eq()
 * - Convex used ctx.db.patch() - converted to Supabase update()
 * - Convex used ctx.db.insert() - converted to Supabase insert()
 * - Convex Date.now() timestamps - converted to PostgreSQL timestamps
 */
async function createOrUpdateUser(req: Request, supabaseClient: any) {
  const { telegramId, username, selectedPlatform, platformUsername } = await req.json()

  // Find existing user by telegram_id (equivalent to Convex withIndex)
  const { data: existingUser, error: findError } = await supabaseClient
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single()

  if (findError && findError.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Error finding user: ${findError.message}`)
  }

  const now = new Date().toISOString()

  if (existingUser) {
    // Update existing user (equivalent to Convex ctx.db.patch)
    const { data, error } = await supabaseClient
      .from('users')
      .update({
        username,
        selected_platform: selectedPlatform,
        platform_username: platformUsername,
        last_active: now,
      })
      .eq('id', existingUser.id)
      .select()
      .single()

    if (error) throw new Error(`Error updating user: ${error.message}`)
    
    return new Response(
      JSON.stringify({ userId: existingUser.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } else {
    // Create new user (equivalent to Convex ctx.db.insert)
    const { data, error } = await supabaseClient
      .from('users')
      .insert({
        telegram_id: telegramId,
        username,
        selected_platform: selectedPlatform,
        platform_username: platformUsername,
        is_premium: false,
        verified_badge: false,
      })
      .select()
      .single()

    if (error) throw new Error(`Error creating user: ${error.message}`)

    return new Response(
      JSON.stringify({ userId: data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

/*
 * CONVERTED FROM: getUserByTelegramId (Convex query)
 * USAGE: GET /user-management/by-telegram-id?telegramId=123
 * 
 * NOTE: This could be a direct client call instead of Edge Function
 * Kept as Edge Function for consistency and potential future business logic
 */
async function getUserByTelegramId(req: Request, supabaseClient: any) {
  const url = new URL(req.url)
  const telegramId = url.searchParams.get('telegramId')

  if (!telegramId) {
    return new Response(
      JSON.stringify({ error: 'telegramId parameter required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error finding user: ${error.message}`)
  }

  return new Response(
    JSON.stringify({ user: data || null }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CONVERTED FROM: updateSocialLinks (Convex mutation)
 * USAGE: PUT /user-management/social-links
 * 
 * CONVERSION NOTES:
 * - Convex used ctx.runQuery to check premium status - converted to separate Supabase query
 * - Premium validation logic preserved
 * - JSONB field for social_links in PostgreSQL
 */
async function updateSocialLinks(req: Request, supabaseClient: any) {
  const { userId, socialLinks } = await req.json()

  // Check if user has premium access (equivalent to Convex ctx.runQuery)
  // TODO: This should call the premium validation function
  const { data: user, error: userError } = await supabaseClient
    .from('users')
    .select('is_premium, premium_expiry')
    .eq('id', userId)
    .single()

  if (userError) throw new Error(`Error finding user: ${userError.message}`)

  const isPremium = user.is_premium && (!user.premium_expiry || new Date(user.premium_expiry) > new Date())

  if (!isPremium) {
    return new Response(
      JSON.stringify({ error: 'Premium subscription required for social links' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data, error } = await supabaseClient
    .from('users')
    .update({ social_links: socialLinks })
    .eq('id', userId)

  if (error) throw new Error(`Error updating social links: ${error.message}`)

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CONVERTED FROM: getUserByStripeCustomerId (Convex internal query)
 * USAGE: GET /user-management/by-stripe-customer?customerId=cus_123
 * 
 * CONVERSION NOTES:
 * - Internal function converted to Edge Function for server-side use
 * - Could be called by other Edge Functions or webhooks
 */
async function getUserByStripeCustomerId(req: Request, supabaseClient: any) {
  const url = new URL(req.url)
  const customerId = url.searchParams.get('customerId')

  if (!customerId) {
    return new Response(
      JSON.stringify({ error: 'customerId parameter required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error finding user: ${error.message}`)
  }

  return new Response(
    JSON.stringify({ user: data || null }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CONVERTED FROM: updatePremiumStatus (Convex internal mutation)
 * USAGE: PUT /user-management/premium-status
 * 
 * CONVERSION NOTES:
 * - Internal function for server-side premium status updates
 * - Used by subscription webhooks and admin functions
 */
async function updatePremiumStatus(req: Request, supabaseClient: any) {
  const { userId, isPremium, premiumExpiry } = await req.json()

  const { data, error } = await supabaseClient
    .from('users')
    .update({
      is_premium: isPremium,
      premium_expiry: premiumExpiry ? new Date(premiumExpiry).toISOString() : null,
    })
    .eq('id', userId)

  if (error) throw new Error(`Error updating premium status: ${error.message}`)

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CLIENT-SIDE USAGE EXAMPLES:
 * 
 * // Instead of Convex useQuery("users.getUserByTelegramId", { telegramId })
 * const { data } = await supabase
 *   .from('users')
 *   .select('*')
 *   .eq('telegram_id', telegramId)
 *   .single()
 * 
 * // For complex operations, call Edge Function:
 * const response = await fetch('/functions/v1/user-management/create-or-update', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ telegramId, username, selectedPlatform, platformUsername })
 * })
 */