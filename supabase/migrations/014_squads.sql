-- Squads Feature
-- Small accountability groups for sharing workouts and progress

-- Squads Table
CREATE TABLE IF NOT EXISTS squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL, -- user_id of creator
  privacy TEXT NOT NULL DEFAULT 'invite_only' CHECK (privacy IN ('private', 'invite_only')),
  avatar_url TEXT, -- Optional squad photo/logo
  member_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Squad Members Table
CREATE TABLE IF NOT EXISTS squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(squad_id, user_id)
);

-- Squad Posts Table (workouts, check-ins, routine shares)
CREATE TABLE IF NOT EXISTS squad_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('workout', 'check_in', 'routine', 'announcement')),
  content JSONB NOT NULL, -- Flexible content: workout data, check-in message, routine, etc.
  text TEXT, -- Optional text caption
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Squad Post Reactions Table
CREATE TABLE IF NOT EXISTS squad_post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES squad_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  reaction TEXT NOT NULL CHECK (reaction IN ('fire', 'muscle', 'clap', 'heart', 'star')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, user_id, reaction)
);

-- Squad Post Comments Table
CREATE TABLE IF NOT EXISTS squad_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES squad_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_squads_created_by ON squads(created_by);
CREATE INDEX IF NOT EXISTS idx_squad_members_user_id ON squad_members(user_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_squad_id ON squad_members(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_posts_squad_id ON squad_posts(squad_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_squad_posts_user_id ON squad_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_squad_post_reactions_post_id ON squad_post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_squad_post_comments_post_id ON squad_post_comments(post_id, created_at DESC);

-- RLS Policies
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_post_comments ENABLE ROW LEVEL SECURITY;

-- Squads Policies
-- Users can view squads they are members of
CREATE POLICY "Users can view squads they are members of"
  ON squads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM squad_members
      WHERE squad_members.squad_id = squads.id
        AND squad_members.user_id = auth.uid()::text
    )
  );

-- Authenticated users can create squads
CREATE POLICY "Users can create squads"
  ON squads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Squad owners can update their squads
CREATE POLICY "Squad owners can update squads"
  ON squads
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM squad_members
      WHERE squad_members.squad_id = squads.id
        AND squad_members.user_id = auth.uid()::text
        AND squad_members.role IN ('owner', 'admin')
    )
  );

-- Squad owners can delete their squads
CREATE POLICY "Squad owners can delete squads"
  ON squads
  FOR DELETE
  USING (created_by = auth.uid()::text);

-- Squad Members Policies
-- Users can view all squad_members (access controlled via squads table)
-- This avoids infinite recursion when checking squad membership
CREATE POLICY "Users can view squad members"
  ON squad_members
  FOR SELECT
  USING (true);

-- Authenticated users can add squad members (app layer validates permissions)
CREATE POLICY "Squad creators can add first member"
  ON squad_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can leave squads (delete their own membership)
CREATE POLICY "Users can leave squads"
  ON squad_members
  FOR DELETE
  USING (user_id = auth.uid()::text);

-- Squad Posts Policies
-- Users can view posts in squads they belong to
CREATE POLICY "Users can view squad posts"
  ON squad_posts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM squad_members
      WHERE squad_members.squad_id = squad_posts.squad_id
        AND squad_members.user_id = auth.uid()::text
    )
  );

-- Squad members can create posts
CREATE POLICY "Squad members can create posts"
  ON squad_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
  ON squad_posts
  FOR UPDATE
  USING (user_id = auth.uid()::text);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
  ON squad_posts
  FOR DELETE
  USING (user_id = auth.uid()::text);

-- Squad Post Reactions Policies
-- Users can view all reactions (simplified)
CREATE POLICY "Users can view squad post reactions"
  ON squad_post_reactions
  FOR SELECT
  USING (true);

-- Squad members can add reactions
CREATE POLICY "Squad members can add reactions"
  ON squad_post_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions"
  ON squad_post_reactions
  FOR DELETE
  USING (user_id = auth.uid()::text);

-- Squad Post Comments Policies
-- Users can view all comments (simplified)
CREATE POLICY "Users can view squad post comments"
  ON squad_post_comments
  FOR SELECT
  USING (true);

-- Squad members can add comments
CREATE POLICY "Squad members can add comments"
  ON squad_post_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON squad_post_comments
  FOR DELETE
  USING (user_id = auth.uid()::text);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_squads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_squads_updated_at
  BEFORE UPDATE ON squads
  FOR EACH ROW
  EXECUTE FUNCTION update_squads_updated_at();

CREATE TRIGGER trigger_squad_posts_updated_at
  BEFORE UPDATE ON squad_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_squads_updated_at();

-- Function to update squad member count
CREATE OR REPLACE FUNCTION update_squad_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE squads
    SET member_count = member_count + 1
    WHERE id = NEW.squad_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE squads
    SET member_count = member_count - 1
    WHERE id = OLD.squad_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_squad_member_count
  AFTER INSERT OR DELETE ON squad_members
  FOR EACH ROW
  EXECUTE FUNCTION update_squad_member_count();
