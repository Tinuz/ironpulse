-- User Achievements Table
-- Stores unlocked achievements for cross-device sync and persistence

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_achievement UNIQUE(user_id, achievement_id)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id 
ON public.user_achievements(user_id);

-- Index for achievement analytics
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement_id 
ON public.user_achievements(achievement_id);

-- Index for recent achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked_at 
ON public.user_achievements(unlocked_at DESC);

-- Enable Row Level Security
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own achievements
CREATE POLICY "Users can view own achievements"
ON public.user_achievements
FOR SELECT
USING (auth.uid()::text = user_id);

-- RLS Policy: Users can insert their own achievements
CREATE POLICY "Users can unlock own achievements"
ON public.user_achievements
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- RLS Policy: Users cannot update achievements (locked once unlocked)
-- Achievements are immutable - once unlocked, they stay unlocked

-- RLS Policy: Users can delete their own achievements (for reset functionality)
CREATE POLICY "Users can delete own achievements"
ON public.user_achievements
FOR DELETE
USING (auth.uid()::text = user_id);

-- Comment on table
COMMENT ON TABLE public.user_achievements IS 'Stores user achievement unlocks for gamification system. Syncs across devices via Supabase.';
COMMENT ON COLUMN public.user_achievements.achievement_id IS 'Achievement identifier from achievementEngine.ts ALL_ACHIEVEMENTS array';
COMMENT ON COLUMN public.user_achievements.unlocked_at IS 'Timestamp when achievement was first unlocked';
