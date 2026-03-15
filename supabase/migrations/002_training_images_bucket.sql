-- Create storage bucket for training/reference images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'training-images',
  'training-images',
  true,
  10485760, -- 10MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload training images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'training-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read their own images
CREATE POLICY "Users can read own training images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'training-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow public read access (needed for Replicate API to fetch images)
CREATE POLICY "Public read access for training images"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'training-images');

-- Allow authenticated users to delete their own images
CREATE POLICY "Users can delete own training images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'training-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
