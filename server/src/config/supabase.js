import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Validate required environment variables
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is required');
}
if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY is required');
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is required');
}

// Create Supabase client for general use (with anon key)
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false // For server-side, we don't need to persist sessions
    }
  }
);

// Create Supabase client with service role key for admin operations
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to get authenticated user from request
export const getAuthenticatedUser = async (req) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }
};

// Helper function to verify admin role
export const verifyAdminRole = async (userId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();

    if (error || !data) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error verifying admin role:', error);
    return false;
  }
};

// Helper function to verify distributor role
export const verifyDistributorRole = async (userId) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('distributors')
      .select('id, status')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.status === 'approved' ? data : null;
  } catch (error) {
    console.error('Error verifying distributor role:', error);
    return null;
  }
};

// Helper function to execute RPC functions
export const executeRPC = async (functionName, params = {}, useServiceRole = false) => {
  const client = useServiceRole ? supabaseAdmin : supabase;
  
  try {
    const { data, error } = await client.rpc(functionName, params);
    
    if (error) {
      console.error(`RPC function ${functionName} error:`, error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`Error executing RPC function ${functionName}:`, error);
    throw error;
  }
};

// Helper function for database queries with error handling
export const querySupabase = async (query, useServiceRole = false) => {
  const client = useServiceRole ? supabaseAdmin : supabase;
  
  try {
    const result = await query(client);
    
    if (result.error) {
      console.error('Supabase query error:', result.error);
      throw result.error;
    }

    return result;
  } catch (error) {
    console.error('Error executing Supabase query:', error);
    throw error;
  }
};

// Test connection function
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('count')
      .limit(1);

    if (error && error.code !== 'PGRST116') { // PGRST116 is "table not found" which is expected during setup
      console.error('❌ Supabase connection failed:', error);
      return false;
    }

    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error);
    return false;
  }
};

console.log(`🔗 Supabase client initialized for: ${process.env.SUPABASE_URL}`);

export default supabase;