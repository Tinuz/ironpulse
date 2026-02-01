-- Migration 025: Fix squad_members RLS Policy
-- Replace USING (true) with proper checks while avoiding infinite recursion
-- Addresses Supabase linter warning: auth-users-table-rlspolicy

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view squad members" ON squad_members;

-- Users can view squad members in two scenarios:
-- 1. Their own memberships (avoids recursion by checking user_id directly)
-- 2. Members of squads they belong to (via squad_id match with own membership)
CREATE POLICY "Users can view squad members"
  ON squad_members
  FOR SELECT
  USING (
    -- Can see own memberships
    user_id = auth.uid()::text
    OR
    -- Can see members of squads they belong to
    squad_id IN (
      SELECT squad_id FROM squad_members
      WHERE user_id = auth.uid()::text
    )
  );
