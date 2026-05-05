-- Migration 032: Add fitness_goal to user_profile
-- Supports: 'bulk' | 'cut' | 'maintain'
-- Scientific basis: Slater & Phillips 2011 (J Sports Sci)
-- Calorie targets adjusted per goal; protein targets per Morton et al. 2018 (BJSM)

ALTER TABLE public.user_profile
  ADD COLUMN IF NOT EXISTS fitness_goal TEXT DEFAULT 'maintain'
    CHECK (fitness_goal IN ('bulk', 'cut', 'maintain'));
