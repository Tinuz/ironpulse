-- Migration 036: Training Blocks (GAS Periodization)
-- Implements Frank's GAS (General Adaptation Syndrome) training principle:
-- 4–6 week build blocks with progressive volume increases followed by a deload week.
--
-- Block structure (5-week example):
--   W1 = MEV (8 sets/focus muscle)
--   W2 = MEV + 3
--   W3 = MEV + 6
--   W4 = MEV + 9
--   W5 = deload (~50% of previous week)

CREATE TABLE IF NOT EXISTS public.training_blocks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         TEXT NOT NULL,
    name            TEXT NOT NULL,
    start_date      DATE NOT NULL,
    duration_weeks  INTEGER NOT NULL CHECK (duration_weeks IN (4, 5, 6)),
    focus_muscles   TEXT[] NOT NULL DEFAULT '{}',
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_blocks_user_status
  ON public.training_blocks(user_id, status);

CREATE INDEX IF NOT EXISTS idx_training_blocks_user_created
  ON public.training_blocks(user_id, created_at DESC);

-- Row Level Security
ALTER TABLE public.training_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training blocks"
  ON public.training_blocks FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own training blocks"
  ON public.training_blocks FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own training blocks"
  ON public.training_blocks FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own training blocks"
  ON public.training_blocks FOR DELETE
  USING (auth.uid()::text = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_training_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER training_blocks_updated_at
    BEFORE UPDATE ON public.training_blocks
    FOR EACH ROW
    EXECUTE FUNCTION update_training_blocks_updated_at();

COMMENT ON TABLE public.training_blocks IS 'GAS-principle training blocks: 4–6 week progressive volume cycles per focus muscle group, ending in a deload week.';
COMMENT ON COLUMN public.training_blocks.focus_muscles IS 'Array of MuscleGroup values (e.g. {chest, back}) that this block targets with progressive overload.';
COMMENT ON COLUMN public.training_blocks.duration_weeks IS 'Total block duration including the final deload week (4, 5, or 6 weeks).';
