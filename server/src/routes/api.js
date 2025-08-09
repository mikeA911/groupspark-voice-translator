import express from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { paymentRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import PaymentService from '../services/PaymentService.js';
import { supabase, supabaseAdmin, querySupabase, executeRPC } from '../config/supabase.js';
import { getUserPreferences, updateUserPreferences, getSupportedLanguages } from '../controllers/preferencesController.js';

const router = express.Router();

/**
 * GET /api/products
 * Get all active products and their credit packages
 */
router.get('/products', asyncHandler(async (req, res) => {
  // Get active products with their credit packages from Supabase
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      id,
      name,
      description,
      credit_costs,
      status,
      created_at,
      credit_packages:credit_packages(
        id,
        name,
        credits,
        price,
        bonus_percent
      )
    `)
    .eq('status', 'active')
    .eq('credit_packages.is_active', true)
    .order('created_at', { ascending: false });

  if (productsError) {
    console.error('Error fetching products:', productsError);
    throw new Error('Failed to fetch products');
  }

  res.json({
    success: true,
    data: products || []
  });
}));

/**
 * POST /api/create-payment-intent
 * Create a payment intent for credit purchase
 */
router.post('/create-payment-intent', 
  paymentRateLimiter,
  [
    body('product_id').isUUID().withMessage('Valid product ID is required'),
    body('package_id').isUUID().withMessage('Valid package ID is required'),
    body('customer_email').isEmail().withMessage('Valid email is required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { product_id, package_id, customer_email } = req.body;

    // Verify product exists and is active
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, description, status')
      .eq('id', product_id)
      .eq('status', 'active')
      .single();

    if (productError || !product) {
      throw new NotFoundError('Product not found or inactive');
    }

    // Get package details
    const { data: creditPackage, error: packageError } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('id', package_id)
      .eq('product_id', product_id)
      .eq('is_active', true)
      .single();

    if (packageError || !creditPackage) {
      throw new NotFoundError('Credit package not found');
    }

    // Create payment intent
    const paymentIntent = await PaymentService.createPaymentIntent({
      amount: creditPackage.price,
      customer_email,
      metadata: {
        product_id,
        package_id,
        product_name: product.name,
        package_name: creditPackage.name,
        credits: creditPackage.credits
      }
    });

    res.json({
      success: true,
      data: {
        client_secret: paymentIntent.client_secret,
        payment_intent_id: paymentIntent.payment_intent_id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        product: {
          name: product.name,
          description: product.description
        },
        package: creditPackage
      }
    });
  })
);

/**
 * POST /api/confirm-payment
 * Confirm payment and generate credit codes
 */
router.post('/confirm-payment',
  strictRateLimiter,
  [
    body('payment_intent_id').notEmpty().withMessage('Payment intent ID is required'),
    body('customer_email').isEmail().withMessage('Valid email is required'),
    body('product_id').isUUID().withMessage('Valid product ID is required'),
    body('package_id').isUUID().withMessage('Valid package ID is required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { payment_intent_id, customer_email, product_id, package_id } = req.body;

    // Get package details for credit generation
    const { data: creditPackage, error: packageError } = await supabase
      .from('credit_packages')
      .select(`
        *,
        products(name)
      `)
      .eq('id', package_id)
      .eq('product_id', product_id)
      .eq('is_active', true)
      .single();

    if (packageError || !creditPackage) {
      throw new NotFoundError('Credit package not found');
    }

    // Confirm payment and generate codes
    const result = await PaymentService.confirmPayment(payment_intent_id, {
      customer_email,
      product_id,
      credits: creditPackage.credits,
      package_name: creditPackage.name,
      purchase_price: creditPackage.price
    });

    res.json({
      success: true,
      data: {
        transaction_id: result.transaction.id,
        credits_purchased: creditPackage.credits,
        codes: result.codes.map(code => ({
          code: code.code,
          credits: code.credits,
          expires_at: code.expires_at
        }))
      }
    });
  })
);

/**
 * POST /api/redeem-code
 * Redeem a credit code
 */
router.post('/redeem-code',
  strictRateLimiter,
  [
    body('code').matches(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
      .withMessage('Invalid credit code format'),
    body('customer_email').isEmail().withMessage('Valid email is required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ValidationError('Validation failed', errors.array());
    }

    const { code, customer_email } = req.body;

    // Use Supabase RPC function to redeem the credit code
    try {
      const redemptionResult = await executeRPC('redeem_credit_code', {
        code_to_redeem: code,
        customer_identifier: customer_email
      }, true); // Use service role

      if (!redemptionResult.success) {
        throw new ValidationError(redemptionResult.error, {
          error_code: redemptionResult.error_code,
          ...(redemptionResult.redeemed_at && { redeemed_at: redemptionResult.redeemed_at })
        });
      }

      res.json({
        success: true,
        data: {
          credits: redemptionResult.credits,
          product: redemptionResult.product,
          redeemed_at: redemptionResult.redeemed_at
        }
      });

    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error('Error redeeming credit code:', error);
      throw new Error('Failed to redeem credit code');
    }
  })
);

/**
 * GET /api/validate-code/:code
 * Validate a credit code without redeeming it
 */
router.get('/validate-code/:code',
  asyncHandler(async (req, res) => {
    const { code } = req.params;

    // Validate code format
    if (!code.match(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
      throw new ValidationError('Invalid credit code format');
    }

    try {
      // Use Supabase RPC function to validate the credit code
      const validationResult = await executeRPC('validate_credit_code', {
        code_to_validate: code
      });

      res.json({
        success: true,
        data: {
          valid: validationResult.valid,
          credits: validationResult.credits || null,
          product: validationResult.product || null,
          expires_at: validationResult.expires_at || null,
          ...(validationResult.error && { 
            error: validationResult.error,
            error_code: validationResult.error_code,
            ...(validationResult.redeemed_at && { redeemed_at: validationResult.redeemed_at })
          })
        }
      });

    } catch (error) {
      console.error('Error validating credit code:', error);
      throw new Error('Failed to validate credit code');
    }
  })
);

/**
 * POST /api/webhook/stripe
 * Handle Stripe webhooks
 */
router.post('/webhook/stripe',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const signature = req.headers['stripe-signature'];
    
    try {
      const event = PaymentService.verifyWebhookSignature(req.body, signature);
      await PaymentService.handleWebhook(event);
      
      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: error.message });
    }
  })
);

/**
 * GET /api/stats
 * Get public statistics (for landing page)
 */
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    // Get basic platform statistics using Supabase queries
    const [
      { data: customerStats, error: customerError },
      { data: productStats, error: productError },
      { data: distributorStats, error: distributorError }
    ] = await Promise.all([
      // Customer and credit stats
      supabase.rpc('get_platform_analytics').catch(() => ({ data: null, error: 'Not admin' })),
      
      // Product stats
      supabase
        .from('products')
        .select('id', { count: 'exact' })
        .eq('status', 'active'),
      
      // Distributor stats  
      supabase
        .from('distributors')
        .select('id', { count: 'exact' })
        .eq('status', 'approved')
    ]);

    // Get public stats (non-admin version)
    const { data: creditStats, error: creditError } = await supabase
      .from('credit_codes')
      .select(`
        credits,
        is_redeemed,
        customer_email
      `);

    const uniqueCustomers = new Set(
      (creditStats || [])
        .filter(c => c.customer_email)
        .map(c => c.customer_email)
    ).size;

    const creditsRedeemed = (creditStats || [])
      .filter(c => c.is_redeemed)
      .reduce((sum, c) => sum + c.credits, 0);

    const codesRedeemed = (creditStats || [])
      .filter(c => c.is_redeemed).length;

    res.json({
      success: true,
      data: {
        total_customers: uniqueCustomers,
        credits_redeemed: creditsRedeemed,
        codes_redeemed: codesRedeemed,
        active_distributors: distributorStats?.count || 0,
        total_products: productStats?.count || 0
      }
    });

  } catch (error) {
    console.error('Error fetching public stats:', error);
    
    // Return default stats if there's an error
    res.json({
      success: true,
      data: {
        total_customers: 0,
        credits_redeemed: 0,
        codes_redeemed: 0,
        active_distributors: 0,
        total_products: 0
      }
    });
  }
}));

/**
 * User Preferences Routes
 */

/**
 * GET /api/preferences
 * Get current user's preferences (requires authentication)
 */
router.get('/preferences', requireAuth, asyncHandler(getUserPreferences));

/**
 * PUT /api/preferences
 * Update current user's preferences (requires authentication)
 */
router.put('/preferences', 
  requireAuth,
  [
    body('ui_language').optional().isString().withMessage('UI language must be a string'),
    body('preferences').optional().isObject().withMessage('Preferences must be an object'),
  ],
  asyncHandler(updateUserPreferences)
);

/**
 * GET /api/supported-languages
 * Get supported UI languages (public endpoint)
 */
router.get('/supported-languages', asyncHandler(getSupportedLanguages));

export default router;