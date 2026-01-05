-- Add user_profile table for storing fitness calculator data
CREATE TABLE IF NOT EXISTS public.user_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL UNIQUE,
    age INTEGER NOT NULL,
    weight DECIMAL(5,1) NOT NULL,
    height DECIMAL(5,1) NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    activity_level DECIMAL(3,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON public.user_profile(user_id);
