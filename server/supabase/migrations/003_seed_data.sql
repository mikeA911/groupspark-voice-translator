-- Seed data for GroupSpark platform
-- Run this after the initial schema migration

-- Insert initial products
INSERT INTO products (name, description, credit_costs, status) VALUES
(
  'AI Note & Translation',
  'Voice translation and note-taking for travelers',
  '{"polish_text": 3, "translate": 7, "complete": 10}',
  'active'
),
(
  'AI Content Creator',
  'Generate content for social media and marketing',
  '{"generate_post": 5, "generate_campaign": 15, "optimize_content": 8}',
  'coming_soon'
),
(
  'AI Business Assistant',
  'Automate business workflows and communications',
  '{"draft_email": 4, "create_report": 12, "schedule_meeting": 6}',
  'coming_soon'
)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  credit_costs = EXCLUDED.credit_costs,
  status = EXCLUDED.status;

-- Get the AI Note & Translation product ID for credit packages
DO $$
DECLARE
  translation_product_id UUID;
  product_record RECORD;
BEGIN
  -- Get the translation app product ID
  SELECT id INTO translation_product_id 
  FROM products 
  WHERE name = 'AI Note & Translation' 
  LIMIT 1;

  -- Only insert credit packages for active products
  IF translation_product_id IS NOT NULL THEN
    -- Insert credit packages for AI Note & Translation
    INSERT INTO credit_packages (product_id, name, credits, price, bonus_percent) VALUES
    (translation_product_id, 'AI Note & Translation - $1 Starter Package', 100, 1.00, 0),
    (translation_product_id, 'AI Note & Translation - $5 Value Package (10% bonus)', 500, 4.50, 10),
    (translation_product_id, 'AI Note & Translation - $10 Popular Package (20% bonus)', 1000, 8.00, 20),
    (translation_product_id, 'AI Note & Translation - $25 Business Package (25% bonus)', 2500, 18.75, 25),
    (translation_product_id, 'AI Note & Translation - $50 Enterprise Package (30% bonus)', 5000, 35.00, 30)
    ON CONFLICT (product_id, name) DO UPDATE SET
      credits = EXCLUDED.credits,
      price = EXCLUDED.price,
      bonus_percent = EXCLUDED.bonus_percent,
      is_active = true;
  END IF;
END $$;

-- Create a demo admin user in auth.users (this needs to be done via Supabase dashboard or auth API)
-- For now, we'll just create the user_roles entry assuming an admin user exists
-- You'll need to replace 'your-admin-user-id-here' with actual admin user ID after creating user

-- Example of how to add admin role (replace with actual user ID from Supabase Auth)
-- INSERT INTO user_roles (user_id, role) VALUES
-- ('your-admin-user-id-here', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Create some sample data for testing (optional - remove in production)
-- This creates demo credit codes for testing

DO $$
DECLARE
  translation_product_id UUID;
  demo_code TEXT;
BEGIN
  -- Get the translation product ID
  SELECT id INTO translation_product_id 
  FROM products 
  WHERE name = 'AI Note & Translation' 
  LIMIT 1;

  -- Only create demo data if we're not in production
  IF translation_product_id IS NOT NULL AND current_setting('server_version_num')::int > 0 THEN
    -- Generate a demo credit code for testing
    SELECT generate_credit_code() INTO demo_code;
    
    -- Insert demo credit code (expires in 1 year)
    INSERT INTO credit_codes (
      code,
      credits,
      product_id,
      customer_email,
      purchase_price,
      expires_at
    ) VALUES (
      demo_code,
      100,
      translation_product_id,
      'demo@groupspark.com',
      1.00,
      NOW() + INTERVAL '1 year'
    );

    -- Log the demo code creation
    RAISE NOTICE 'Demo credit code created: %', demo_code;
  END IF;
END $$;

-- Insert audit log for setup completion
INSERT INTO audit_logs (action, resource_type, new_values) VALUES
('database_seeded', 'system', '{"timestamp": "' || NOW() || '", "status": "completed"}');

-- Display summary of seeded data
DO $$
DECLARE
  product_count INT;
  package_count INT;
  code_count INT;
BEGIN
  SELECT COUNT(*) INTO product_count FROM products;
  SELECT COUNT(*) INTO package_count FROM credit_packages;
  SELECT COUNT(*) INTO code_count FROM credit_codes;
  
  RAISE NOTICE '=== GroupSpark Database Seeding Complete ===';
  RAISE NOTICE 'Products created: %', product_count;
  RAISE NOTICE 'Credit packages created: %', package_count;
  RAISE NOTICE 'Demo credit codes created: %', code_count;
  RAISE NOTICE '==========================================';
END $$;