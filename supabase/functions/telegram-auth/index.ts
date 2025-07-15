import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { validateTelegramWebApp } from '../_shared/telegram.ts'

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

    const { initData } = await req.json()

    if (!initData) {
      return new Response('Missing initData', { status: 400, headers: corsHeaders })
    }

    // Validate Telegram WebApp data
    const telegramData = validateTelegramWebApp(initData)
    
    if (!telegramData || !telegramData.user) {
      return new Response('Invalid Telegram data', { status: 401, headers: corsHeaders })
    }

    const { user } = telegramData

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', user.id.toString())
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    let userData
    if (existingUser) {
      // Update existing user
      const { data, error } = await supabase
        .from('users')
        .update({
          username: user.username || `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`,
          last_active: new Date().toISOString()
        })
        .eq('telegram_id', user.id.toString())
        .select()
        .single()

      if (error) throw error
      userData = data
    } else {
      // Create new user
      const { data, error } = await supabase
        .from('users')
        .insert({
          telegram_id: user.id.toString(),
          username: user.username || `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`,
          selected_platform: null,
          platform_username: null,
          is_premium: false,
          verified_badge: false,
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      userData = data
    }

    return new Response(
      JSON.stringify({ 
        user: userData,
        telegram_user: user
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in telegram-auth function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})