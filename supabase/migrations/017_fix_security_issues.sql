-- Migration 017: Fix Security Issues
-- Address Supabase linter warnings:
-- 1. Remove SECURITY DEFINER from views (use SECURITY INVOKER instead)
-- 2. Enable RLS on user_profile table

-- ============================================================================
-- FIX 1: Enable RLS on user_profile table
-- ============================================================================

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.user_profile FOR SELECT
USING (user_id = auth.uid()::text);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.user_profile FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.user_profile FOR UPDATE
USING (user_id = auth.uid()::text);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile"
ON public.user_profile FOR DELETE
USING (user_id = auth.uid()::text);

-- ============================================================================
-- FIX 2: Recreate views with SECURITY INVOKER instead of SECURITY DEFINER
-- ============================================================================

-- user_profile_stats view (from 006_social_profiles.sql)
DROP VIEW IF EXISTS public.user_profile_stats;

CREATE VIEW public.user_profile_stats 
WITH (security_invoker=true) AS
SELECT 
    sp.user_id,
    sp.username,
    sp.display_name,
    sp.bio,
    sp.avatar_url,
    sp.is_public,
    sp.show_workouts,
    sp.show_achievements,
    sp.show_stats,
    sp.created_at,
    COALESCE(COUNT(DISTINCT wh.id), 0) as total_workouts,
    COALESCE(MAX(wh.date), NULL) as last_workout_date,
    -- Streak calculation (simplified)
    (
        SELECT COUNT(DISTINCT date::date)
        FROM workout_history 
        WHERE user_id = sp.user_id::text
        AND date >= NOW() - INTERVAL '30 days'
    ) as workouts_last_30_days,
    -- Achievement count
    (
        SELECT COUNT(*)
        FROM user_achievements
        WHERE user_id = sp.user_id::text
    ) as achievement_count
FROM user_social_profiles sp
LEFT JOIN workout_history wh ON sp.user_id::text = wh.user_id
GROUP BY sp.user_id, sp.username, sp.display_name, sp.bio, sp.avatar_url, 
         sp.is_public, sp.show_workouts, sp.show_achievements, sp.show_stats, sp.created_at;

GRANT SELECT ON public.user_profile_stats TO authenticated;

-- workout_reaction_notifications view (from 010_social_interactions.sql)
DROP VIEW IF EXISTS public.workout_reaction_notifications;

CREATE VIEW public.workout_reaction_notifications 
WITH (security_invoker=true) AS
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

GRANT SELECT ON public.workout_reaction_notifications TO authenticated;

-- workout_reaction_counts view (from 010_social_interactions.sql)
DROP VIEW IF EXISTS public.workout_reaction_counts;

CREATE VIEW public.workout_reaction_counts 
WITH (security_invoker=true) AS
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

GRANT SELECT ON public.workout_reaction_counts TO authenticated;

-- friend_activity_feed view (from 007_friends.sql)
DROP VIEW IF EXISTS public.friend_activity_feed;

CREATE VIEW public.friend_activity_feed 
WITH (security_invoker=true) AS
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

GRANT SELECT ON public.friend_activity_feed TO authenticated;

-- user_friend_stats view (from 007_friends.sql)
DROP VIEW IF EXISTS public.user_friend_stats;

CREATE VIEW public.user_friend_stats 
WITH (security_invoker=true) AS
SELECT 
    sp.user_id,
    sp.username,
    COALESCE(followers.count, 0) as follower_count,
    COALESCE(following.count, 0) as following_count,
    COALESCE(friends.count, 0) as friend_count
FROM user_social_profiles sp
LEFT JOIN (
    SELECT following_id as user_id, COUNT(*) as count
    FROM user_follows
    GROUP BY following_id
) followers ON sp.user_id = followers.user_id
LEFT JOIN (
    SELECT follower_id as user_id, COUNT(*) as count
    FROM user_follows
    GROUP BY follower_id
) following ON sp.user_id = following.user_id
LEFT JOIN (
    -- Mutual follows (friends)
    SELECT f1.follower_id as user_id, COUNT(*) as count
    FROM user_follows f1
    INNER JOIN user_follows f2 
        ON f1.follower_id = f2.following_id 
        AND f1.following_id = f2.follower_id
    GROUP BY f1.follower_id
) friends ON sp.user_id = friends.user_id;

GRANT SELECT ON public.user_friend_stats TO authenticated;

-- ============================================================================
-- Note: Functions with SECURITY DEFINER are kept as-is because they need
-- elevated permissions to query across user boundaries. These are:
-- - get_user_friends() - needs to query user_follows for other users
-- - get_unread_reaction_count() - needs to access notification state
-- - increment_share_count() - needs to update shared_templates
-- - get_shared_template() - needs to query templates by share_code
-- ============================================================================

