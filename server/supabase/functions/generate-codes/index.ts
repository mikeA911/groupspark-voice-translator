// Supabase Edge Function for generating credit codes
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse request body
    const { 
      quantity = 1, 
      credits, 
      product_id, 
      distributor_id,
      purchase_price,
      wholesale_price,
      expires_days = 365
    } = await req.json()

    // Validate required fields
    if (!credits || !product_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: credits, product_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Verify user has permission (is admin or owns the distributor)
    if (distributor_id) {
      const { data: distributor, error: distError } = await supabaseClient
        .from('distributors')
        .select('user_id, status')
        .eq('id', distributor_id)
        .single()

      if (distError || !distributor) {
        return new Response(
          JSON.stringify({ error: 'Invalid distributor ID' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      if (distributor.user_id !== user.id) {
        // Check if user is admin
        const { data: adminRole } = await supabaseClient
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single()

        if (!adminRole) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          )
        }
      }

      if (distributor.status !== 'approved') {
        return new Response(
          JSON.stringify({ error: 'Distributor not approved' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
    }

    // Generate credit codes
    const codes = []
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expires_days)

    for (let i = 0; i < quantity; i++) {
      // Generate unique code using RPC function
      const { data: code, error: codeError } = await supabaseClient
        .rpc('generate_credit_code')

      if (codeError || !code) {
        console.error('Error generating code:', codeError)
        continue
      }

      // Insert credit code
      const { data: insertedCode, error: insertError } = await supabaseClient
        .from('credit_codes')
        .insert({
          code,
          credits,
          product_id,
          distributor_id,
          purchase_price,
          wholesale_price,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error inserting code:', insertError)
        continue
      }

      codes.push({
        id: insertedCode.id,
        code: insertedCode.code,
        credits: insertedCode.credits,
        expires_at: insertedCode.expires_at
      })
    }

    // Update distributor inventory if applicable
    if (distributor_id && codes.length > 0) {
      const totalCredits = codes.length * credits
      try {
        await supabaseClient.rpc('update_distributor_inventory', {
          dist_id: distributor_id,
          prod_id: product_id,
          credits_purchased: totalCredits
        })
      } catch (invError) {
        console.error('Error updating inventory:', invError)
        // Don't fail the request if inventory update fails
      }
    }

    // Log the generation in audit table
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'generate_credit_codes',
        resource_type: 'credit_codes',
        new_values: {
          quantity: codes.length,
          credits,
          product_id,
          distributor_id
        }
      })

    return new Response(
      JSON.stringify({
        success: true,
        codes,
        generated_count: codes.length,
        requested_count: quantity
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in generate-codes function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})