import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@13.11.0'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
    }

    const body = await req.text()
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return new Response('Missing stripe signature', { status: 400, headers: corsHeaders })
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
      )
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response('Webhook signature verification failed', { 
        status: 400, 
        headers: corsHeaders 
      })
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Get customer to find telegram_id
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        
        if (!customer || customer.deleted) {
          throw new Error('Customer not found')
        }

        const telegramId = (customer as Stripe.Customer).metadata?.telegram_id

        if (!telegramId) {
          throw new Error('Telegram ID not found in customer metadata')
        }

        // Update user subscription status
        const { error } = await supabase
          .from('users')
          .update({
            is_premium: subscription.status === 'active',
            premium_expiry: subscription.status === 'active' 
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null
          })
          .eq('telegram_id', telegramId)

        if (error) throw error

        console.log(`Updated subscription for user ${telegramId}: ${subscription.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        const customer = await stripe.customers.retrieve(subscription.customer as string)
        
        if (!customer || customer.deleted) {
          throw new Error('Customer not found')
        }

        const telegramId = (customer as Stripe.Customer).metadata?.telegram_id

        if (!telegramId) {
          throw new Error('Telegram ID not found in customer metadata')
        }

        // Remove premium status
        const { error } = await supabase
          .from('users')
          .update({
            is_premium: false,
            premium_expiry: null
          })
          .eq('telegram_id', telegramId)

        if (error) throw error

        console.log(`Removed premium status for user ${telegramId}`)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`Payment succeeded for invoice ${invoice.id}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`Payment failed for invoice ${invoice.id}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in stripe-webhook function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})