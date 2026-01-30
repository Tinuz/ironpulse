-- Migration 019: Fix body_stats RLS Policy
-- Replace USING (true) with proper user_id check
-- Addresses Supabase linter warning: auth-users-table-rlspolicy

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on body_stats" ON public.body_stats;

-- Create secure policies with proper user_id checks
-- Users can only read their own body stats
CREATE POLICY "Users can view own body_stats"
  ON public.body_stats
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can only insert their own body stats
CREATE POLICY "Users can insert own body_stats"
  ON public.body_stats
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can only update their own body stats
CREATE POLICY "Users can update own body_stats"
  ON public.body_stats
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Users can only delete their own body stats
CREATE POLICY "Users can delete own body_stats"
  ON public.body_stats
  FOR DELETE
  USING (auth.uid()::text = user_id);
