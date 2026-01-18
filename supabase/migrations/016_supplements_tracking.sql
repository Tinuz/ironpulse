-- Migration: Supplements Tracking System
-- Enable users to track daily supplement intake (protein powder, creatine, vitamins, etc.)

-- Create supplements table
CREATE TABLE IF NOT EXISTS public.supplements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    name TEXT NOT NULL,
    dosage_amount NUMERIC(10, 2) NOT NULL, -- Amount taken (e.g., 5.0)
    dosage_unit TEXT NOT NULL, -- 'g' (grams), 'mg' (milligrams), 'pills', 'capsules', 'scoops', 'ml', etc.
    brand TEXT, -- Optional brand name
    timing TEXT, -- 'morning', 'pre-workout', 'post-workout', 'evening', 'with-meal', etc.
    notes TEXT, -- Optional user notes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_supplements_user_date ON public.supplements(user_id, date DESC);
CREATE INDEX idx_supplements_user ON public.supplements(user_id);
CREATE INDEX idx_supplements_date ON public.supplements(date DESC);

-- Enable Row Level Security
ALTER TABLE public.supplements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own supplements
CREATE POLICY "Users can view own supplements"
ON public.supplements FOR SELECT
USING (auth.uid()::text = user_id);

-- Users can insert their own supplements
CREATE POLICY "Users can insert own supplements"
ON public.supplements FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own supplements
CREATE POLICY "Users can update own supplements"
ON public.supplements FOR UPDATE
USING (auth.uid()::text = user_id);

-- Users can delete their own supplements
CREATE POLICY "Users can delete own supplements"
ON public.supplements FOR DELETE
USING (auth.uid()::text = user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_supplements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supplements_updated_at
    BEFORE UPDATE ON public.supplements
    FOR EACH ROW
    EXECUTE FUNCTION update_supplements_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.supplements IS 'Daily supplement intake tracking (protein, creatine, vitamins, etc.)';
COMMENT ON COLUMN public.supplements.dosage_amount IS 'Amount of supplement taken (e.g., 5.0 for 5g creatine)';
COMMENT ON COLUMN public.supplements.dosage_unit IS 'Unit of measurement: g, mg, pills, capsules, scoops, ml, etc.';
COMMENT ON COLUMN public.supplements.timing IS 'When supplement was taken: morning, pre-workout, post-workout, evening, with-meal';
