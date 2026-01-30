-- Migration 022: Fix workout_history RLS Policy
-- Replace USING (true) with proper user_id check
-- Addresses Supabase linter warning: auth-users-table-rlspolicy

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on workout_history" ON public.workout_history;

-- Create secure policies with proper user_id checks
-- Users can only read their own workout history
CREATE POLICY "Users can view own workout_history"
  ON public.workout_history
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can only insert their own workout history
CREATE POLICY "Users can insert own workout_history"
  ON public.workout_history
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can only update their own workout history
CREATE POLICY "Users can update own workout_history"
  ON public.workout_history
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Users can only delete their own workout history
CREATE POLICY "Users can delete own workout_history"
  ON public.workout_history
  FOR DELETE
  USING (auth.uid()::text = user_id);
