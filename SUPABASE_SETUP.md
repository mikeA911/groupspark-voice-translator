# GroupSpark Supabase Setup Guide

This guide will walk you through setting up the GroupSpark backend with Supabase.

## 📋 Prerequisites

- [Supabase account](https://supabase.com) (free tier available) ratAna3a&M911
- [Stripe account](https://stripe.com) for payment processing
- Node.js 18+ installed locally

## 🚀 Step-by-Step Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in/up
2. Click "New Project"
3. Choose your organization or create one
4. Fill in project details:
   - **Name**: `groupspark-backend` (or your preferred name)
   - **Database Password**: Generate a secure password (save this!)
   - **Region**: Choose closest to your users
5. Click "Create New Project"
6. Wait for project initialization (2-3 minutes)

### 2. Configure Database Schema

#### Run the Migrations

Copy and paste each SQL file into your Supabase SQL Editor (Database > SQL Editor):

1. **Initial Schema** - Copy all content from `server/supabase/migrations/001_initial_schema.sql`
   - Creates all tables (products, distributors, transactions, etc.)
   - Sets up Row Level Security policies
   - Creates indexes for performance

2. **RPC Functions** - Copy all content from `server/supabase/migrations/002_rpc_functions.sql`
   - Creates stored procedures for complex operations
   - Includes credit code generation and validation functions
   - Analytics and distributor management functions

3. **Seed Data** - Copy all content from `server/supabase/migrations/003_seed_data.sql`
   - Creates initial products (AI Note & Translation, etc.)
   - Sets up credit packages
   - Creates demo data for testing

4. **Storage Buckets** - Copy all content from `server/supabase/storage/buckets.sql`
   - Creates storage buckets for documents, receipts, exports
   - Sets up storage RLS policies

### 3. Configure Authentication

1. Go to **Authentication > Settings**
2. Configure the following:
   - **Site URL**: `http://localhost:3000` (for development)
   - **Redirect URLs**: Add your production domain when ready
3. **Enable Email Authentication**:
   - Ensure "Enable email confirmations" is turned OFF for easier development
   - You can enable this later in production

### 4. Set Up Storage

The storage buckets should be automatically created by the SQL script, but verify:

1. Go to **Storage** in your Supabase dashboard
2. You should see three buckets:
   - `distributor-documents` - For business licenses and verification docs
   - `receipts` - For purchase receipts and invoices
   - `exports` - For generated reports and data exports

### 5. Get Your API Keys

1. Go to **Settings > API**
2. Copy the following values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon/public key** (starts with `eyJhbGc...`)
   - **service_role/secret key** (starts with `eyJhbGc...`) - ⚠️ Keep this secret!

### 6. Configure Environment Variables

Create/update `server/.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server Configuration
PORT=3000
NODE_ENV=development

# Stripe Configuration (get from Stripe dashboard)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email Configuration (optional)
SENDGRID_API_KEY=SG.your-key
FROM_EMAIL=noreply@groupspark.com
```

### 7. Create Admin User

1. **Method 1: Via Supabase Dashboard**
   - Go to **Authentication > Users**
   - Click "Add User"
   - Enter your admin email and password
   - Click "Create User"
   - Copy the User ID (UUID)

2. **Method 2: Via Your App** (once it's running)
   - Use your app's signup functionality
   - Check the Authentication > Users tab for the User ID

3. **Add Admin Role**
   - Go to **Database > SQL Editor**
   - Run this query (replace with your User ID):
   ```sql
   INSERT INTO user_roles (user_id, role) 
   VALUES ('your-user-id-here', 'admin');
   ```

### 8. Deploy Edge Functions (Optional)

If you want to use the advanced Edge Functions:

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   cd server
   supabase link --project-ref your-project-ref
   ```

4. **Deploy functions**:
   ```bash
   supabase functions deploy generate-codes
   supabase functions deploy stripe-webhook
   ```

### 9. Test Your Setup

1. **Start your server**:
   ```bash
   cd server
   npm install
   npm run dev
   ```

2. **Test the connection**:
   - The server should start without errors
   - Check the logs for "Supabase connection successful"

3. **Test the API**:
   ```bash
   # Test products endpoint
   curl http://localhost:3000/api/products
   
   # Should return the seeded products
   ```

## 🔍 Troubleshooting

### Common Issues

1. **Connection Error**
   - Verify your `SUPABASE_URL` and keys are correct
   - Check if your project is fully initialized

2. **RLS Policy Errors**
   - Make sure you ran all migration files
   - Verify RLS policies are created correctly

3. **Authentication Issues**
   - Ensure you created an admin user
   - Verify the user_roles table entry

4. **Missing Tables/Functions**
   - Re-run the migration SQL files
   - Check the SQL Editor history for errors

### Verification Queries

Run these in your Supabase SQL Editor to verify setup:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check products and packages
SELECT p.name, count(cp.id) as package_count 
FROM products p 
LEFT JOIN credit_packages cp ON p.id = cp.product_id 
GROUP BY p.id, p.name;

-- Check RPC functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';

-- Check storage buckets
SELECT id, name FROM storage.buckets;
```

## 🛡️ Security Best Practices

1. **Row Level Security**
   - All tables have RLS enabled
   - Users can only access their own data
   - Admins have elevated access

2. **API Keys**
   - Never commit service role keys to version control
   - Use environment variables for all keys
   - Rotate keys regularly in production

3. **Authentication**
   - Use strong passwords for admin accounts
   - Enable email confirmation in production
   - Consider enabling 2FA for admin accounts

## 🚀 Next Steps

1. **Integrate with Frontend**: Update your Voice Notes Translator to use the credit purchase API
2. **Set up Stripe Webhooks**: Configure webhooks to point to your Edge Function
3. **Configure Email**: Set up transactional emails for purchase confirmations
4. **Add Distributors**: Test the distributor registration and approval workflow

## 📖 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)