-- Migration 026: AI Chat History Table
-- Stores conversation history for AI coaches (AITrainer, SupplementsCoach, etc.)

-- Create ai_chat_history table
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_type TEXT NOT NULL CHECK (coach_type IN ('ai_trainer', 'supplements_coach')),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb -- For future extensibility (e.g., model version, tokens used)
);

-- Create indexes for efficient queries
CREATE INDEX idx_ai_chat_history_user_id ON ai_chat_history(user_id);
CREATE INDEX idx_ai_chat_history_coach_type ON ai_chat_history(coach_type);
CREATE INDEX idx_ai_chat_history_created_at ON ai_chat_history(created_at DESC);
CREATE INDEX idx_ai_chat_history_user_coach ON ai_chat_history(user_id, coach_type, created_at DESC);

-- Enable Row Level Security
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own chat history
CREATE POLICY "Users can view own chat history"
  ON ai_chat_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages"
  ON ai_chat_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat history"
  ON ai_chat_history
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE ai_chat_history IS 'Stores conversation history for AI coaches to maintain context across sessions';
COMMENT ON COLUMN ai_chat_history.coach_type IS 'Type of AI coach: ai_trainer, supplements_coach';
COMMENT ON COLUMN ai_chat_history.role IS 'Message sender: user or assistant';
COMMENT ON COLUMN ai_chat_history.metadata IS 'Additional metadata like model version, token count, etc.';
