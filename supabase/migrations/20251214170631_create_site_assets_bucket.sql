-- Create site-assets storage bucket for logos, favicons, etc.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-assets',
  'site-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for site-assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'site-assets');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload to site-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'site-assets');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update site-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'site-assets');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete from site-assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'site-assets');
