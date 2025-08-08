# Claude Code Prompt: GroupSpark Backend Platform

## Project Overview
Create a complete backend web application called **GroupSpark** - a multi-product platform that manages credits, distributors, and products. The first product is an AI Note & Translation app, with placeholders for future products.

## Company Information
- **Name**: GroupSpark
- **Primary Product**: AI Note & Translation App
- **Business Model**: Credit-based system with distributor network
- **Target Users**: End consumers (tourists/business travelers) + Distributors (hotels, tour companies, local businesses)

## Platform Architecture

### Multi-Product System
```javascript
// Product structure
const PRODUCTS = {
  translation_app: {
    name: "AI Note & Translation",
    description: "Voice translation and note-taking for travelers",
    credit_costs: {
      polish_text: 3,
      translate: 7,
      complete: 10
    },
    status: "active"
  },
  // Placeholders for future products
  placeholder_app_1: {
    name: "Coming Soon - Product 2",
    description: "Future AI application",
    status: "coming_soon"
  },
  placeholder_app_2: {
    name: "Coming Soon - Product 3", 
    description: "Future AI application",
    status: "coming_soon"
  }
};
```

### Credit System Configuration
```javascript
// Global credit system (configurable per product)
const CREDIT_CONFIG = {
  default_rate: 1, // 1 credit = 1 cent
  packages: [
    { credits: 100, price: 1.00, name: "$1 Package" },
    { credits: 500, price: 4.50, name: "$5 Package (10% bonus)" },
    { credits: 1000, price: 8.00, name: "$10 Package (20% bonus)" },
    { credits: 2500, price: 18.75, name: "$25 Package (25% bonus)" },
    { credits: 5000, price: 35.00, name: "$50 Package (30% bonus)" }
  ]
};
```

## Core Features to Implement

### 1. Public Website (Landing Page)
**Homepage Requirements:**
- Modern, professional design showcasing GroupSpark
- Hero section highlighting the AI Note & Translation app
- Product showcase with current and coming soon products
- "For Distributors" section explaining partnership opportunities
- Contact information and company details
- Mobile-responsive design

**Pages Needed:**
- Home (`/`)
- About Us (`/about`)
- Products (`/products`)
- For Distributors (`/distributors`) 
- Contact (`/contact`)
- Terms of Service (`/terms`)
- Privacy Policy (`/privacy`)

### 2. Customer Credit Purchase System
**Direct Sales Portal (`/buy-credits`):**
- Product selection (currently just Translation App)
- Credit package selection with pricing
- Secure payment processing (Stripe integration)
- Credit code generation after purchase
- Email receipt with redemption instructions
- QR code for easy mobile redemption

**Purchase Flow:**
1. Select product (Translation App)
2. Choose credit package
3. Secure payment (Stripe)
4. Generate unique redemption code
5. Email confirmation with QR code
6. Customer redeems in PWA

### 3. Distributor Management System
**Distributor Portal (`/distributor/`):**

**Registration & Onboarding:**
- Business registration form
- Document upload (business license, etc.)
- Application review workflow
- Email verification and approval notifications
- Unique distributor ID and API key generation

**Distributor Dashboard (`/distributor/dashboard`):**
- Sales overview (today, week, month)
- Credit inventory management
- Generate credit codes/QR codes
- Customer redemption tracking  
- Earnings and commission display
- Download sales reports

**Credit Management:**
- Purchase credit inventory at wholesale prices
- Generate individual credit codes
- Bulk code generation
- Track code redemption status
- Inventory alerts and reordering

### 4. Admin Management System
**Admin Portal (`/admin/`):**

**Dashboard:**
- Platform-wide analytics
- Total sales, active distributors, product performance
- Recent transactions and redemptions
- System health monitoring

**Distributor Management:**
- Review and approve distributor applications
- Manage distributor status (active/suspended)
- Set commission rates and pricing
- View distributor performance metrics

**Product Management:**
- Configure credit costs per product
- Add new products to the platform
- Manage product status (active/coming_soon/deprecated)
- Update pricing and packages

**Financial Management:**
- Process distributor payouts
- Generate financial reports
- Monitor payment processing
- Tax reporting tools

### 5. Supabase API Integration
**Using Supabase Client:**
```javascript
// Initialize Supabase client
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

// Customer APIs (using Supabase)
POST /api/purchase-credits          // Direct credit purchase + Supabase insert
POST /api/redeem-code              // Redeem credit code + update Supabase
GET  /api/validate-redemption      // Validate using Supabase RPC

// Distributor APIs (with Supabase Auth)
POST /api/distributor/register     // Create user + distributor record
POST /api/distributor/login        // Supabase Auth signin  
GET  /api/distributor/dashboard    // Query Supabase with RLS
POST /api/distributor/generate-codes // Insert codes + call Edge Function
GET  /api/distributor/sales        // Query transactions with RLS

// Admin APIs (with role-based access)
GET  /api/admin/analytics          // Aggregate queries via Supabase
GET  /api/admin/distributors       // Admin-only queries
POST /api/admin/approve-distributor // Update distributor status
```

**Supabase RPC Functions:**
```sql
-- Custom database functions for complex queries
CREATE OR REPLACE FUNCTION get_distributor_analytics(distributor_uuid UUID)
RETURNS JSON AS $
-- Calculate sales, commissions, etc.
$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_credit_code()
RETURNS TEXT AS $
-- Generate cryptographically secure credit code
$ LANGUAGE plpgsql;
```

## Technical Requirements

### Backend Technology Stack
**Recommended Stack:**
- **Framework**: Node.js with Express OR Next.js (for full-stack)
- **Database**: Supabase (PostgreSQL + real-time features)
- **Authentication**: Supabase Auth (built-in JWT, social logins)
- **Storage**: Supabase Storage (for document uploads)
- **Payments**: Stripe for payment processing
- **Email**: Supabase Edge Functions + SendGrid OR Supabase built-in email
- **Hosting**: Vercel (pairs well with Supabase) or Railway

### Supabase Database Schema
**Tables to Create in Supabase:**

```sql
-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  credit_costs JSONB NOT NULL, -- {polish_text: 3, translate: 7, complete: 10}
  status TEXT DEFAULT 'active', -- active, coming_soon, deprecated
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit packages  
CREATE TABLE credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  credits INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  name TEXT NOT NULL,
  bonus_percent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Distributors (extends Supabase auth users)
CREATE TABLE distributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  contact_info JSONB, -- {email, phone, address}
  status TEXT DEFAULT 'pending', -- pending, approved, suspended
  commission_rate DECIMAL(5,2) DEFAULT 10.00, -- percentage
  api_key TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- purchase, redemption, payout
  amount DECIMAL(10,2),
  credits INTEGER,
  product_id UUID REFERENCES products(id),
  distributor_id UUID REFERENCES distributors(id),
  customer_email TEXT,
  stripe_payment_id TEXT,
  status TEXT DEFAULT 'pending', -- pending, completed, failed, refunded
  metadata JSONB, -- additional transaction data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Credit codes
CREATE TABLE credit_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  credits INTEGER NOT NULL,
  product_id UUID REFERENCES products(id),
  distributor_id UUID REFERENCES distributors(id),
  redeemed_by TEXT, -- device fingerprint or customer identifier
  redeemed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles (for admin access)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- admin, distributor, customer
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Row Level Security (RLS) Policies:**
```sql
-- Enable RLS on all tables
ALTER TABLE distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_codes ENABLE ROW LEVEL SECURITY;

-- Distributors can only see their own data
CREATE POLICY "Distributors can view own data" ON distributors
  FOR ALL USING (auth.uid() = user_id);

-- Distributors can only see their own transactions  
CREATE POLICY "Distributors can view own transactions" ON transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM distributors 
      WHERE distributors.id = transactions.distributor_id 
      AND distributors.user_id = auth.uid()
    )
  );

-- Similar policies for credit_codes, etc.
```

### Supabase Integration Requirements

**Authentication Setup:**
- Configure Supabase Auth with email/password
- Set up social logins (Google, GitHub) for distributors
- Create custom claims for user roles (admin, distributor)
- Implement magic link authentication for distributors

**Real-time Features:**
- Real-time dashboard updates for distributors
- Live transaction notifications
- Instant credit code redemption updates

**Edge Functions:**
```javascript
// Supabase Edge Function examples needed:

// 1. Generate credit codes
// supabase/functions/generate-codes/index.ts
// 2. Process Stripe webhooks  
// supabase/functions/stripe-webhook/index.ts
// 3. Send email notifications
// supabase/functions/send-notifications/index.ts
// 4. Validate credit redemption
// supabase/functions/validate-redemption/index.ts
```

**Storage Buckets:**
- `distributor-documents`: Business licenses, verification docs
- `receipts`: PDF receipts and invoices
- `exports`: Generated reports and data exports

**Environment Variables:**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key  
SUPABASE_SERVICE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

### Integration Requirements
- **Stripe**: Payment processing and webhook handling
- **Email Service**: Automated emails for purchases, approvals, receipts
- **SMS (Optional)**: Credit code delivery via SMS
- **Analytics**: Basic usage analytics and reporting
- **Monitoring**: Error tracking and system monitoring

## UI/UX Requirements

### Public Website Design
- Modern, clean design reflecting professionalism
- Mobile-first responsive design  
- Fast loading times
- Clear call-to-action buttons
- Professional color scheme (suggest: blues, whites, accent colors)
- Trust signals (security badges, testimonials)

### Admin Interface
- Clean, functional dashboard design
- Data visualization for analytics
- Easy-to-use forms and tables
- Responsive design for mobile management
- Dark/light theme options

### Distributor Portal
- Business-focused design
- Clear revenue and performance metrics
- Easy credit code generation interface
- Mobile-optimized for on-the-go management
- Simple, intuitive navigation

## File Structure (Supabase + Next.js)
```
groupspark-backend/
├── pages/api/           # API routes (Next.js API routes)
│   ├── auth/           # Authentication endpoints
│   ├── distributor/    # Distributor APIs
│   ├── admin/          # Admin APIs  
│   └── stripe/         # Payment webhooks
├── pages/              # Website pages
│   ├── distributor/    # Distributor portal pages
│   ├── admin/          # Admin portal pages
│   └── public pages    # Landing, about, etc.
├── components/         # React components
│   ├── dashboard/      # Dashboard components
│   ├── forms/          # Form components
│   └── layouts/        # Layout components
├── lib/                # Utilities
│   ├── supabase.js     # Supabase client config
│   ├── stripe.js       # Stripe integration
│   └── utils.js        # Helper functions
├── supabase/           # Supabase configuration
│   ├── migrations/     # Database migrations
│   ├── functions/      # Edge Functions
│   └── config.toml     # Supabase config
├── styles/             # CSS/Tailwind styles
└── public/             # Static assets
```

## Development Phases

### Phase 1: Core Platform
1. Basic website with product showcase
2. Customer credit purchase system
3. Simple admin panel
4. Database setup and core APIs

### Phase 2: Distributor System  
1. Distributor registration and approval
2. Distributor dashboard and credit management
3. Commission and payout system
4. Advanced admin features

### Phase 3: Analytics & Optimization
1. Advanced analytics and reporting
2. Performance optimization
3. Enhanced security features
4. Mobile apps (if needed)

## Testing Requirements
- Unit tests for all API endpoints
- Integration tests for payment processing
- Security testing for authentication
- Load testing for high traffic scenarios
- User acceptance testing for all user flows

## Deployment Requirements
- Environment configuration (dev/staging/prod)
- Database migrations system
- Automated deployment pipeline
- SSL certificates and security headers
- Monitoring and logging setup
- Backup and disaster recovery

## Success Metrics
- Successful credit purchases and redemptions
- Distributor onboarding and sales performance
- System uptime and performance
- Payment processing success rates
- User satisfaction and support ticket volume

Please build this as a complete, production-ready backend system that can scale as GroupSpark adds new products to the platform.