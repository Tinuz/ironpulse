-- Migration: Supplement Stacks (Routine Templates)
-- Allows users to define a personal supplement routine once; daily logs use the
-- existing supplements table via logStackToday in DataContext.

CREATE TABLE IF NOT EXISTS public.supplement_stacks (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       TEXT NOT NULL,
    name          TEXT NOT NULL,
    dosage_amount NUMERIC(10, 2) NOT NULL,
    dosage_unit   TEXT NOT NULL,
    brand         TEXT,
    timing        TEXT,
    notes         TEXT,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_supplement_stacks_user ON public.supplement_stacks(user_id);
CREATE INDEX idx_supplement_stacks_user_active ON public.supplement_stacks(user_id, is_active);

-- RLS
ALTER TABLE public.supplement_stacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own supplement stacks"
  ON public.supplement_stacks FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own supplement stacks"
  ON public.supplement_stacks FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own supplement stacks"
  ON public.supplement_stacks FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own supplement stacks"
  ON public.supplement_stacks FOR DELETE
  USING (auth.uid()::text = user_id);

-- updated_at trigger (reuse pattern from supplements table)
CREATE OR REPLACE FUNCTION update_supplement_stacks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supplement_stacks_updated_at
    BEFORE UPDATE ON public.supplement_stacks
    FOR EACH ROW
    EXECUTE FUNCTION update_supplement_stacks_updated_at();

COMMENT ON TABLE public.supplement_stacks IS 'Supplement routine templates — defined once, logged daily via the supplements table.';
