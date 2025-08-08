-- GroupSpark RPC Functions
-- These functions provide complex operations via Supabase RPC calls

-- Function to generate a unique credit code
CREATE OR REPLACE FUNCTION generate_credit_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN := TRUE;
  final_code TEXT;
BEGIN
  -- Keep generating codes until we find a unique one
  WHILE code_exists LOOP
    result := '';
    -- Generate 12 character code
    FOR i IN 1..12 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Format as XXXX-XXXX-XXXX
    final_code := substr(result, 1, 4) || '-' || substr(result, 5, 4) || '-' || substr(result, 9, 4);
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM credit_codes WHERE code = final_code) INTO code_exists;
  END LOOP;
  
  RETURN final_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get distributor analytics
CREATE OR REPLACE FUNCTION get_distributor_analytics(distributor_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_codes_generated', COALESCE(SUM(CASE WHEN cc.distributor_id = distributor_uuid THEN 1 ELSE 0 END), 0),
    'codes_redeemed', COALESCE(SUM(CASE WHEN cc.distributor_id = distributor_uuid AND cc.is_redeemed THEN 1 ELSE 0 END), 0),
    'total_credits_issued', COALESCE(SUM(CASE WHEN cc.distributor_id = distributor_uuid THEN cc.credits ELSE 0 END), 0),
    'credits_redeemed', COALESCE(SUM(CASE WHEN cc.distributor_id = distributor_uuid AND cc.is_redeemed THEN cc.credits ELSE 0 END), 0),
    'total_revenue', COALESCE(SUM(CASE WHEN cc.distributor_id = distributor_uuid THEN cc.purchase_price ELSE 0 END), 0),
    'total_profit', COALESCE(SUM(CASE WHEN cc.distributor_id = distributor_uuid THEN (cc.purchase_price - cc.wholesale_price) ELSE 0 END), 0),
    'redemption_rate', CASE 
      WHEN COUNT(CASE WHEN cc.distributor_id = distributor_uuid THEN 1 END) > 0 
      THEN (COUNT(CASE WHEN cc.distributor_id = distributor_uuid AND cc.is_redeemed THEN 1 END)::float / COUNT(CASE WHEN cc.distributor_id = distributor_uuid THEN 1 END)::float) * 100
      ELSE 0 
    END
  ) INTO result
  FROM credit_codes cc;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get platform analytics (admin only)
CREATE OR REPLACE FUNCTION get_platform_analytics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Verify user is admin
  IF NOT EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  SELECT json_build_object(
    'total_distributors', (SELECT COUNT(*) FROM distributors),
    'active_distributors', (SELECT COUNT(*) FROM distributors WHERE status = 'approved'),
    'pending_distributors', (SELECT COUNT(*) FROM distributors WHERE status = 'pending'),
    'total_products', (SELECT COUNT(*) FROM products WHERE status = 'active'),
    'total_codes_generated', (SELECT COUNT(*) FROM credit_codes),
    'total_codes_redeemed', (SELECT COUNT(*) FROM credit_codes WHERE is_redeemed = true),
    'total_revenue', (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE type = 'purchase' AND status = 'completed'),
    'total_credits_issued', (SELECT COALESCE(SUM(credits), 0) FROM credit_codes),
    'total_credits_redeemed', (SELECT COALESCE(SUM(credits), 0) FROM credit_codes WHERE is_redeemed = true),
    'redemption_rate', CASE 
      WHEN (SELECT COUNT(*) FROM credit_codes) > 0 
      THEN ((SELECT COUNT(*) FROM credit_codes WHERE is_redeemed = true)::float / (SELECT COUNT(*) FROM credit_codes)::float) * 100
      ELSE 0 
    END,
    'recent_transactions', (
      SELECT json_agg(
        json_build_object(
          'id', t.id,
          'type', t.type,
          'amount', t.amount,
          'credits', t.credits,
          'status', t.status,
          'customer_email', t.customer_email,
          'created_at', t.created_at
        )
      )
      FROM (
        SELECT * FROM transactions 
        ORDER BY created_at DESC 
        LIMIT 10
      ) t
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate and redeem a credit code
CREATE OR REPLACE FUNCTION redeem_credit_code(
  code_to_redeem TEXT,
  customer_identifier TEXT
)
RETURNS JSON AS $$
DECLARE
  code_record credit_codes;
  result JSON;
BEGIN
  -- Find the credit code
  SELECT * INTO code_record
  FROM credit_codes
  WHERE code = code_to_redeem;
  
  -- Check if code exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Credit code not found',
      'error_code', 'CODE_NOT_FOUND'
    );
  END IF;
  
  -- Check if already redeemed
  IF code_record.is_redeemed THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Credit code has already been redeemed',
      'error_code', 'ALREADY_REDEEMED',
      'redeemed_at', code_record.redeemed_at
    );
  END IF;
  
  -- Check if expired
  IF code_record.expires_at IS NOT NULL AND code_record.expires_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Credit code has expired',
      'error_code', 'EXPIRED',
      'expires_at', code_record.expires_at
    );
  END IF;
  
  -- Redeem the code
  UPDATE credit_codes
  SET 
    is_redeemed = true,
    redeemed_at = NOW(),
    redeemed_by = customer_identifier
  WHERE id = code_record.id;
  
  -- Create redemption transaction record
  INSERT INTO transactions (
    type,
    credits,
    product_id,
    distributor_id,
    customer_email,
    status,
    metadata,
    completed_at
  ) VALUES (
    'redemption',
    code_record.credits,
    code_record.product_id,
    code_record.distributor_id,
    customer_identifier,
    'completed',
    json_build_object(
      'credit_code_id', code_record.id,
      'code', code_record.code,
      'redeemed_by', customer_identifier
    ),
    NOW()
  );
  
  -- Get product information
  SELECT json_build_object(
    'success', true,
    'credits', code_record.credits,
    'product', (
      SELECT json_build_object(
        'id', p.id,
        'name', p.name,
        'description', p.description,
        'credit_costs', p.credit_costs
      )
      FROM products p
      WHERE p.id = code_record.product_id
    ),
    'redeemed_at', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate credit code without redeeming
CREATE OR REPLACE FUNCTION validate_credit_code(code_to_validate TEXT)
RETURNS JSON AS $$
DECLARE
  code_record credit_codes;
  product_record products;
  result JSON;
BEGIN
  -- Find the credit code
  SELECT cc.*, p.*
  INTO code_record, product_record
  FROM credit_codes cc
  LEFT JOIN products p ON cc.product_id = p.id
  WHERE cc.code = code_to_validate;
  
  -- Check if code exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Credit code not found',
      'error_code', 'CODE_NOT_FOUND'
    );
  END IF;
  
  -- Check if already redeemed
  IF code_record.is_redeemed THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Credit code has already been redeemed',
      'error_code', 'ALREADY_REDEEMED',
      'redeemed_at', code_record.redeemed_at,
      'credits', code_record.credits
    );
  END IF;
  
  -- Check if expired
  IF code_record.expires_at IS NOT NULL AND code_record.expires_at < NOW() THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Credit code has expired',
      'error_code', 'EXPIRED',
      'expires_at', code_record.expires_at,
      'credits', code_record.credits
    );
  END IF;
  
  -- Code is valid
  RETURN json_build_object(
    'valid', true,
    'credits', code_record.credits,
    'expires_at', code_record.expires_at,
    'product', CASE 
      WHEN product_record.id IS NOT NULL THEN
        json_build_object(
          'id', product_record.id,
          'name', product_record.name,
          'description', product_record.description
        )
      ELSE NULL
    END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update distributor inventory
CREATE OR REPLACE FUNCTION update_distributor_inventory(
  dist_id UUID,
  prod_id UUID,
  credits_purchased INTEGER,
  credits_sold INTEGER DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Verify distributor exists and user has permission
  IF NOT EXISTS(
    SELECT 1 FROM distributors 
    WHERE id = dist_id 
    AND (user_id = auth.uid() OR EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  ) THEN
    RAISE EXCEPTION 'Access denied: Invalid distributor or insufficient permissions';
  END IF;
  
  -- Insert or update inventory
  INSERT INTO distributor_inventory (
    distributor_id,
    product_id,
    available_credits,
    total_purchased,
    total_sold,
    last_restocked_at
  ) VALUES (
    dist_id,
    prod_id,
    credits_purchased,
    credits_purchased,
    credits_sold,
    CASE WHEN credits_purchased > 0 THEN NOW() ELSE NULL END
  )
  ON CONFLICT (distributor_id, product_id)
  DO UPDATE SET
    available_credits = distributor_inventory.available_credits + credits_purchased - credits_sold,
    total_purchased = distributor_inventory.total_purchased + credits_purchased,
    total_sold = distributor_inventory.total_sold + credits_sold,
    last_restocked_at = CASE 
      WHEN credits_purchased > 0 THEN NOW() 
      ELSE distributor_inventory.last_restocked_at 
    END,
    updated_at = NOW();
  
  -- Return updated inventory
  SELECT json_build_object(
    'distributor_id', dist_id,
    'product_id', prod_id,
    'available_credits', di.available_credits,
    'total_purchased', di.total_purchased,
    'total_sold', di.total_sold,
    'last_restocked_at', di.last_restocked_at
  ) INTO result
  FROM distributor_inventory di
  WHERE di.distributor_id = dist_id AND di.product_id = prod_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
