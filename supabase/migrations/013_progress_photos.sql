-- Progress Photos Table
-- Stores metadata for user progress photos uploaded to Supabase Storage

CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  photo_url TEXT NOT NULL, -- Path in UserProgressPhotos bucket
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'friends', 'public')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient user queries
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_id ON progress_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_date ON progress_photos(date DESC);
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_date ON progress_photos(user_id, date DESC);

-- RLS Policies
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

-- Users can view their own photos
CREATE POLICY "Users can view own progress photos"
  ON progress_photos
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can insert their own photos
CREATE POLICY "Users can insert own progress photos"
  ON progress_photos
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own photos (notes, visibility, date)
CREATE POLICY "Users can update own progress photos"
  ON progress_photos
  FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

-- Users can delete their own photos
CREATE POLICY "Users can delete own progress photos"
  ON progress_photos
  FOR DELETE
  USING (auth.uid()::text = user_id);

-- Friends can view photos with 'friends' visibility (future enhancement)
-- CREATE POLICY "Friends can view shared photos"
--   ON progress_photos
--   FOR SELECT
--   USING (
--     visibility = 'friends' AND
--     EXISTS (
--       SELECT 1 FROM friends
--       WHERE (user_id_1 = auth.uid()::text AND user_id_2 = progress_photos.user_id)
--          OR (user_id_2 = auth.uid()::text AND user_id_1 = progress_photos.user_id)
--     )
--   );

-- Public photos can be viewed by anyone (future enhancement)
-- CREATE POLICY "Anyone can view public photos"
--   ON progress_photos
--   FOR SELECT
--   USING (visibility = 'public');

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_progress_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_progress_photos_updated_at
  BEFORE UPDATE ON progress_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_progress_photos_updated_at();

-- Storage bucket policy (assuming UserProgressPhotos bucket exists)
-- Note: Run these in Supabase Dashboard > Storage > UserProgressPhotos > Policies

-- Users can upload to their own folder
-- CREATE POLICY "Users can upload own photos"
--   ON storage.objects
--   FOR INSERT
--   WITH CHECK (
--     bucket_id = 'UserProgressPhotos' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- Users can view their own photos
-- CREATE POLICY "Users can view own photos"
--   ON storage.objects
--   FOR SELECT
--   USING (
--     bucket_id = 'UserProgressPhotos' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- Users can delete their own photos
-- CREATE POLICY "Users can delete own photos"
--   ON storage.objects
--   FOR DELETE
--   USING (
--     bucket_id = 'UserProgressPhotos' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );
