-- Migration 015: Add Cardio Support
-- Adds cardio preferences to user profiles

-- Note: Workout data (including exercises and cardio_summary) is stored locally in the app.
-- This migration only adds user preferences for cardio units and goals.

-- Add user preferences for cardio units
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS cardio_preferences JSONB DEFAULT '{
  "distanceUnit": "km",
  "paceUnit": "min/km",
  "weeklyCardioGoal": 150
}'::jsonb;

COMMENT ON COLUMN user_profiles.cardio_preferences IS 'User preferences for cardio: distance unit (km/miles), pace format, weekly cardio goal in minutes';

-- Backward compatibility: all existing workouts are strength by default
-- Exercise type ('strength' | 'cardio') and cardioData are handled at application level
-- No database migration needed for local workout storage
