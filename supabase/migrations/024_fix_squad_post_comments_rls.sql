-- Migration 024: Fix squad_post_comments RLS Policy
-- Replace USING (true) with proper squad membership check
-- Addresses Supabase linter warning: auth-users-table-rlspolicy

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view squad post comments" ON squad_post_comments;

-- Users can view comments on posts in squads they belong to
CREATE POLICY "Users can view squad post comments"
  ON squad_post_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM squad_posts
      JOIN squad_members ON squad_members.squad_id = squad_posts.squad_id
      WHERE squad_posts.id = squad_post_comments.post_id
        AND squad_members.user_id = auth.uid()::text
    )
  );
