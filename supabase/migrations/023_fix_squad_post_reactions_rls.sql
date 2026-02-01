-- Migration 023: Fix squad_post_reactions RLS Policy
-- Replace USING (true) with proper squad membership check
-- Addresses Supabase linter warning: auth-users-table-rlspolicy

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view squad post reactions" ON squad_post_reactions;

-- Users can view reactions on posts in squads they belong to
CREATE POLICY "Users can view squad post reactions"
  ON squad_post_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM squad_posts
      JOIN squad_members ON squad_members.squad_id = squad_posts.squad_id
      WHERE squad_posts.id = squad_post_reactions.post_id
        AND squad_members.user_id = auth.uid()::text
    )
  );
