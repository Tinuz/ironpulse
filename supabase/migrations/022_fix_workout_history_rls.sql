-- Migration 022: Fix workout_history RLS Policy
-- Replace USING (true) with proper user_id check
-- Addresses Supabase linter warning: auth-users-table-rlspolicy

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow all operations on workout_history" ON public.workout_history;
DROP POLICY IF EXISTS "Users can view own workout_history" ON public.workout_history;
DROP POLICY IF EXISTS "Users can insert own workout_history" ON public.workout_history;
DROP POLICY IF EXISTS "Users can update own workout_history" ON public.workout_history;
DROP POLICY IF EXISTS "Users can delete own workout_history" ON public.workout_history;

-- Create secure policies with proper user_id checks
-- Users can view:
-- 1. Their own workout history
-- 2. Workouts from people they follow
-- 3. Workouts from squad members they share a squad with
CREATE POLICY "Users can view own workout_history"
  ON public.workout_history
  FOR SELECT
  USING (
    auth.uid()::text = user_id
    OR
    -- Can view workouts from people they follow
    EXISTS (
      SELECT 1 FROM user_follows
      WHERE follower_id = auth.uid()
      AND following_id::text = workout_history.user_id
    )
    OR
    -- Can view workouts from squad members
    EXISTS (
      SELECT 1 FROM squad_members sm1
      JOIN squad_members sm2 ON sm1.squad_id = sm2.squad_id
      WHERE sm1.user_id = auth.uid()::text
      AND sm2.user_id = workout_history.user_id
    )
  );

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
