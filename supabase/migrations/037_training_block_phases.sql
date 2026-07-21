-- Migration 037: Training Block Phase System
--
-- Extends the training_blocks table with cycle-based periodization support.
-- Adds three optional columns; existing blocks are unaffected (all nullable).
--
-- Scientific basis:
--   Cycle-based periodization (Poliquin 1988; Bompa & Haff 2009):
--   Progression is tied to training cycles (schema rotations), not calendar weeks.
--   Each phase has a named RIR target (Zourdos et al. 2016) and volume range
--   aligned to MEV → MAV progression (Israetel, RP Strength 2019).

ALTER TABLE public.training_blocks
  ADD COLUMN IF NOT EXISTS total_cycles    INTEGER,
  ADD COLUMN IF NOT EXISTS schema_rotation TEXT[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS phases          JSONB;

COMMENT ON COLUMN public.training_blocks.total_cycles IS
  'Total training cycles in the block (one cycle = full rotation through schema_rotation). '
  'Optional; only set for enhanced mesocyclus blocks (e.g. 7 for a chest mesocyclus).';

COMMENT ON COLUMN public.training_blocks.schema_rotation IS
  'Schema IDs in rotation order (e.g. {upper-a-id, lower-a-id, upper-b-id, lower-b-id}). '
  'Used to count completed cycles from workout history.';

COMMENT ON COLUMN public.training_blocks.phases IS
  'JSON array of BlockPhase objects. Each phase defines: name, emoji, cycleStart, cycleEnd, '
  'targetRIR, isDeload, failurePermittedExercises[], and an optional coachNote. '
  'Null for legacy calendar-week blocks.';
