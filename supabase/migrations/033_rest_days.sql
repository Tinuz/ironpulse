-- Migration 033: User Rest Days
-- Allows users to mark specific days as planned rest (deload, vacation, rest day).
-- These days are excluded from streak-break detection, deload recommendation
-- checks, and plateau calculations.

CREATE TABLE IF NOT EXISTS public.user_rest_days (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'rest' CHECK (type IN ('rest', 'deload', 'vacation')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.user_rest_days ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own rest days
CREATE POLICY "Users can manage own rest days"
  ON public.user_rest_days
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for fast per-user date lookups
CREATE INDEX IF NOT EXISTS idx_user_rest_days_user_date
  ON public.user_rest_days(user_id, date DESC);

COMMENT ON TABLE public.user_rest_days IS 'Manually marked rest/deload/vacation days per user. Used to avoid false streak breaks and false plateau/fatigue alarms.';
