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

### 5. API Endpoints
**Credit System APIs:**
```javascript
// Customer APIs
POST /api/purchase-credits          // Direct credit purchase
POST /api/redeem-code              // Redeem credit code in PWA
GET  /api/validate-redemption      // Validate redemption code

// Distributor APIs  
POST /api/distributor/register     // Distributor registration
POST /api/distributor/login        // Distributor authentication
GET  /api/distributor/dashboard    // Dashboard data
POST /api/distributor/generate-codes // Generate credit codes
GET  /api/distributor/sales        // Sales history
POST /api/distributor/inventory    // Purchase inventory

// Admin APIs
GET  /api/admin/analytics          // Platform analytics
GET  /api/admin/distributors       // Distributor management
POST /api/admin/approve-distributor // Approve distributor
GET  /api/admin/transactions       // All transactions
```

## Technical Requirements

### Backend Technology Stack
**Recommended Stack:**
- **Framework**: Node.js with Express OR Python with Django/FastAPI
- **Database**: PostgreSQL (for transactions) + Redis (for sessions/cache)
- **Authentication**: JWT tokens with secure session management
- **Payments**: Stripe for payment processing
- **Email**: SendGrid or AWS SES for transactional emails
- **File Storage**: AWS S3 or similar for document uploads
- **Hosting**: Railway, Render, or similar platform

### Database Schema
**Core Tables Needed:**
```sql
-- Products table
products (id, name, description, credit_costs, status, created_at)

-- Credit packages  
credit_packages (id, product_id, credits, price, name, bonus_percent)

-- Distributors
distributors (id, business_name, contact_info, status, commission_rate, api_key)

-- Transactions
transactions (id, type, amount, credits, distributor_id, customer_email, status)

-- Credit codes
credit_codes (id, code, credits, product_id, distributor_id, redeemed_at, created_at)

-- Users (admin/distributor auth)
users (id, email, password_hash, role, distributor_id)
```

### Security Requirements
- Secure API authentication (JWT)
- Input validation and sanitization
- Rate limiting on all endpoints
- Secure credit code generation (cryptographically strong)
- PCI compliance for payment processing
- GDPR compliance for user data
- Audit logging for all transactions

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

## File Structure
```
groupspark-backend/
├── src/
│   ├── controllers/     # API route handlers
│   ├── models/          # Database models  
│   ├── middleware/      # Auth, validation, etc.
│   ├── services/        # Business logic
│   ├── utils/           # Helper functions
│   └── config/          # Configuration files
├── public/              # Static assets
├── views/               # Template files
├── tests/               # Test files
└── docs/                # API documentation
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