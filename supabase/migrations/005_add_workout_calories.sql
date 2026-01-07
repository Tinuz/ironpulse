-- Add calorie tracking columns to workout_history table
-- These columns support the MET-based calorie estimation feature

ALTER TABLE public.workout_history 
ADD COLUMN IF NOT EXISTS total_calories INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS met_value DECIMAL(3,1) DEFAULT 5.0;

-- Add comments for documentation
COMMENT ON COLUMN public.workout_history.total_calories IS 'Estimated total calories burned during workout (calculated using MET formula)';
COMMENT ON COLUMN public.workout_history.met_value IS 'MET (Metabolic Equivalent of Task) value used for calorie calculation (default: 5.0 for moderate strength training)';

-- Note: Individual exercise duration and calories are stored in the exercises JSONB column
-- This allows flexibility without requiring schema changes for per-exercise data
