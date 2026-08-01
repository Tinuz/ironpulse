-- Migration 038: Add workout training intent
-- Allows technique/speed/form-focus sessions to be tracked separately from standard progression workouts.

ALTER TABLE public.workout_history
ADD COLUMN IF NOT EXISTS training_intent TEXT DEFAULT 'standard';

CREATE INDEX IF NOT EXISTS idx_workout_history_training_intent
ON public.workout_history(user_id, training_intent);

COMMENT ON COLUMN public.workout_history.training_intent IS 'Workout intent such as standard, technique, speed, or form_focus. Non-standard intents are ignored by progression/deload regression analytics.';