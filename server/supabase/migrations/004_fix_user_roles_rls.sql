-- Fix the infinite recursion issue in user_roles RLS policies
-- Run this in your Supabase SQL editor

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON user_roles;

-- Create simpler, non-recursive policies
-- Users can view their own roles
CREATE POLICY "Users can view own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Only allow inserts for user's own roles (for registration)
CREATE POLICY "Users can create own roles" ON user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role (backend) can manage all roles
-- This allows the backend to manage roles without RLS restrictions
CREATE POLICY "Service role can manage roles" ON user_roles
  FOR ALL USING (auth.role() = 'service_role');

-- Alternative: If you need admin users to manage roles via the dashboard,
-- you can create a separate admin table and reference it directly:
-- But for now, we'll handle admin operations via the service role in the backend

-- Verify the policies are working
SELECT * FROM user_roles LIMIT 1;