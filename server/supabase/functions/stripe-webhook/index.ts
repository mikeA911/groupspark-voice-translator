// Supabase Edge Function for handling Stripe webhooks
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.17.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify webhook signature
    const signature = req.headers.get('stripe-signature')
    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!signature || !webhookSecret) {
      return new Response('Missing signature or webhook secret', { status: 400 })
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return new Response('Invalid signature', { status: 400 })
    }

    console.log('Processing webhook event:', event.type)

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, supabaseClient)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, supabaseClient)
        break

      case 'charge.dispute.created':
        await handleChargeDispute(event.data.object as Stripe.Charge, supabaseClient)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Webhook handling error:', error)
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  console.log('💳 Payment succeeded:', paymentIntent.id)

  try {
    // Find the transaction record
    const { data: transaction, error: findError } = await supabase
      .from('transactions')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single()

    if (findError || !transaction) {
      console.error('Transaction not found for payment intent:', paymentIntent.id)
      return
    }

    // Update transaction status
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', transaction.id)

    if (updateError) {
      console.error('Error updating transaction status:', updateError)
      return
    }

    // If this was a direct customer purchase (no distributor), generate credit codes
    if (!transaction.distributor_id && transaction.type === 'purchase') {
      await generateCreditCodesForDirectPurchase(transaction, supabase)
    }

    console.log('✅ Payment processed successfully for transaction:', transaction.id)

  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  console.log('💳 Payment failed:', paymentIntent.id)

  try {
    // Update transaction status
    const { error } = await supabase
      .from('transactions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)

    if (error) {
      console.error('Error updating failed transaction:', error)
    }

  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}

async function handleChargeDispute(charge: Stripe.Charge, supabase: any) {
  console.log('🚨 Charge dispute created for charge:', charge.id)

  try {
    // Log the dispute in audit table
    await supabase
      .from('audit_logs')
      .insert({
        action: 'charge_dispute_created',
        resource_type: 'stripe_dispute',
        new_values: {
          charge_id: charge.id,
          payment_intent_id: charge.payment_intent,
          amount: charge.amount,
          currency: charge.currency,
          dispute_reason: charge.dispute?.reason
        }
      })

  } catch (error) {
    console.error('Error logging dispute:', error)
  }
}

async function generateCreditCodesForDirectPurchase(transaction: any, supabase: any) {
  try {
    // Get credit package details from metadata
    const metadata = transaction.metadata
    if (!metadata?.package_id || !metadata?.credits) {
      console.error('Missing package information in transaction metadata')
      return
    }

    // Generate credit code
    const { data: code, error: codeError } = await supabase
      .rpc('generate_credit_code')

    if (codeError || !code) {
      console.error('Error generating credit code:', codeError)
      return
    }

    // Calculate expiration date (1 year from now)
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    // Insert credit code
    const { data: creditCode, error: insertError } = await supabase
      .from('credit_codes')
      .insert({
        code,
        credits: metadata.credits,
        product_id: transaction.product_id,
        customer_email: transaction.customer_email,
        purchase_price: transaction.amount,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting credit code:', insertError)
      return
    }

    console.log('✅ Credit code generated for direct purchase:', creditCode.code)

    // Here you would typically send an email with the credit code
    // For now, we'll just log it
    console.log('📧 Should send email to:', transaction.customer_email, 'with code:', creditCode.code)

  } catch (error) {
    console.error('Error generating credit codes for direct purchase:', error)
  }
}