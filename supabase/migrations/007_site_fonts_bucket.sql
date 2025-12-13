-- Create site-fonts storage bucket for GDPR-compliant font hosting
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-fonts',
  'site-fonts', 
  true,
  5242880,  -- 5MB
  ARRAY['font/woff2', 'font/woff', 'font/ttf', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload fonts
CREATE POLICY "Users can upload fonts" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'site-fonts');

-- Allow authenticated users to update their fonts
CREATE POLICY "Users can update fonts" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'site-fonts');

-- Allow authenticated users to delete their fonts
CREATE POLICY "Users can delete fonts" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'site-fonts');

-- Allow public read access to fonts (they need to be served to browsers)
CREATE POLICY "Public can read fonts" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'site-fonts');
