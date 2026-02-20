-- Migration: Exercise Images Storage Bucket
-- Description: Create storage bucket for user-uploaded exercise images
-- Date: 2026-02-20

-- Create storage bucket for exercise images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ExerciseImages',
  'ExerciseImages',
  true, -- Public bucket for easy image access
  5242880, -- 5MB max file size
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the storage bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view/download exercise images (public bucket)
CREATE POLICY "Exercise images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'ExerciseImages');

-- Policy: Users can upload exercise images to their own folder
CREATE POLICY "Users can upload exercise images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ExerciseImages' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (
    lower((storage.extension(name))) = 'jpg' 
    OR lower((storage.extension(name))) = 'jpeg'
    OR lower((storage.extension(name))) = 'png'
    OR lower((storage.extension(name))) = 'webp'
    OR lower((storage.extension(name))) = 'gif'
  )
);

-- Policy: Users can update their own exercise images
CREATE POLICY "Users can update their own exercise images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'ExerciseImages' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'ExerciseImages' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own exercise images
CREATE POLICY "Users can delete their own exercise images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ExerciseImages' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Grant permissions for storage operations
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;
