-- Migration 015: Add Cardio Support
-- Adds cardio preferences to user profiles and cardio summary to workout history

-- Add cardio_summary column to workout_history for cardio-specific metrics
ALTER TABLE workout_history
ADD COLUMN IF NOT EXISTS cardio_summary JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN workout_history.cardio_summary IS 'Summary of cardio metrics: total duration (seconds), total distance (meters), avg heart rate, estimated calories';

-- Example structure of cardio_summary:
-- {
--   "totalDuration": 1800,        -- seconds
--   "totalDistance": 5000,         -- meters
--   "avgHeartRate": 145,           -- bpm
--   "estimatedCalories": 450       -- kcal
-- }

-- Create index on cardio_summary for queries
CREATE INDEX IF NOT EXISTS idx_workout_history_has_cardio 
ON workout_history ((cardio_summary->>'totalDuration'))
WHERE (cardio_summary->>'totalDuration')::int > 0;

-- Add user preferences for cardio units
ALTER TABLE user_profile
ADD COLUMN IF NOT EXISTS cardio_preferences JSONB DEFAULT '{
  "distanceUnit": "km",
  "paceUnit": "min/km",
  "weeklyCardioGoal": 150
}'::jsonb;

COMMENT ON COLUMN user_profile.cardio_preferences IS 'User preferences for cardio: distance unit (km/miles), pace format, weekly cardio goal in minutes';

-- Backward compatibility: all existing workouts are strength by default
-- Exercise type ('strength' | 'cardio') and cardioData are stored in exercises JSONB array
