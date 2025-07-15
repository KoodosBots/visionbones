/*
 * WEBHOOK HANDLING FUNCTIONS - Supabase Edge Function
 * 
 * CONVERSION STRATEGY:
 * - Convex httpAction → Supabase Edge Function
 * - Stripe webhook verification preserved
 * - Event logging and deduplication maintained
 * - Calls to other functions converted to function invocations
 * 
 * ORIGINAL CONVEX FUNCTIONS CONVERTED:
 * - webhookHandler (httpAction from stripe.ts) → Main webhook Edge Function
 * - getWebhookEvent (internal query) → Database query
 * - logWebhookEvent (internal mutation) → Database insert
 * - markEventProcessed (internal mutation) → Database update
 * - logWebhookError (internal mutation) → Database update
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
      case 'POST:stripe':
        return await handleStripeWebhook(req, supabaseClient)
      
      case 'GET:event':
        return await getWebhookEvent(req, supabaseClient)
      
      case 'POST:log-event':
        return await logWebhookEvent(req, supabaseClient)
      
      case 'POST:mark-processed':
        return await markEventProcessed(req, supabaseClient)
      
      case 'POST:log-error':
        return await logWebhookError(req, supabaseClient)

      default:
        return new Response('Not Found', { status: 404, headers: corsHeaders })
    }
  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/*
 * CONVERTED FROM: webhookHandler (Convex httpAction)
 * USAGE: POST /webhook-handlers/stripe
 * 
 * CONVERSION NOTES:
 * - Main Stripe webhook endpoint
 * - Verifies webhook signature
 * - Handles event deduplication
 * - Routes to appropriate handlers
 * - Error logging and recovery
 */
async function handleStripeWebhook(req: Request, supabaseClient: any) {
  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 })
  }

  let event: Stripe.Event

  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  // Check if we have already processed this event
  const { data: existingEvent } = await supabaseClient
    .from('webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single()

  if (existingEvent) {
    return new Response('Event already processed', { status: 200 })
  }

  // Log the webhook event
  await supabaseClient
    .from('webhook_events')
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processed: false,
    })

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionEvent(event.data.object as Stripe.Subscription, 'update')
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event.data.object as Stripe.Subscription, 'delete')
        break

      case 'invoice.payment_succeeded':
        await handlePaymentEvent(event.data.object as Stripe.Invoice, 'succeeded')
        break

      case 'invoice.payment_failed':
        await handlePaymentEvent(event.data.object as Stripe.Invoice, 'failed')
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Mark event as processed
    await supabaseClient
      .from('webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('stripe_event_id', event.id)

    return new Response('Webhook processed successfully', { status: 200 })
  } catch (error) {
    console.error('Error processing webhook:', error)
    
    // Log the error
    await supabaseClient
      .from('webhook_events')
      .update({
        error: error instanceof Error ? error.message : 'Unknown error',
        processed_at: new Date().toISOString(),
      })
      .eq('stripe_event_id', event.id)

    return new Response('Error processing webhook', { status: 500 })
  }
}

/*
 * Helper function to handle subscription events
 * Calls the subscription management Edge Function
 */
async function handleSubscriptionEvent(subscription: Stripe.Subscription, type: 'update' | 'delete') {
  const endpoint = type === 'update' 
    ? '/functions/v1/subscription-management/handle-subscription-update'
    : '/functions/v1/subscription-management/handle-subscription-deleted'

  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({ subscription }),
  })

  if (!response.ok) {
    throw new Error(`Failed to handle subscription ${type}: ${response.statusText}`)
  }
}

/*
 * Helper function to handle payment events
 * Calls the subscription management Edge Function
 */
async function handlePaymentEvent(invoice: Stripe.Invoice, type: 'succeeded' | 'failed') {
  const endpoint = type === 'succeeded'
    ? '/functions/v1/subscription-management/handle-payment-succeeded'
    : '/functions/v1/subscription-management/handle-payment-failed'

  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({ invoice }),
  })

  if (!response.ok) {
    throw new Error(`Failed to handle payment ${type}: ${response.statusText}`)
  }
}

/*
 * CONVERTED FROM: getWebhookEvent (Convex internal query)
 * USAGE: GET /webhook-handlers/event?eventId=evt_123
 */
async function getWebhookEvent(req: Request, supabaseClient: any) {
  const url = new URL(req.url)
  const eventId = url.searchParams.get('eventId')

  if (!eventId) {
    return new Response(
      JSON.stringify({ error: 'eventId parameter required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data, error } = await supabaseClient
    .from('webhook_events')
    .select('*')
    .eq('stripe_event_id', eventId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Error finding webhook event: ${error.message}`)
  }

  return new Response(
    JSON.stringify({ event: data || null }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CONVERTED FROM: logWebhookEvent (Convex internal mutation)
 * USAGE: POST /webhook-handlers/log-event
 */
async function logWebhookEvent(req: Request, supabaseClient: any) {
  const { eventId, eventType } = await req.json()

  const { data, error } = await supabaseClient
    .from('webhook_events')
    .insert({
      stripe_event_id: eventId,
      event_type: eventType,
      processed: false,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Error logging webhook event: ${error.message}`)
  }

  return new Response(
    JSON.stringify({ eventLogId: data.id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CONVERTED FROM: markEventProcessed (Convex internal mutation)
 * USAGE: POST /webhook-handlers/mark-processed
 */
async function markEventProcessed(req: Request, supabaseClient: any) {
  const { eventId } = await req.json()

  const { data: event } = await supabaseClient
    .from('webhook_events')
    .select('id')
    .eq('stripe_event_id', eventId)
    .single()

  if (event) {
    await supabaseClient
      .from('webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('id', event.id)
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * CONVERTED FROM: logWebhookError (Convex internal mutation)
 * USAGE: POST /webhook-handlers/log-error
 */
async function logWebhookError(req: Request, supabaseClient: any) {
  const { eventId, error } = await req.json()

  const { data: event } = await supabaseClient
    .from('webhook_events')
    .select('id')
    .eq('stripe_event_id', eventId)
    .single()

  if (event) {
    await supabaseClient
      .from('webhook_events')
      .update({
        error,
        processed_at: new Date().toISOString(),
      })
      .eq('id', event.id)
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/*
 * DEPLOYMENT NOTES:
 * 
 * 1. Configure Stripe webhook endpoint to point to:
 *    https://your-project.supabase.co/functions/v1/webhook-handlers/stripe
 * 
 * 2. Required environment variables:
 *    - STRIPE_SECRET_KEY
 *    - STRIPE_WEBHOOK_SECRET
 *    - SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY
 * 
 * 3. Webhook events to subscribe to:
 *    - customer.subscription.created
 *    - customer.subscription.updated
 *    - customer.subscription.deleted
 *    - invoice.payment_succeeded
 *    - invoice.payment_failed
 */