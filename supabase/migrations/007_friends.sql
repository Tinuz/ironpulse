-- Migration 007: Friend System (Following)
-- Enable users to follow each other and see friends' activity

-- Create follows table
CREATE TABLE IF NOT EXISTS public.user_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Create indexes for fast lookups
CREATE INDEX idx_follows_follower ON public.user_follows(follower_id);
CREATE INDEX idx_follows_following ON public.user_follows(following_id);
CREATE INDEX idx_follows_created ON public.user_follows(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view follows where they are involved (as follower or following)
CREATE POLICY "Users can view their own follows"
ON public.user_follows FOR SELECT
USING (follower_id = auth.uid() OR following_id = auth.uid());

-- Users can follow others (insert)
CREATE POLICY "Users can follow others"
ON public.user_follows FOR INSERT
WITH CHECK (follower_id = auth.uid());

-- Users can unfollow others (delete their own follows)
CREATE POLICY "Users can unfollow others"
ON public.user_follows FOR DELETE
USING (follower_id = auth.uid());

-- Create friend statistics view
CREATE OR REPLACE VIEW public.user_friend_stats AS
SELECT 
    sp.user_id,
    sp.username,
    (
        SELECT COUNT(*) 
        FROM user_follows 
        WHERE follower_id = sp.user_id
    ) as following_count,
    (
        SELECT COUNT(*) 
        FROM user_follows 
        WHERE following_id = sp.user_id
    ) as followers_count,
    (
        -- Mutual follows (friends)
        SELECT COUNT(*)
        FROM user_follows f1
        WHERE f1.follower_id = sp.user_id
        AND EXISTS (
            SELECT 1 FROM user_follows f2
            WHERE f2.follower_id = f1.following_id
            AND f2.following_id = sp.user_id
        )
    ) as mutual_friends_count
FROM user_social_profiles sp;

-- Grant permissions
GRANT SELECT ON public.user_friend_stats TO authenticated;

-- Function to check if user A follows user B
CREATE OR REPLACE FUNCTION is_following(
    follower_user_id UUID,
    following_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 
        FROM user_follows 
        WHERE follower_id = follower_user_id 
        AND following_id = following_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get mutual friends (people who follow each other)
CREATE OR REPLACE FUNCTION get_mutual_friends(user_id_param UUID)
RETURNS TABLE(
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sp.user_id,
        sp.username,
        sp.display_name,
        sp.avatar_url
    FROM user_social_profiles sp
    WHERE sp.user_id IN (
        -- Users that current user follows
        SELECT following_id 
        FROM user_follows 
        WHERE follower_id = user_id_param
        -- And who also follow current user back
        INTERSECT
        SELECT follower_id 
        FROM user_follows 
        WHERE following_id = user_id_param
    )
    AND sp.is_public = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for recent friend activity (workouts from people you follow)
CREATE OR REPLACE VIEW public.friend_activity_feed AS
SELECT 
    wh.id as workout_id,
    wh.user_id,
    sp.username,
    sp.display_name,
    sp.avatar_url,
    wh.name as workout_name,
    wh.date as workout_date,
    wh.exercises,
    wh.start_time,
    wh.end_time,
    (wh.end_time - wh.start_time) / 1000 / 60 as duration_minutes,
    jsonb_array_length(wh.exercises) as exercise_count
FROM workout_history wh
JOIN user_social_profiles sp ON wh.user_id = sp.user_id::text
WHERE sp.is_public = true 
AND sp.show_workouts = true
ORDER BY wh.date DESC;

-- Grant permissions
GRANT SELECT ON public.friend_activity_feed TO authenticated;
