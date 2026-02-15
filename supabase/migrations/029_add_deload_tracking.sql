-- Migration 029: Add Deload Tracking to Workouts
-- Add is_deload flag to identify recovery/deload week workouts
-- These workouts should be excluded from progressive overload calculations

ALTER TABLE public.workout_history
ADD COLUMN IF NOT EXISTS is_deload BOOLEAN DEFAULT false;

-- Create index for filtering out deload workouts in analytics
CREATE INDEX IF NOT EXISTS idx_workout_history_not_deload ON public.workout_history(user_id, date DESC) WHERE is_deload = false;

COMMENT ON COLUMN public.workout_history.is_deload IS 'Indicates if this workout was a deload/recovery session (typically with reduced weights). Excluded from progressive overload tracking.';
