# GroupSpark Platform

A complete multi-product platform with credit-based payment system, distributor network, and AI-powered applications.

## 🏗️ Architecture

```
groupspark-platform/
├── client/           # Frontend (Voice Notes Translator PWA)
├── server/           # Backend (Node.js/Express API)
├── shared/           # Shared TypeScript types
└── package.json      # Root workspace configuration
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Supabase account ([supabase.com](https://supabase.com))
- Stripe account (for payments)
- Supabase CLI (optional, for local development)

### 1. Clone and Install

```bash
# Install all dependencies
npm run install:all

# Or manually:
npm install
cd client && npm install
cd ../server && npm install
```

### 2. Supabase Setup

#### Option A: Using Supabase Dashboard (Recommended)

1. **Create a new Supabase project** at [supabase.com](https://supabase.com)
2. **Run the database migrations** in your Supabase SQL editor:
   - Copy and run `server/supabase/migrations/001_initial_schema.sql`
   - Copy and run `server/supabase/migrations/002_rpc_functions.sql`
   - Copy and run `server/supabase/migrations/003_seed_data.sql`
   - Copy and run `server/supabase/storage/buckets.sql`

3. **Deploy Edge Functions** (optional, for advanced features):
   ```bash
   # Install Supabase CLI first
   npm install -g supabase
   
   # Deploy edge functions
   cd server
   supabase functions deploy generate-codes
   supabase functions deploy stripe-webhook
   ```

4. **Set up Authentication**:
   - Go to Authentication > Settings in your Supabase dashboard
   - Configure email/password authentication
   - Add your domain to the allowed redirect URLs

#### Option B: Using Supabase CLI (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project
cd server
supabase init

# Start local Supabase (optional for local development)
supabase start

# Apply migrations
supabase db push

# Deploy edge functions
supabase functions deploy
```

### 3. Environment Setup

Copy the environment file and configure:

```bash
cd server
cp .env.example .env
```

Update `server/.env` with your configuration:

```env
# Supabase Configuration (get these from your Supabase dashboard)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Stripe Keys
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Other required settings...
```

### 4. Authentication Setup

1. **Create an admin user**:
   - Go to Authentication > Users in your Supabase dashboard  
   - Create a new user with your admin email
   - Copy the user ID

2. **Add admin role**:
   - In your Supabase SQL editor, run:
   ```sql
   INSERT INTO user_roles (user_id, role) 
   VALUES ('your-user-id-here', 'admin');
   ```

### 5. Verify Setup

The database seeding will:
- Create all necessary tables with Row Level Security (RLS)
- Set up 3 products (AI Note & Translation active, others coming soon)
- Create 5 credit packages for the active product
- Set up storage buckets for document uploads
- Create demo credit codes for testing

### 6. Start Development

```bash
# Start both frontend and backend
npm run dev

# Or individually:
npm run dev:server  # Backend: http://localhost:3000
npm run dev:client  # Frontend: http://localhost:5173
```

## 📦 Products & Features

### Current Products

1. **AI Note & Translation App** ✅
   - Voice-to-text transcription
   - AI note polishing
   - Multi-language translation
   - Credit costs: Polish (3), Translate (7), Complete (10)

2. **AI Content Creator** 🚧 (Coming Soon)
3. **AI Business Assistant** 🚧 (Coming Soon)

### Core Features

- **Credit System**: Pay-per-use with flexible packages
- **Stripe Integration**: Secure payment processing
- **Supabase Backend**: Real-time database with built-in authentication
- **Row Level Security**: Secure data access with RLS policies
- **Distributor Network**: Partner program for resellers
- **Admin Dashboard**: Platform management
- **REST API**: Complete API for integrations
- **Multi-Product**: Scalable platform for new AI apps

## 🛠️ API Endpoints

### Customer APIs

```javascript
POST /api/create-payment-intent    // Create payment for credits
POST /api/confirm-payment          // Confirm and generate codes
POST /api/redeem-code              // Redeem credit code in app
GET  /api/validate-code/:code      // Validate code without redeeming
GET  /api/products                 // Get active products
```

### Webhook

```javascript
POST /api/webhook/stripe           // Stripe payment webhooks
```

## 💳 Credit Packages

| Package | Credits | Price | Bonus |
|---------|---------|-------|-------|
| Starter | 100 | $1.00 | 0% |
| Value | 500 | $4.50 | 10% |
| Popular | 1,000 | $8.00 | 20% |
| Business | 2,500 | $18.75 | 25% |
| Enterprise | 5,000 | $35.00 | 30% |

## 🔧 Development

### Project Structure

```
server/src/
├── controllers/     # Route handlers
├── models/         # Database models
├── routes/         # API routes
├── services/       # Business logic
├── middleware/     # Auth, validation, etc.
├── config/         # Configuration
└── scripts/        # Migration & seeding
```

### Key Components

- **PaymentService**: Stripe integration and payment processing
- **Supabase Integration**: Database operations and authentication
- **RPC Functions**: Complex database operations via stored procedures
- **Edge Functions**: Serverless functions for code generation and webhooks
- **Row Level Security**: Fine-grained data access control
- **Middleware**: Rate limiting, error handling, validation

### Testing

```bash
cd server
npm test
```

### Supabase Operations

```bash
# Run migrations (via Supabase dashboard)
# Copy SQL from server/supabase/migrations/ and run in SQL editor

# Deploy edge functions (requires Supabase CLI)
cd server
supabase functions deploy

# View local Supabase dashboard
supabase start
# Then visit http://localhost:54323
```

## 🌐 Deployment

### Environment Variables

Required for production:

```env
NODE_ENV=production
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_KEY=your_production_service_key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SENDGRID_API_KEY=SG.your-key
```

### Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Recommended Hosting

- **Backend**: Vercel, Railway, Render, or similar
- **Database**: Supabase (managed PostgreSQL)
- **Edge Functions**: Supabase Edge Functions (Deno runtime)
- **Storage**: Supabase Storage (S3-compatible)
- **Frontend**: Vercel, Netlify (if separating frontend)

## 🔒 Security

- **Supabase Auth**: Built-in JWT authentication with refresh tokens
- **Row Level Security (RLS)**: Database-level access control
- **Rate Limiting**: Protection against abuse on all endpoints
- **Input Validation**: Server-side validation and sanitization
- **Secure Code Generation**: Cryptographically strong credit codes
- **PCI Compliance**: Through Stripe payment processing
- **Environment-based Configuration**: Secure credential management

## 📈 Monitoring

- Built-in error handling and logging
- Stripe webhook monitoring
- Database connection health checks
- API endpoint monitoring

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Issues**: Create GitHub issues for bugs/features
- **Email**: support@groupspark.com
- **Docs**: [API Documentation](./docs/api.md)

## 🚧 Roadmap

### Phase 1 (Current)
- ✅ Core credit purchase system
- ✅ AI Note & Translation integration
- ✅ Basic admin functionality
- 🚧 Distributor registration system

### Phase 2 (Next)
- 🚧 Full admin dashboard
- 🚧 Distributor management portal
- 🚧 Advanced analytics
- 🚧 Email notifications

### Phase 3 (Future)
- 📋 Mobile app for distributors
- 📋 Advanced reporting
- 📋 Multi-currency support
- 📋 Additional AI products

## 🔗 Links

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000
- **Admin**: http://localhost:3000/admin
- **Distributor**: http://localhost:3000/distributor
- **API**: http://localhost:3000/api