-- Migration 035: Expand fitness_goal CHECK constraint
-- Adds 'lean-bulk' (Barakat et al. 2020: +7% surplus) and
-- 'lean-cut' (Barakat et al. 2020: −10% deficit) alongside existing values.

ALTER TABLE public.user_profile
  DROP CONSTRAINT IF EXISTS user_profile_fitness_goal_check;

ALTER TABLE public.user_profile
  ADD CONSTRAINT user_profile_fitness_goal_check
    CHECK (fitness_goal IN ('bulk', 'lean-bulk', 'maintain', 'lean-cut', 'cut'));
