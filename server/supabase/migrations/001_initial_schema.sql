-- GroupSpark Database Schema Migration
-- This file should be run in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  credit_costs JSONB NOT NULL DEFAULT '{}', -- {polish_text: 3, translate: 7, complete: 10}
  status TEXT NOT NULL DEFAULT 'active', -- active, coming_soon, deprecated
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit packages
CREATE TABLE IF NOT EXISTS credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  bonus_percent INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, name)
);

-- Distributors (extends Supabase auth users)
CREATE TABLE IF NOT EXISTS distributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  contact_info JSONB DEFAULT '{}', -- {email, phone, address}
  business_license TEXT, -- filename/path to uploaded document
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, suspended, rejected
  commission_rate DECIMAL(5,2) DEFAULT 10.00, -- percentage
  api_key TEXT UNIQUE,
  total_sales DECIMAL(12,2) DEFAULT 0,
  total_earnings DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- purchase, redemption, payout, refund
  amount DECIMAL(10,2),
  credits INTEGER,
  product_id UUID REFERENCES products(id),
  distributor_id UUID REFERENCES distributors(id),
  customer_email TEXT,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
  metadata JSONB DEFAULT '{}', -- additional transaction data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Credit codes table
CREATE TABLE IF NOT EXISTS credit_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  credits INTEGER NOT NULL,
  product_id UUID REFERENCES products(id),
  distributor_id UUID REFERENCES distributors(id),
  customer_email TEXT,
  purchase_price DECIMAL(10,2),
  wholesale_price DECIMAL(10,2),
  is_redeemed BOOLEAN DEFAULT false,
  redeemed_by TEXT, -- device fingerprint or customer identifier
  redeemed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles table for admin access control
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- admin, distributor, customer
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Distributor inventory tracking
CREATE TABLE IF NOT EXISTS distributor_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id UUID REFERENCES distributors(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  available_credits INTEGER DEFAULT 0,
  reserved_credits INTEGER DEFAULT 0,
  total_purchased INTEGER DEFAULT 0,
  total_sold INTEGER DEFAULT 0,
  last_restocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(distributor_id, product_id)
);

-- Audit logs for tracking important actions
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_codes_code ON credit_codes(code);
CREATE INDEX IF NOT EXISTS idx_credit_codes_distributor ON credit_codes(distributor_id);
CREATE INDEX IF NOT EXISTS idx_credit_codes_redeemed ON credit_codes(is_redeemed);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_email ON transactions(customer_email);
CREATE INDEX IF NOT EXISTS idx_transactions_distributor ON transactions(distributor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type_status ON transactions(type, status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_distributors_status ON distributors(status);
CREATE INDEX IF NOT EXISTS idx_distributors_user_id ON distributors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributor_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Products and credit packages are public (read-only for most users)
CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (true);

CREATE POLICY "Credit packages are viewable by everyone" ON credit_packages
  FOR SELECT USING (true);

-- Only admins can modify products and packages
CREATE POLICY "Only admins can manage products" ON products
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can manage credit packages" ON credit_packages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Distributors can only see and edit their own data
CREATE POLICY "Distributors can view own data" ON distributors
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Distributors can update own data" ON distributors
  FOR UPDATE USING (auth.uid() = user_id);

-- New distributor registrations are allowed
CREATE POLICY "Allow distributor registration" ON distributors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can see all distributors
CREATE POLICY "Admins can view all distributors" ON distributors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Transactions - distributors can only see their own
CREATE POLICY "Distributors can view own transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM distributors 
      WHERE distributors.id = transactions.distributor_id 
      AND distributors.user_id = auth.uid()
    )
    OR 
    -- Allow viewing direct customer purchases (no distributor_id)
    (distributor_id IS NULL AND customer_email IS NOT NULL)
  );

-- Admins can see all transactions
CREATE POLICY "Admins can view all transactions" ON transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Credit codes - distributors can only see their own
CREATE POLICY "Distributors can view own credit codes" ON credit_codes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM distributors 
      WHERE distributors.id = credit_codes.distributor_id 
      AND distributors.user_id = auth.uid()
    )
    OR 
    -- Allow viewing direct sales codes (no distributor_id)
    distributor_id IS NULL
  );

-- Allow credit code creation for distributors
CREATE POLICY "Distributors can create credit codes" ON credit_codes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM distributors 
      WHERE distributors.id = credit_codes.distributor_id 
      AND distributors.user_id = auth.uid()
      AND distributors.status = 'approved'
    )
    OR
    -- Allow direct sales (no distributor_id)
    distributor_id IS NULL
  );

-- Admins can see all credit codes
CREATE POLICY "Admins can view all credit codes" ON credit_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- User roles - users can see their own roles, admins can see all
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur2
      WHERE ur2.user_id = auth.uid() 
      AND ur2.role = 'admin'
    )
  );

-- Distributor inventory - distributors can manage their own
CREATE POLICY "Distributors can manage own inventory" ON distributor_inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM distributors 
      WHERE distributors.id = distributor_inventory.distributor_id 
      AND distributors.user_id = auth.uid()
    )
  );

-- Admins can see all inventory
CREATE POLICY "Admins can view all inventory" ON distributor_inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Audit logs - only admins can see
CREATE POLICY "Only admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_distributors_updated_at BEFORE UPDATE ON distributors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_distributor_inventory_updated_at BEFORE UPDATE ON distributor_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    