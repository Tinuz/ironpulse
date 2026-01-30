-- Migration 018: Fix Function Search Path Security Issues
-- Add explicit search_path to all functions to prevent schema poisoning attacks
-- Addresses Supabase linter warnings: function_search_path_mutable

-- ============================================================================
-- FIX: Add search_path to trigger functions
-- ============================================================================

-- 1. update_supplements_updated_at (from 016_supplements_tracking.sql)
CREATE OR REPLACE FUNCTION update_supplements_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 2. update_onboarding_status_updated_at (from 011_onboarding_system.sql)
CREATE OR REPLACE FUNCTION update_onboarding_status_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3. update_progress_photos_updated_at (from 013_progress_photos.sql)
CREATE OR REPLACE FUNCTION update_progress_photos_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 4. update_squads_updated_at (from 014_squads.sql)
CREATE OR REPLACE FUNCTION update_squads_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 5. update_squad_member_count (from 014_squads.sql)
CREATE OR REPLACE FUNCTION update_squad_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE squads SET member_count = member_count + 1 WHERE id = NEW.squad_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE squads SET member_count = member_count - 1 WHERE id = OLD.squad_id;
  END IF;
  RETURN NULL;
END;
$$;

-- 6. update_social_profile_updated_at (from 006_social_profiles.sql)
CREATE OR REPLACE FUNCTION update_social_profile_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================================================
-- FIX: Add search_path to utility functions
-- ============================================================================

-- 7. generate_share_code (from 012_shared_templates.sql)
CREATE OR REPLACE FUNCTION generate_share_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- 8. is_following (from 007_friends.sql)
-- Note: Must drop first because parameter names changed
DROP FUNCTION IF EXISTS is_following(UUID, UUID);

CREATE OR REPLACE FUNCTION is_following(
    follower_user_id UUID,
    following_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_follows
        WHERE follower_id = follower_user_id
        AND following_id = following_user_id
    );
END;
$$;

-- 9. get_mutual_friends (from 007_friends.sql)
-- Note: Must drop first because return type structure may differ
DROP FUNCTION IF EXISTS get_mutual_friends(UUID);

CREATE OR REPLACE FUNCTION get_mutual_friends(user_id_param UUID)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- 10. get_unread_reaction_count (from 010_social_interactions.sql)
CREATE OR REPLACE FUNCTION get_unread_reaction_count(user_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- 11. increment_template_view (from 012_shared_templates.sql)
CREATE OR REPLACE FUNCTION increment_template_view(share_code_param TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE shared_templates
    SET 
        view_count = view_count + 1,
        last_viewed_at = NOW()
    WHERE share_code = share_code_param;
END;
$$;

-- 12. increment_template_import (from 012_shared_templates.sql)
CREATE OR REPLACE FUNCTION increment_template_import(share_code_param TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE shared_templates
    SET import_count = import_count + 1
    WHERE share_code = share_code_param;
END;
$$;

-- ============================================================================
-- All 12 functions now have explicit search_path set to 'public, pg_temp'
-- This prevents schema poisoning attacks and ensures consistent behavior
-- ============================================================================

