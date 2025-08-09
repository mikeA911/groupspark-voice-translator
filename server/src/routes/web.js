import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { asyncHandler } from '../middleware/errorHandler.js';
import { supabase } from '../config/supabase.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up view engine (we'll use simple HTML for now)
const viewsPath = join(__dirname, '../../views');

/**
 * GET /
 * Homepage - Landing page for GroupSpark
 */
router.get('/', asyncHandler(async (req, res) => {
  // Get active products for the homepage
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, description, status, icon, created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  const productsData = products || [];
  
  // Simple HTML response (in production, you'd use a template engine)
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GroupSpark - AI-Powered Solutions</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem 0; }
        .nav { display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 1.8rem; font-weight: bold; }
        .nav-links { display: flex; gap: 2rem; list-style: none; }
        .nav-links a { color: white; text-decoration: none; transition: opacity 0.3s; }
        .nav-links a:hover { opacity: 0.8; }
        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 100px 0; }
        .hero h1 { font-size: 3.5rem; margin-bottom: 1rem; }
        .hero p { font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.9; }
        .btn { display: inline-block; background: white; color: #667eea; padding: 12px 30px; border-radius: 50px; text-decoration: none; font-weight: 600; transition: all 0.3s; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
        .btn-secondary { background: transparent; color: white; border: 2px solid white; }
        .section { padding: 80px 0; }
        .section h2 { font-size: 2.5rem; text-align: center; margin-bottom: 3rem; }
        .products { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-top: 2rem; }
        .product-card { background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); transition: transform 0.3s; }
        .product-card:hover { transform: translateY(-5px); }
        .product-icon { width: 64px; height: 64px; object-fit: contain; margin-bottom: 1rem; border-radius: 8px; }
        .product-card h3 { color: #667eea; margin-bottom: 1rem; }
        .product-card p { margin-bottom: 1.5rem; color: #666; }
        .features { background: #f8f9fa; }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; }
        .feature { text-align: center; padding: 1rem; }
        .feature-icon { font-size: 3rem; margin-bottom: 1rem; }
        .distributors { background: #667eea; color: white; text-align: center; }
        .distributors h2 { color: white; }
        footer { background: #333; color: white; text-align: center; padding: 2rem 0; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; margin: 3rem 0; }
        .stat { text-align: center; }
        .stat-number { font-size: 2.5rem; font-weight: bold; color: #667eea; }
        .stat-label { font-size: 0.9rem; color: #666; text-transform: uppercase; }
        .coming-soon { opacity: 0.6; }
        .coming-soon::after { content: " (Coming Soon)"; font-size: 0.8em; color: #666; }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <nav class="nav">
                <div class="logo">GroupSpark</div>
                <ul class="nav-links">
                    <li><a href="/">Home</a></li>
                    <li><a href="/products">Products</a></li>
                    <li><a href="/distributors">For Distributors</a></li>
                    <li><a href="/about">About</a></li>
                    <li><a href="/contact">Contact</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <section class="hero">
        <div class="container">
            <h1>AI-Powered Solutions for Everyone</h1>
            <p>Transform your workflow with our cutting-edge AI applications. Start with our AI Note & Translation app.</p>
            <a href="/buy-credits" class="btn">Buy Credits</a>
            <a href="/products" class="btn btn-secondary">Explore Products</a>
        </div>
    </section>

    <section class="section">
        <div class="container">
            <div class="stats">
                <div class="stat">
                    <div class="stat-number">10K+</div>
                    <div class="stat-label">Happy Customers</div>
                </div>
                <div class="stat">
                    <div class="stat-number">50+</div>
                    <div class="stat-label">Languages</div>
                </div>
                <div class="stat">
                    <div class="stat-number">100+</div>
                    <div class="stat-label">Distributors</div>
                </div>
                <div class="stat">
                    <div class="stat-number">99.9%</div>
                    <div class="stat-label">Uptime</div>
                </div>
            </div>
        </div>
    </section>

    <section class="section">
        <div class="container">
            <h2>Our Products</h2>
            <div class="products">
                ${productsData.map(product => `
                    <div class="product-card ${product.status === 'coming_soon' ? 'coming-soon' : ''}">
                        ${product.icon ? `<img src="${product.icon}" alt="${product.name} icon" class="product-icon">` : ''}
                        <h3>${product.name}</h3>
                        <p>${product.description}</p>
                        ${product.status === 'active' ? 
                            `<a href="/buy-credits?product=${product.id}" class="btn">Get Credits</a>` :
                            `<div class="btn" style="opacity: 0.5; cursor: not-allowed;">Coming Soon</div>`
                        }
                    </div>
                `).join('')}
            </div>
        </div>
    </section>

    <section class="section features">
        <div class="container">
            <h2>Why Choose GroupSpark?</h2>
            <div class="features-grid">
                <div class="feature">
                    <div class="feature-icon">🚀</div>
                    <h3>Lightning Fast</h3>
                    <p>Get results in seconds with our optimized AI processing</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🌍</div>
                    <h3>Global Reach</h3>
                    <p>Support for 50+ languages and growing worldwide</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">🔒</div>
                    <h3>Secure & Private</h3>
                    <p>Your data is protected with enterprise-grade security</p>
                </div>
                <div class="feature">
                    <div class="feature-icon">💳</div>
                    <h3>Pay-Per-Use</h3>
                    <p>Only pay for what you use with our flexible credit system</p>
                </div>
            </div>
        </div>
    </section>

    <section class="section distributors">
        <div class="container">
            <h2>Partner with GroupSpark</h2>
            <p style="font-size: 1.1rem; margin-bottom: 2rem;">Join our distributor network and earn commissions by selling credits to your customers</p>
            <a href="/distributors" class="btn">Become a Distributor</a>
        </div>
    </section>

    <footer>
        <div class="container">
            <p>&copy; 2024 GroupSpark. All rights reserved. | <a href="/privacy" style="color: white;">Privacy Policy</a> | <a href="/terms" style="color: white;">Terms of Service</a></p>
        </div>
    </footer>
</body>
</html>`;

  res.send(html);
}));

/**
 * GET /products
 * Products page
 */
router.get('/products', asyncHandler(async (req, res) => {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  const productsData = products || [];
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Products - GroupSpark</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem 0; }
        .nav { display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 1.8rem; font-weight: bold; }
        .nav-links { display: flex; gap: 2rem; list-style: none; }
        .nav-links a { color: white; text-decoration: none; transition: opacity 0.3s; }
        .nav-links a:hover { opacity: 0.8; }
        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 60px 0; }
        .hero h1 { font-size: 2.5rem; margin-bottom: 1rem; }
        .section { padding: 60px 0; }
        .products { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem; }
        .product-card { background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .product-icon { width: 80px; height: 80px; object-fit: contain; margin-bottom: 1rem; border-radius: 8px; }
        .product-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
        .product-card h3 { color: #667eea; margin-bottom: 0; font-size: 1.5rem; }
        .product-card p { margin-bottom: 1.5rem; color: #666; }
        .btn { display: inline-block; background: #667eea; color: white; padding: 12px 30px; border-radius: 50px; text-decoration: none; font-weight: 600; }
        .btn:hover { background: #5a6fd8; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; }
        .status-active { background: #28a745; color: white; }
        .status-coming-soon { background: #ffc107; color: #212529; }
        .credit-costs { background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; }
        .credit-costs h4 { margin-bottom: 0.5rem; color: #667eea; }
        .credit-costs ul { list-style: none; }
        .credit-costs li { padding: 0.25rem 0; }
        footer { background: #333; color: white; text-align: center; padding: 2rem 0; margin-top: 3rem; }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <nav class="nav">
                <div class="logo">GroupSpark</div>
                <ul class="nav-links">
                    <li><a href="/">Home</a></li>
                    <li><a href="/products">Products</a></li>
                    <li><a href="/distributors">For Distributors</a></li>
                    <li><a href="/about">About</a></li>
                    <li><a href="/contact">Contact</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <section class="hero">
        <div class="container">
            <h1>Our Products</h1>
            <p>Explore our suite of AI-powered applications</p>
        </div>
    </section>

    <section class="section">
        <div class="container">
            <div class="products">
                ${productsData.map(product => `
                    <div class="product-card">
                        <div class="product-header">
                            ${product.icon ? `<img src="${product.icon}" alt="${product.name} icon" class="product-icon">` : ''}
                            <div style="flex: 1;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                                    <h3>${product.name}</h3>
                                    <span class="status status-${product.status.replace('_', '-')}">${product.status.replace('_', ' ')}</span>
                                </div>
                            </div>
                        </div>
                        <p>${product.description}</p>
                        
                        ${product.status === 'active' && product.credit_costs ? `
                            <div class="credit-costs">
                                <h4>Credit Costs:</h4>
                                <ul>
                                    ${Object.entries(product.credit_costs).map(([action, cost]) => `
                                        <li><strong>${action.replace('_', ' ').toUpperCase()}:</strong> ${cost} credits</li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        
                        ${product.status === 'active' ? 
                            `<a href="/buy-credits?product=${product.id}" class="btn">Buy Credits</a>` :
                            `<div style="color: #666; font-style: italic;">Coming Soon</div>`
                        }
                    </div>
                `).join('')}
            </div>
        </div>
    </section>

    <footer>
        <div class="container">
            <p>&copy; 2024 GroupSpark. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>`;

  res.send(html);
}));

/**
 * GET /buy-credits
 * Credit purchase page
 */
router.get('/buy-credits', asyncHandler(async (req, res) => {
  const productId = req.query.product;
  let selectedProduct = null;
  let creditPackages = [];

  if (productId) {
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('status', 'active')
      .single();
    
    if (product) {
      selectedProduct = product;
      const { data: packages } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('product_id', productId)
        .eq('is_active', true)
        .order('credits');
      creditPackages = packages || [];
    }
  }

  if (!selectedProduct) {
    // Get the first active product as default
    const { data: activeProducts } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'active')
      .order('created_at')
      .limit(1);
    
    if (activeProducts && activeProducts.length > 0) {
      selectedProduct = activeProducts[0];
      const { data: packages } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('product_id', selectedProduct.id)
        .eq('is_active', true)
        .order('credits');
      creditPackages = packages || [];
    }
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Buy Credits - GroupSpark</title>
    <script src="https://js.stripe.com/v3/"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 800px; margin: 0 auto; padding: 0 20px; }
        header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem 0; }
        .nav { display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 1.8rem; font-weight: bold; }
        .nav-links { display: flex; gap: 2rem; list-style: none; }
        .nav-links a { color: white; text-decoration: none; transition: opacity 0.3s; }
        .nav-links a:hover { opacity: 0.8; }
        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 40px 0; }
        .hero h1 { font-size: 2rem; margin-bottom: 1rem; }
        .section { padding: 40px 0; }
        .packages { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0; }
        .package { background: white; border: 2px solid #e9ecef; border-radius: 10px; padding: 1.5rem; text-align: center; transition: all 0.3s; cursor: pointer; }
        .package:hover { border-color: #667eea; transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.1); }
        .package.selected { border-color: #667eea; background: #f8f9ff; }
        .package-credits { font-size: 2rem; font-weight: bold; color: #667eea; }
        .package-price { font-size: 1.2rem; margin: 0.5rem 0; }
        .package-value { font-size: 0.8rem; color: #666; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 600; }
        .form-group input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; }
        .btn { background: #667eea; color: white; padding: 15px 30px; border: none; border-radius: 50px; font-size: 1rem; font-weight: 600; cursor: pointer; width: 100%; }
        .btn:hover { background: #5a6fd8; }
        .btn:disabled { background: #ccc; cursor: not-allowed; }
        #card-element { padding: 12px; border: 1px solid #ddd; border-radius: 5px; background: white; }
        .card-errors { color: #dc3545; margin-top: 10px; }
        footer { background: #333; color: white; text-align: center; padding: 2rem 0; margin-top: 3rem; }
        .product-info { background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem; }
        .product-info-icon { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; }
        .product-info-text { flex: 1; }
        .loading { opacity: 0.7; pointer-events: none; }
        .success { background: #d4edda; color: #155724; padding: 1rem; border-radius: 5px; margin-bottom: 1rem; }
        .error { background: #f8d7da; color: #721c24; padding: 1rem; border-radius: 5px; margin-bottom: 1rem; }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <nav class="nav">
                <div class="logo">GroupSpark</div>
                <ul class="nav-links">
                    <li><a href="/">Home</a></li>
                    <li><a href="/products">Products</a></li>
                    <li><a href="/distributors">For Distributors</a></li>
                    <li><a href="/about">About</a></li>
                    <li><a href="/contact">Contact</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <section class="hero">
        <div class="container">
            <h1>Buy Credits</h1>
            <p>Purchase credits to use our AI-powered applications</p>
        </div>
    </section>

    <section class="section">
        <div class="container">
            <div id="messages"></div>
            
            ${selectedProduct ? `
                <div class="product-info">
                    ${selectedProduct.icon ? `<img src="${selectedProduct.icon}" alt="${selectedProduct.name} icon" class="product-info-icon">` : ''}
                    <div class="product-info-text">
                        <h3>${selectedProduct.name}</h3>
                        <p>${selectedProduct.description}</p>
                    </div>
                </div>
                
                <h3>Choose a Credit Package:</h3>
                <div class="packages">
                    ${creditPackages.map(pkg => `
                        <div class="package" data-package-id="${pkg.id}" data-price="${pkg.price}" data-credits="${pkg.credits}">
                            <div class="package-credits">${pkg.credits}</div>
                            <div class="package-label">Credits</div>
                            <div class="package-price">$${pkg.price.toFixed(2)}</div>
                            <div class="package-value">${Math.round(pkg.credits / pkg.price)} credits per dollar</div>
                        </div>
                    `).join('')}
                </div>

                <form id="payment-form">
                    <div class="form-group">
                        <label for="email">Email Address:</label>
                        <input type="email" id="email" required>
                    </div>

                    <div class="form-group">
                        <label for="card-element">Card Information:</label>
                        <div id="card-element"></div>
                        <div id="card-errors" class="card-errors"></div>
                    </div>

                    <button type="submit" id="submit-button" class="btn" disabled>
                        Complete Purchase
                    </button>
                </form>
            ` : `
                <p>No products available for purchase at this time.</p>
            `}
        </div>
    </section>

    <footer>
        <div class="container">
            <p>&copy; 2024 GroupSpark. All rights reserved.</p>
        </div>
    </footer>

    <script>
        // Initialize Stripe (you'll need to replace with your publishable key)
        const stripe = Stripe('pk_test_your_publishable_key'); // Replace with actual key
        const elements = stripe.elements();

        // Create card element
        const cardElement = elements.create('card');
        cardElement.mount('#card-element');

        // Handle package selection
        let selectedPackage = null;
        document.querySelectorAll('.package').forEach(pkg => {
            pkg.addEventListener('click', () => {
                document.querySelectorAll('.package').forEach(p => p.classList.remove('selected'));
                pkg.classList.add('selected');
                selectedPackage = {
                    id: pkg.dataset.packageId,
                    price: pkg.dataset.price,
                    credits: pkg.dataset.credits
                };
                document.getElementById('submit-button').disabled = false;
            });
        });

        // Handle form submission
        document.getElementById('payment-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!selectedPackage) {
                showMessage('Please select a credit package', 'error');
                return;
            }

            const email = document.getElementById('email').value;
            if (!email) {
                showMessage('Please enter your email address', 'error');
                return;
            }

            setLoading(true);

            try {
                // Create payment intent
                const response = await fetch('/api/create-payment-intent', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        product_id: '${selectedProduct?.id}',
                        package_id: selectedPackage.id,
                        customer_email: email
                    })
                });

                const { data } = await response.json();

                // Confirm payment
                const { error, paymentIntent } = await stripe.confirmCardPayment(data.client_secret, {
                    payment_method: {
                        card: cardElement,
                        billing_details: { email }
                    }
                });

                if (error) {
                    showMessage(error.message, 'error');
                } else if (paymentIntent.status === 'succeeded') {
                    // Confirm with backend
                    const confirmResponse = await fetch('/api/confirm-payment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            payment_intent_id: paymentIntent.id,
                            customer_email: email,
                            product_id: '${selectedProduct?.id}',
                            package_id: selectedPackage.id
                        })
                    });

                    const confirmData = await confirmResponse.json();
                    
                    if (confirmData.success) {
                        showMessage('Payment successful! Check your email for credit codes.', 'success');
                        document.getElementById('payment-form').reset();
                        selectedPackage = null;
                        document.querySelectorAll('.package').forEach(p => p.classList.remove('selected'));
                    } else {
                        showMessage('Payment processing failed. Please contact support.', 'error');
                    }
                }
            } catch (error) {
                showMessage('An error occurred. Please try again.', 'error');
            }

            setLoading(false);
        });

        function showMessage(message, type) {
            const messagesDiv = document.getElementById('messages');
            messagesDiv.innerHTML = \`<div class="\${type}">\${message}</div>\`;
            setTimeout(() => messagesDiv.innerHTML = '', 5000);
        }

        function setLoading(loading) {
            document.body.classList.toggle('loading', loading);
            document.getElementById('submit-button').disabled = loading;
            document.getElementById('submit-button').textContent = loading ? 'Processing...' : 'Complete Purchase';
        }
    </script>
</body>
</html>`;

  res.send(html);
}));

// Additional routes (simplified for now)
router.get('/about', (req, res) => {
  res.send('<h1>About GroupSpark</h1><p>We are building the future of AI-powered applications.</p>');
});

router.get('/contact', (req, res) => {
  res.send('<h1>Contact Us</h1><p>Email: support@groupspark.com</p>');
});

router.get('/distributors', (req, res) => {
  res.send('<h1>Become a Distributor</h1><p>Partner with us to sell credits and earn commissions.</p>');
});

router.get('/terms', (req, res) => {
  res.send('<h1>Terms of Service</h1><p>Terms and conditions...</p>');
});

router.get('/privacy', (req, res) => {
  res.send('<h1>Privacy Policy</h1><p>Your privacy is important to us...</p>');
});

export default router;