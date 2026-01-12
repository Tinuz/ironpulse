-- Onboarding System Migration
-- Creates tables and functions for tracking user onboarding progress

-- Create onboarding_status table
CREATE TABLE IF NOT EXISTS onboarding_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_completed BOOLEAN DEFAULT FALSE,
  first_workout_completed BOOLEAN DEFAULT FALSE,
  tour_completed BOOLEAN DEFAULT FALSE,
  current_phase TEXT CHECK (current_phase IN ('profile', 'workout', 'tour', 'completed')) DEFAULT 'profile',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE onboarding_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onboarding_status
CREATE POLICY "Users can view their own onboarding status"
  ON onboarding_status
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding status"
  ON onboarding_status
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own onboarding status"
  ON onboarding_status
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create onboarding_events table for telemetry
CREATE TABLE IF NOT EXISTS onboarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE onboarding_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onboarding_events
CREATE POLICY "Users can view their own onboarding events"
  ON onboarding_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own onboarding events"
  ON onboarding_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_onboarding_status_user_id ON onboarding_status(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_user_id ON onboarding_events(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_created_at ON onboarding_events(created_at);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_onboarding_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on onboarding_status
DROP TRIGGER IF EXISTS trigger_update_onboarding_status_updated_at ON onboarding_status;
CREATE TRIGGER trigger_update_onboarding_status_updated_at
  BEFORE UPDATE ON onboarding_status
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_status_updated_at();

-- Add is_first_plan column to schemas table
ALTER TABLE schemas 
ADD COLUMN IF NOT EXISTS is_first_plan BOOLEAN DEFAULT FALSE;
 