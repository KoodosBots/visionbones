/*
 * CHECKOUT FUNCTIONS - Supabase Edge Function
 * 
 * CONVERSION STRATEGY:
 * - Convex checkout mutations → Edge Functions (Stripe API required)
 * - Stripe SDK integration preserved
 * - Customer creation and session handling maintained
 * 
 * ORIGINAL CONVEX FUNCTIONS CONVERTED:
 * - createCheckoutSession (mutation) → Edge Function
 * - createPortalSession (mutation) → Edge Function
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
        }
        Update: {
          stripe_customer_id?: string | null
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { method } = req
    const url = new URL(req.url)
    const path = url.pathname.split('/').pop()

    switch (`${method}:${path}`) {
      case 'POST:create-session':
        return await createCheckoutSession(req, supabaseClient)
      
      case 'POST:create-portal':
        return await createPortalSession(req, supabaseClient)

      default:
        return new Response('Not Found', { status: 404, headers: corsHeaders })
    }
  } catch (error) {
    console.error('Checkout error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/*
 * CONVERTED FROM: createCheckoutSession (Convex mutation)
 * USAGE: POST /checkout/create-session
 * 
 * CONVERSION NOTES:
 * - Gets user from Supabase instead of Convex
 * - Creates Stripe customer if needed
 * - Updates user record with Stripe customer ID
 * - Creates checkout session with same configuration
 */
async function createCheckoutSession(req: Request, supabaseClient: any) {
  const { userId, telegramId, successUrl, cancelUrl } = await req.json()

  if (!userId || !telegramId || !successUrl || !cancelUrl) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: user, error: userError } = await supabaseClient
    .from('users')
    .select('id, stripe_customer_id')
    .eq('id', userId)
    .single()

  if (userError) {
    return new Response(
      JSON.stringify({ error: 'User not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let customerId = user.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: {
        telegramId,
        userId,
      },
    })
    
    customerId = customer.id
    
    await supabaseClient
      .from('users')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'VisionBones Premium',
            description: 'Premium features for VisionBones domino leaderboards',
          },
          unit_amount: 499, // $4.99
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      telegramId,
    },
  })

  return new Response(
    JSON.stringify({
      sessionId: session.id,
      url: session.url,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CONVERTED FROM: createPortalSession (Convex mutation)
 * USAGE: POST /checkout/create-portal
 * 
 * CONVERSION NOTES:
 * - Gets user from Supabase instead of Convex
 * - Creates Stripe billing portal session
 * - Returns portal URL for subscription management
 */
async function createPortalSession(req: Request, supabaseClient: any) {
  const { userId, returnUrl } = await req.json()

  if (!userId || !returnUrl) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: user, error: userError } = await supabaseClient
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (userError || !user?.stripe_customer_id) {
    return new Response(
      JSON.stringify({ error: 'No Stripe customer found for user' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: returnUrl,
  })

  return new Response(
    JSON.stringify({
      url: session.url,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CLIENT-SIDE USAGE EXAMPLES:
 * 
 * // Create checkout session:
 * const response = await fetch('/functions/v1/checkout/create-session', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     userId: 'user-uuid',
 *     telegramId: '123456789',
 *     successUrl: 'https://app.com/success',
 *     cancelUrl: 'https://app.com/cancel'
 *   })
 * })
 * const { sessionId, url } = await response.json()
 * 
 * // Create portal session:
 * const response = await fetch('/functions/v1/checkout/create-portal', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     userId: 'user-uuid',
 *     returnUrl: 'https://app.com/settings'
 *   })
 * })
 * const { url } = await response.json()
 */