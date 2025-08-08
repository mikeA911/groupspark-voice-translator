import Stripe from 'stripe';
import { PaymentError } from '../middleware/errorHandler.js';
import { supabase, supabaseAdmin, querySupabase } from '../config/supabase.js';

class PaymentService {
  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }
    
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Create payment intent for credit purchase
   */
  async createPaymentIntent(paymentData) {
    const {
      amount, // in cents
      currency = 'usd',
      customer_email,
      metadata = {}
    } = paymentData;

    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        receipt_email: customer_email,
        metadata: {
          customer_email,
          service: 'GroupSpark Credit Purchase',
          ...metadata
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency,
      };
    } catch (error) {
      console.error('Stripe payment intent creation failed:', error);
      throw new PaymentError('Failed to create payment intent', {
        stripe_error: error.message,
        code: error.code
      });
    }
  }

  /**
   * Confirm payment and process credit purchase
   */
  async confirmPayment(paymentIntentId, purchaseData) {
    try {
      // Retrieve payment intent from Stripe
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status !== 'succeeded') {
        throw new PaymentError('Payment has not succeeded', {
          status: paymentIntent.status
        });
      }

      // Record the transaction in Supabase
      const transactionResult = await querySupabase(async (client) => {
        return await client
          .from('transactions')
          .insert({
            type: 'purchase',
            amount: paymentIntent.amount / 100,
            credits: purchaseData.credits,
            customer_email: purchaseData.customer_email,
            product_id: purchaseData.product_id,
            stripe_payment_intent_id: paymentIntentId,
            status: 'completed',
            metadata: {
              package_name: purchaseData.package_name,
              stripe_payment_method: paymentIntent.payment_method,
              credits: purchaseData.credits
            },
            completed_at: new Date().toISOString()
          })
          .select()
          .single();
      }, true); // Use service role for admin operations

      if (transactionResult.error) {
        throw new PaymentError('Failed to record transaction', {
          error: transactionResult.error.message
        });
      }

      // Generate credit codes
      const codes = await this.generateCreditCodes({
        ...purchaseData,
        transaction_id: transactionResult.data.id
      });

      const result = {
        transaction: transactionResult.data,
        codes
      };

      // Send confirmation email
      await this.sendPurchaseConfirmation({
        customer_email: purchaseData.customer_email,
        transaction: result.transaction,
        codes: result.codes
      });

      return result;

    } catch (error) {
      console.error('Payment confirmation failed:', error);
      
      if (error instanceof PaymentError) {
        throw error;
      }
      
      throw new PaymentError('Failed to confirm payment', {
        payment_intent_id: paymentIntentId,
        error: error.message
      });
    }
  }

  /**
   * Generate credit codes after successful payment
   */
  async generateCreditCodes(codeData) {
    const {
      credits,
      product_id,
      customer_email,
      transaction_id,
      quantity = 1
    } = codeData;

    const codes = [];
    const expiresAt = this.calculateExpirationDate();
    
    for (let i = 0; i < quantity; i++) {
      try {
        // Generate unique code using Supabase RPC function
        const { data: code, error: codeError } = await supabaseAdmin.rpc('generate_credit_code');
        
        if (codeError || !code) {
          console.error('Failed to generate credit code:', codeError);
          throw new PaymentError('Failed to generate unique credit code');
        }

        // Insert credit code into Supabase
        const { data: creditCode, error: insertError } = await supabaseAdmin
          .from('credit_codes')
          .insert({
            code: code,
            credits: credits,
            product_id: product_id,
            customer_email: customer_email,
            purchase_price: codeData.purchase_price || 0,
            expires_at: expiresAt.toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('Failed to insert credit code:', insertError);
          throw new PaymentError('Failed to create credit code record');
        }

        codes.push(creditCode);
      } catch (error) {
        console.error('Error generating credit code:', error);
        // Continue with other codes, but log the failure
      }
    }

    if (codes.length === 0) {
      throw new PaymentError('Failed to generate any credit codes');
    }

    return codes;
  }

  /**
   * Calculate credit code expiration date (1 year from now)
   */
  calculateExpirationDate() {
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    return expirationDate;
  }

  /**
   * Send purchase confirmation email
   */
  async sendPurchaseConfirmation(confirmationData) {
    // This will be implemented with SendGrid or similar
    // For now, just log the confirmation
    console.log('📧 Purchase confirmation email:', {
      to: confirmationData.customer_email,
      subject: 'GroupSpark Credit Purchase Confirmation',
      credits: confirmationData.codes.reduce((sum, code) => sum + code.credits, 0),
      codes: confirmationData.codes.map(code => code.code)
    });

    // TODO: Implement actual email sending
    // await EmailService.sendPurchaseConfirmation(confirmationData);
  }

  /**
   * Handle Stripe webhooks
   */
  async handleWebhook(event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object);
          break;
        
        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object);
          break;
        
        case 'charge.dispute.created':
          await this.handleChargeDispute(event.data.object);
          break;
        
        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      console.error('Webhook handling error:', error);
      throw error;
    }
  }

  /**
   * Handle successful payment intent webhook
   */
  async handlePaymentIntentSucceeded(paymentIntent) {
    console.log('💳 Payment succeeded:', paymentIntent.id);
    
    // Update transaction status
    await query(`
      UPDATE transactions 
      SET status = 'completed', processed_at = NOW()
      WHERE stripe_payment_intent_id = $1
    `, [paymentIntent.id]);
  }

  /**
   * Handle failed payment intent webhook
   */
  async handlePaymentIntentFailed(paymentIntent) {
    console.log('💳 Payment failed:', paymentIntent.id);
    
    // Update transaction status
    await query(`
      UPDATE transactions 
      SET status = 'failed', processed_at = NOW()
      WHERE stripe_payment_intent_id = $1
    `, [paymentIntent.id]);
  }

  /**
   * Handle charge dispute webhook
   */
  async handleChargeDispute(dispute) {
    console.log('🚨 Charge dispute created:', dispute.id);
    
    // Log the dispute for admin review
    await query(`
      INSERT INTO audit_logs (action, resource_type, metadata)
      VALUES ($1, $2, $3)
    `, [
      'charge_dispute_created',
      'stripe_dispute',
      JSON.stringify({
        dispute_id: dispute.id,
        charge_id: dispute.charge,
        amount: dispute.amount,
        reason: dispute.reason,
        status: dispute.status
      })
    ]);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!endpointSecret) {
      throw new Error('Stripe webhook secret is not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(payload, signature, endpointSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw new PaymentError('Invalid webhook signature');
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(dateRange = {}) {
    const { start_date, end_date } = dateRange;
    let whereClause = "WHERE type = 'purchase' AND status = 'completed'";
    const params = [];

    if (start_date) {
      whereClause += ` AND created_at >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      whereClause += ` AND created_at <= $${params.length + 1}`;
      params.push(end_date);
    }

    const result = await query(`
      SELECT 
        COUNT(*) as total_transactions,
        SUM(amount) as total_revenue,
        SUM(credits) as total_credits_sold,
        AVG(amount) as average_transaction_value
      FROM transactions
      ${whereClause}
    `, params);

    return result.rows[0];
  }
}

export default new PaymentService();