-- Migration 021: Fix schemas RLS Policy
-- Replace USING (true) with proper user_id check
-- Addresses Supabase linter warning: auth-users-table-rlspolicy

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on schemas" ON public.schemas;

-- Create secure policies with proper user_id checks
-- Users can only read their own schemas
CREATE POLICY "Users can view own schemas"
  ON public.schemas
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can only insert their own schemas
CREATE POLICY "Users can insert own schemas"
  ON public.schemas
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can only update their own schemas
CREATE POLICY "Users can update own schemas"
  ON public.schemas
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Users can only delete their own schemas
CREATE POLICY "Users can delete own schemas"
  ON public.schemas
  FOR DELETE
  USING (auth.uid()::text = user_id);
