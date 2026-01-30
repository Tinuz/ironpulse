-- Migration 020: Fix nutrition_logs RLS Policy
-- Replace USING (true) with proper user_id check
-- Addresses Supabase linter warning: auth-users-table-rlspolicy

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on nutrition_logs" ON public.nutrition_logs;

-- Create secure policies with proper user_id checks
-- Users can only read their own nutrition logs
CREATE POLICY "Users can view own nutrition_logs"
  ON public.nutrition_logs
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can only insert their own nutrition logs
CREATE POLICY "Users can insert own nutrition_logs"
  ON public.nutrition_logs
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can only update their own nutrition logs
CREATE POLICY "Users can update own nutrition_logs"
  ON public.nutrition_logs
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Users can only delete their own nutrition logs
CREATE POLICY "Users can delete own nutrition_logs"
  ON public.nutrition_logs
  FOR DELETE
  USING (auth.uid()::text = user_id);
