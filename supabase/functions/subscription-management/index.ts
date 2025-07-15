/*
 * SUBSCRIPTION MANAGEMENT FUNCTIONS - Supabase Edge Function
 * 
 * CONVERSION STRATEGY:
 * - Convex subscription mutations → Edge Functions (Stripe integration required)
 * - Convex internal mutations → Edge Functions (webhook handlers)
 * - Stripe SDK integration preserved
 * - Database operations converted to Supabase queries
 * 
 * ORIGINAL CONVEX FUNCTIONS CONVERTED:
 * - handleSubscriptionUpdate (internal mutation) → Edge Function
 * - handleSubscriptionDeleted (internal mutation) → Edge Function  
 * - handlePaymentSucceeded (internal mutation) → Edge Function
 * - handlePaymentFailed (internal mutation) → Edge Function
 * - getUserSubscription (query) → Edge Function or direct client call
 * - cancelSubscription (mutation) → Edge Function (Stripe API required)
 * - upsertSubscription (internal mutation) → Edge Function
 * - updateSubscriptionStatus (internal mutation) → Edge Function
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

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
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          is_premium: boolean
          premium_expiry: string | null
          last_active: string
        }
        Update: {
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          is_premium?: boolean
          premium_expiry?: string | null
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
    }
  }
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
})

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient&lt;Database&gt;(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role for internal operations
    )

    const { method } = req
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    switch (`${method}:${path}`) {
      case 'POST:handle-subscription-update':
        return await handleSubscriptionUpdate(req, supabaseClient)
      
      case 'POST:handle-subscription-deleted':
        return await handleSubscriptionDeleted(req, supabaseClient)
      
      case 'POST:handle-payment-succeeded':
        return await handlePaymentSucceeded(req, supabaseClient)
      
      case 'POST:handle-payment-failed':
        return await handlePaymentFailed(req, supabaseClient)
      
      case 'GET:user-subscription':
        return await getUserSubscription(req, supabaseClient)
      
      case 'POST:cancel-subscription':
        return await cancelSubscription(req, supabaseClient)
      
      case 'POST:upsert-subscription':
        return await upsertSubscription(req, supabaseClient)
      
      case 'POST:update-subscription-status':
        return await updateSubscriptionStatus(req, supabaseClient)

      default:
        return new Response('Not Found', { status: 404, headers: corsHeaders })
    }
  } catch (error) {
    console.error('Subscription management error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/*
 * CONVERTED FROM: handleSubscriptionUpdate (Convex internal mutation)
 * USAGE: POST /subscription-management/handle-subscription-update
 * 
 * CONVERSION NOTES:
 * - Used by webhook handlers for subscription events
 * - Finds user by Stripe customer ID
 * - Updates or creates subscription record
 * - Updates user premium status based on subscription status
 */
async function handleSubscriptionUpdate(req: Request, supabaseClient: any) {
  const { subscription } = await req.json()
  
  if (!subscription) {
    return new Response(
      JSON.stringify({ error: 'subscription data required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Find user by Stripe customer ID
  const { data: user, error: userError } = await supabaseClient
    .from('users')
    .select('id')
    .eq('stripe_customer_id', subscription.customer)
    .single()

  if (userError) {
    console.error(`User not found for customer ID: ${subscription.customer}`)
    return new Response(
      JSON.stringify({ error: 'User not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Update or create subscription record
  const { data: existingSubscription } = await supabaseClient
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  const subscriptionData = {
    user_id: user.id,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }

  if (existingSubscription) {
    await supabaseClient
      .from('subscriptions')
      .update(subscriptionData)
      .eq('id', existingSubscription.id)
  } else {
    await supabaseClient
      .from('subscriptions')
      .insert(subscriptionData)
  }

  // Update user premium status
  const isPremium = subscription.status === 'active' || subscription.status === 'trialing'
  const premiumExpiry = isPremium ? new Date(subscription.current_period_end * 1000).toISOString() : null

  await supabaseClient
    .from('users')
    .update({
      is_premium: isPremium,
      premium_expiry: premiumExpiry,
      stripe_subscription_id: subscription.id,
    })
    .eq('id', user.id)

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CONVERTED FROM: handleSubscriptionDeleted (Convex internal mutation)
 * USAGE: POST /subscription-management/handle-subscription-deleted
 */
async function handleSubscriptionDeleted(req: Request, supabaseClient: any) {
  const { subscription } = await req.json()
  
  // Find user by Stripe customer ID
  const { data: user, error: userError } = await supabaseClient
    .from('users')
    .select('id')
    .eq('stripe_customer_id', subscription.customer)
    .single()

  if (userError) {
    console.error(`User not found for customer ID: ${subscription.customer}`)
    return new Response(
      JSON.stringify({ error: 'User not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Update subscription record
  const { data: existingSubscription } = await supabaseClient
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', subscription.id)
    .single()

  if (existingSubscription) {
    await supabaseClient
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSubscription.id)
  }

  // Update user premium status
  await supabaseClient
    .from('users')
    .update({
      is_premium: false,
      premium_expiry: null,
    })
    .eq('id', user.id)

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CONVERTED FROM: handlePaymentSucceeded (Convex internal mutation)
 * USAGE: POST /subscription-management/handle-payment-succeeded
 */
async function handlePaymentSucceeded(req: Request, supabaseClient: any) {
  const { invoice } = await req.json()
  
  if (!invoice.subscription) {
    return new Response(
      JSON.stringify({ success: true, message: 'No subscription associated with invoice' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Find user by Stripe customer ID
  const { data: user, error: userError } = await supabaseClient
    .from('users')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single()

  if (userError) {
    console.error(`User not found for customer ID: ${invoice.customer}`)
    return new Response(
      JSON.stringify({ error: 'User not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Ensure user has premium access
  await supabaseClient
    .from('users')
    .update({
      is_premium: true,
      last_active: new Date().toISOString(),
    })
    .eq('id', user.id)

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CONVERTED FROM: handlePaymentFailed (Convex internal mutation)
 * USAGE: POST /subscription-management/handle-payment-failed
 */
async function handlePaymentFailed(req: Request, supabaseClient: any) {
  const { invoice } = await req.json()
  
  if (!invoice.subscription) {
    return new Response(
      JSON.stringify({ success: true, message: 'No subscription associated with invoice' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Find user by Stripe customer ID
  const { data: user, error: userError } = await supabaseClient
    .from('users')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single()

  if (userError) {
    console.error(`User not found for customer ID: ${invoice.customer}`)
    return new Response(
      JSON.stringify({ error: 'User not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Note: We do not immediately revoke premium status on payment failure
  // Stripe will handle subscription status updates through webhooks
  console.log(`Payment failed for user ${user.id}, subscription ${invoice.subscription}`)

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CONVERTED FROM: getUserSubscription (Convex query)
 * USAGE: GET /subscription-management/user-subscription?userId=123
 */
async function getUserSubscription(req: Request, supabaseClient: any) {
  const url = new URL(req.url)
  const userId = url.searchParams.get('userId')

  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'userId parameter required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data, error } = await supabaseClient
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'canceled')
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error finding subscription: ${error.message}`)
  }

  return new Response(
    JSON.stringify({ subscription: data || null }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CONVERTED FROM: cancelSubscription (Convex mutation)
 * USAGE: POST /subscription-management/cancel-subscription
 */
async function cancelSubscription(req: Request, supabaseClient: any) {
  const { userId } = await req.json()

  const { data: user, error: userError } = await supabaseClient
    .from('users')
    .select('stripe_subscription_id')
    .eq('id', userId)
    .single()

  if (userError || !user?.stripe_subscription_id) {
    return new Response(
      JSON.stringify({ error: 'No active subscription found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Cancel in Stripe
    await stripe.subscriptions.cancel(user.stripe_subscription_id)
    
    // The webhook will handle updating our database
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error canceling subscription:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to cancel subscription' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

/*
 * CONVERTED FROM: upsertSubscription (Convex internal mutation)
 * USAGE: POST /subscription-management/upsert-subscription
 */
async function upsertSubscription(req: Request, supabaseClient: any) {
  const {
    userId,
    stripeSubscriptionId,
    stripeCustomerId,
    status,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    canceledAt
  } = await req.json()

  const { data: existingSubscription } = await supabaseClient
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .single()

  const subscriptionData = {
    user_id: userId,
    stripe_subscription_id: stripeSubscriptionId,
    stripe_customer_id: stripeCustomerId,
    status,
    current_period_start: new Date(currentPeriodStart).toISOString(),
    current_period_end: new Date(currentPeriodEnd).toISOString(),
    cancel_at_period_end: cancelAtPeriodEnd,
    canceled_at: canceledAt ? new Date(canceledAt).toISOString() : null,
    updated_at: new Date().toISOString(),
  }

  if (existingSubscription) {
    await supabaseClient
      .from('subscriptions')
      .update(subscriptionData)
      .eq('id', existingSubscription.id)
  } else {
    await supabaseClient
      .from('subscriptions')
      .insert(subscriptionData)
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CONVERTED FROM: updateSubscriptionStatus (Convex internal mutation)
 * USAGE: POST /subscription-management/update-subscription-status
 */
async function updateSubscriptionStatus(req: Request, supabaseClient: any) {
  const { stripeSubscriptionId, status, canceledAt } = await req.json()

  const { data: subscription } = await supabaseClient
    .from('subscriptions')
    .select('id')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .single()

  if (subscription) {
    await supabaseClient
      .from('subscriptions')
      .update({
        status,
        canceled_at: canceledAt ? new Date(canceledAt).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CLIENT-SIDE USAGE EXAMPLES:
 * 
 * // Get user subscription (could be direct client call):
 * const { data } = await supabase
 *   .from('subscriptions')
 *   .select('*')
 *   .eq('user_id', userId)
 *   .neq('status', 'canceled')
 *   .single()
 * 
 * // Cancel subscription (requires Edge Function for Stripe API):
 * const response = await fetch('/functions/v1/subscription-management/cancel-subscription', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ userId })
 * })
 */