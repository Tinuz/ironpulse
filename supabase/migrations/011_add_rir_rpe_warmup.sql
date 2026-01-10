-- Migration: Add RIR, RPE and warm-up tracking to workout_history
-- This enables progressive overload suggestions and recovery analytics

-- No schema changes needed!
-- The workout_history.exercises column is already JSONB and supports arbitrary fields.
-- This migration serves as documentation for the new data structure.

-- The 'exercises' JSONB column in workout_history contains an array of exercise objects.
-- Each exercise has a 'sets' array, and each set object can now include:
-- - rir: number (0-10) - Reps In Reserve
-- - rpe: number (1-10) - Rate of Perceived Exertion  
-- - isWarmup: boolean - Whether this set is a warm-up set

-- Example workout_history.exercises structure:
-- [
--   {
--     "id": "uuid",
--     "name": "Bench Press",
--     "sets": [
--       {
--         "id": "uuid",
--         "weight": 100,
--         "reps": 8,
--         "completed": true,
--         "rir": 2,  -- NEW: Reps In Reserve (0 = failure, 10 = very easy)
--         "rpe": 8,  -- NEW: Rate of Perceived Exertion (1 = very easy, 10 = max effort)
--         "isWarmup": false  -- NEW: Warm-up set flag (excluded from volume calculations)
--       }
--     ]
--   }
-- ]

-- Update column comment for documentation
COMMENT ON COLUMN workout_history.exercises IS 'JSONB array of exercises, each with sets array containing weight, reps, completed, rir (0-10), rpe (1-10), and isWarmup (boolean)';
