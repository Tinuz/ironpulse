-- Migration 010: Social Interactions (Reactions Only)
-- Enable users to react to each other's workouts

-- Workout reactions table
CREATE TABLE IF NOT EXISTS public.workout_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id UUID NOT NULL REFERENCES public.workout_history(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN (
        'fire', 'strong', 'clap', 'beast'
    )),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workout_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_reactions_workout ON public.workout_reactions(workout_id);
CREATE INDEX idx_reactions_user ON public.workout_reactions(user_id);
CREATE INDEX idx_reactions_created ON public.workout_reactions(created_at DESC);

-- Enable RLS
ALTER TABLE public.workout_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can view reactions on public workouts
CREATE POLICY "Users can view reactions"
ON public.workout_reactions FOR SELECT
USING (true);

-- Users can add reactions to any workout
CREATE POLICY "Users can add reactions"
ON public.workout_reactions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own reactions
CREATE POLICY "Users can update own reactions"
ON public.workout_reactions FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
ON public.workout_reactions FOR DELETE
USING (user_id = auth.uid());

-- Reaction counts view (aggregated per workout)
CREATE OR REPLACE VIEW public.workout_reaction_counts AS
SELECT 
    workout_id,
    COUNT(*) as total_reactions,
    COUNT(*) FILTER (WHERE reaction_type = 'fire') as fire_count,
    COUNT(*) FILTER (WHERE reaction_type = 'strong') as strong_count,
    COUNT(*) FILTER (WHERE reaction_type = 'clap') as clap_count,
    COUNT(*) FILTER (WHERE reaction_type = 'beast') as beast_count,
    ARRAY_AGG(DISTINCT user_id) as reactor_ids
FROM workout_reactions
GROUP BY workout_id;

-- Grant permissions
GRANT SELECT ON public.workout_reaction_counts TO authenticated;

-- Notification view (reactions on my workouts)
CREATE OR REPLACE VIEW public.workout_reaction_notifications AS
SELECT 
    wh.user_id as workout_owner_id,
    wr.id as reaction_id,
    wr.workout_id,
    wr.user_id as reactor_id,
    sp.username as reactor_username,
    sp.display_name as reactor_display_name,
    sp.avatar_url as reactor_avatar,
    wr.reaction_type,
    wh.name as workout_name,
    wr.created_at
FROM workout_reactions wr
JOIN workout_history wh ON wr.workout_id = wh.id
LEFT JOIN user_social_profiles sp ON wr.user_id = sp.user_id
WHERE wr.user_id::text != wh.user_id  -- Don't notify self-reactions
ORDER BY wr.created_at DESC;

-- Grant permissions
GRANT SELECT ON public.workout_reaction_notifications TO authenticated;

-- Function to get unread reaction count for a user
CREATE OR REPLACE FUNCTION get_unread_reaction_count(user_id_param UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM workout_reaction_notifications
        WHERE workout_owner_id = user_id_param::text
        AND created_at > COALESCE(
            (SELECT last_checked_reactions FROM user_notification_state WHERE user_id = user_id_param),
            '1970-01-01'::timestamptz
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track when user last checked their notifications
CREATE TABLE IF NOT EXISTS public.user_notification_state (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    last_checked_reactions TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for notification state
ALTER TABLE public.user_notification_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification state"
ON public.user_notification_state FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notification state"
ON public.user_notification_state FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification state"
ON public.user_notification_state FOR INSERT
WITH CHECK (user_id = auth.uid());
