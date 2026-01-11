-- Migration 015: Add Cardio Support
-- Adds exercise type field and cardio-specific data storage

-- Add exercise_type column to workout exercises (stored in JSONB)
-- This will be handled at application level since exercises are stored in workout_logs.exercises JSONB array
-- We'll add validation and structure through the app

-- Add cardio_data column to workout_logs for cardio-specific metrics
ALTER TABLE workout_logs
ADD COLUMN IF NOT EXISTS cardio_summary JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN workout_logs.cardio_summary IS 'Summary of cardio metrics: total duration (seconds), total distance (meters), avg heart rate, estimated calories';

-- Example structure of cardio_summary:
-- {
--   "totalDuration": 1800,        -- seconds
--   "totalDistance": 5000,         -- meters
--   "avgHeartRate": 145,           -- bpm
--   "estimatedCalories": 450,      -- kcal
--   "exercises": [
--     {
--       "name": "Running",
--       "duration": 1200,
--       "distance": 3000,
--       "heartRate": 150,
--       "intensity": "high",
--       "pace": "4:00/km"
--     }
--   ]
-- }

-- Create index on cardio_summary for queries
CREATE INDEX IF NOT EXISTS idx_workout_logs_has_cardio 
ON workout_logs ((cardio_summary->>'totalDuration'))
WHERE (cardio_summary->>'totalDuration')::int > 0;

-- Add user preferences for cardio units
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS cardio_preferences JSONB DEFAULT '{
  "distanceUnit": "km",
  "paceUnit": "min/km",
  "weeklyCardioGoal": 150
}'::jsonb;

COMMENT ON COLUMN user_profiles.cardio_preferences IS 'User preferences for cardio: distance unit (km/miles), pace format, weekly cardio goal in minutes';

-- Backward compatibility: all existing workouts are strength by default
-- No migration needed as exercises without type field will default to 'strength' in app logic
