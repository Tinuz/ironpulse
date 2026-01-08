-- Migration 006: Social Profiles
-- Enable users to have public profiles with privacy controls

-- Create social profiles table
CREATE TABLE IF NOT EXISTS public.user_social_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    bio TEXT CHECK (char_length(bio) <= 150),
    avatar_url TEXT,
    is_public BOOLEAN DEFAULT true,
    show_workouts BOOLEAN DEFAULT true,
    show_achievements BOOLEAN DEFAULT true,
    show_stats BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
    CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

-- Create indexes for performance
CREATE INDEX idx_social_profiles_username ON public.user_social_profiles(username);
CREATE INDEX idx_social_profiles_is_public ON public.user_social_profiles(is_public) WHERE is_public = true;
CREATE INDEX idx_social_profiles_user_id ON public.user_social_profiles(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_social_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can view public profiles
CREATE POLICY "Public profiles are viewable by everyone"
ON public.user_social_profiles FOR SELECT
USING (is_public = true OR user_id = auth.uid());

-- Users can update only their own profile
CREATE POLICY "Users can update their own profile"
ON public.user_social_profiles FOR UPDATE
USING (user_id = auth.uid());

-- Users can create their own profile
CREATE POLICY "Users can create their own profile"
ON public.user_social_profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can delete their own profile
CREATE POLICY "Users can delete their own profile"
ON public.user_social_profiles FOR DELETE
USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_social_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_social_profile_timestamp
BEFORE UPDATE ON public.user_social_profiles
FOR EACH ROW EXECUTE FUNCTION update_social_profile_updated_at();

-- Add profile stats view (read-only, combines profile with workout stats)
CREATE OR REPLACE VIEW public.user_profile_stats AS
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

-- Grant permissions on the view
GRANT SELECT ON public.user_profile_stats TO authenticated;
