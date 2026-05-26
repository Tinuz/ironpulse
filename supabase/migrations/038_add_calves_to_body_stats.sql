-- Migration 038: Add calves circumference tracking to body_stats
--
-- Enables users to track kuitomtrek for 4-6 week hypertrophy progress checks.

ALTER TABLE public.body_stats
  ADD COLUMN IF NOT EXISTS calves DECIMAL(5,2);

COMMENT ON COLUMN public.body_stats.calves IS
  'Kuitomtrek in cm voor progress tracking van onderlichaam hypertrofie.';
