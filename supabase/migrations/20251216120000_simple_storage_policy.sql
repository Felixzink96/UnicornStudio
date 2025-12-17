-- Simpler storage policies for site-assets bucket
-- Allow ALL authenticated users to upload/update/delete

-- First, drop all existing policies
DROP POLICY IF EXISTS "Authenticated users can upload to their sites" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their sites assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their sites assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for site-assets" ON storage.objects;

-- Simple public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'site-assets');

-- Allow any authenticated user to upload
CREATE POLICY "Authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'site-assets');

-- Allow any authenticated user to update
CREATE POLICY "Authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'site-assets');

-- Allow any authenticated user to delete
CREATE POLICY "Authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'site-assets');
