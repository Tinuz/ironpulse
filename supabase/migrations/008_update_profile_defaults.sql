-- Migration 008: Update existing profile defaults
-- Set existing profiles to public by default

-- Update existing profiles to be public and show workouts
UPDATE public.user_social_profiles 
SET 
    is_public = true,
    show_workouts = true
WHERE is_public = false OR show_workouts = false;

-- Update the default values for future inserts
ALTER TABLE public.user_social_profiles 
ALTER COLUMN is_public SET DEFAULT true;

ALTER TABLE public.user_social_profiles 
ALTER COLUMN show_workouts SET DEFAULT true;
